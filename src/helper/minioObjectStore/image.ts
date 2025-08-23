import multer from 'multer';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from "sharp";
import { minioClient,  getMinioUrl, IMAGES_BUCKET } from '../../config/minio';

// Configure multer for in-memory file storage
const storage = multer.memoryStorage();

// Define allowed image types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/svg+xml',
  'image/gif',
];

// File filter to validate uploads
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    );
  }
};

// Configure multer middleware
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB size limit
  },
  fileFilter,
});

// 1) Generate a key 
const generateObjectName = (originalFilename: string): string => {
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  const ext = path.extname(originalFilename);
  const base = path.basename(originalFilename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
  return `${base}-${timestamp}-${uuid}${ext}`;
};

// Determine cache control based on image type
const getImageCacheControl = (): string => {
  
  // Cache immutable images for 1 year
  return 'public, max-age=31536000, immutable';
};

// Determine content disposition to prevent inline rendering of sensitive images
const getContentDisposition = (filename: string): string => {
  // For most product images, allow inline rendering
  return `inline; filename="${encodeURIComponent(filename)}"`;
};





// export async function uploadImages(files: Express.Multer.File[]): Promise<string[]> {
//   const results: string[] = [];
//   for (const file of files) {
//     try {
//       const url = await uploadImage(file);
//       results.push(url);
//     } catch (err) {
//       console.error(`Failed to upload ${file.originalname}:`, err);
//       // continue uploading the rest
//     }
//   }
//   return results;
// }



export async function uploadImages(
  files: Express.Multer.File[],
  options?: { avatar?: boolean }
): Promise<string[]> {
  const results: string[] = [];
  for (const file of files) {
    try {
      const url = await uploadImage(file, options); // ✅ forward options
      results.push(url);
    } catch (err) {
      console.error(`Failed to upload ${file.originalname}:`, err);
      // continue uploading the rest
    }
  }
  return results;
}

// Upload an image to MinIO with compression if needed
// export const uploadImage = async (file: Express.Multer.File): Promise<string> => {
//   const objectName = generateObjectName(file.originalname);

//   // If file is > 1MB, compress it using sharp
//   let bufferToUpload = file.buffer;
//   let uploadSize = file.size;

//   if (file.size > 1 * 1024 * 1024) {
//     if (file.mimetype.startsWith("image/")) {
//       try {
//         // Compress using sharp (WebP is very efficient, but you can keep original format if needed)
//         const compressed = await sharp(file.buffer)
//           .resize({ width: 1920, withoutEnlargement: true }) // resize large images
//           .toFormat("webp", { quality: 80 }) // convert to webp with reasonable quality
//           .toBuffer();

//         bufferToUpload = compressed;
//         uploadSize = compressed.length;
//       } catch (err) {
//         console.error(`Sharp compression failed, fallback to original:`, err);
//       }
//     } else {
//       // For non-images, could add gzip/zip compression, or leave as is
//       console.log(`Non-image file >1MB, uploading as-is: ${file.originalname}`);
//     }
//   }

//   // Metadata
//   const metaData = {
//     "Content-Type": file.mimetype.startsWith("image/") ? "image/webp" : file.mimetype,
//     "Cache-Control": getImageCacheControl(),
//     "Content-Disposition": getContentDisposition(file.originalname),
//     "X-Amz-Meta-Original-Name": file.originalname,
//     "X-Amz-Meta-Upload-Date": new Date().toISOString(),
//   };

//   // Upload to MinIO
//   await minioClient.putObject(
//     IMAGES_BUCKET,
//     objectName,
//     bufferToUpload,
//     uploadSize,
//     metaData
//   );

//   return getMinioUrl(IMAGES_BUCKET, objectName);
// };


export const uploadImage = async (
  file: Express.Multer.File,
  options?: { avatar?: boolean }
): Promise<string> => {
  const objectName = generateObjectName(file.originalname);

  let bufferToUpload = file.buffer;
  let uploadSize = file.size;

  if (file.mimetype.startsWith("image/")) {
    try {
      if (options?.avatar) {
        // 👉 Square avatar only if flagged
        const squared = await squareAvatar(file.buffer, 512);
        bufferToUpload = squared;
        uploadSize = squared.length;
      } else if (file.size > 1 * 1024 * 1024) {
        // 👉 Regular compression logic for other images
        const compressed = await sharp(file.buffer)
          .resize({ width: 1920, withoutEnlargement: true })
          .toFormat("webp", { quality: 80 })
          .toBuffer();

        bufferToUpload = compressed;
        uploadSize = compressed.length;
      }
    } catch (err) {
      console.error(`Sharp processing failed, fallback to original:`, err);
    }
  }

  const metaData = {
    "Content-Type": "image/webp",
    "Cache-Control": getImageCacheControl(),
    "Content-Disposition": getContentDisposition(file.originalname),
    "X-Amz-Meta-Original-Name": file.originalname,
    "X-Amz-Meta-Upload-Date": new Date().toISOString(),
  };

  await minioClient.putObject(
    IMAGES_BUCKET,
    objectName,
    bufferToUpload,
    uploadSize,
    metaData
  );

  return getMinioUrl(IMAGES_BUCKET, objectName);
};

// 2) Extract whatever key you uploaded, in order to delete/stat
export const extractObjectName = (url: string): string => {
  try {
    const p = new URL(url).pathname;            // "/bucket/your-key.jpg"
    return p.replace(new RegExp(`^/${IMAGES_BUCKET}/`), "");
  } catch {
    return url.replace(/^\/+/, "");
  }
};



export async function deleteImages(urls: string[]): Promise<void> {
  for (const url of urls) {
    const key = extractObjectName(url);
    try {
      await minioClient.removeObject(IMAGES_BUCKET, key);
      console.log(`Deleted image: ${key}`);
    } catch (err: any) {
      if (err.code === 'NoSuchKey') {
        // Already gone, ignore
        console.warn(`Image not found, already deleted?: ${key}`);
      } else {
        console.error(`Error deleting image ${key}:`, err);
        // bubble up only on unexpected errors
        throw err;
      }
    }
  }
}


// Get image information from MinIO
export const getImageInfo = async (url: string) => {
  try {
    const objectName = extractObjectName(url);
    const stat = await minioClient.statObject(IMAGES_BUCKET, objectName);
    return {
      size: stat.size,
      lastModified: stat.lastModified,
      etag: stat.etag,
      contentType: stat.metaData['content-type'],
      originalName: stat.metaData['x-amz-meta-original-name'],
      uploadDate: stat.metaData['x-amz-meta-upload-date'],
    };
  } catch (error) {
    console.error(`Failed to get image info for ${url}:`, error);
    throw error;
  }
};



async function squareAvatar(
  buffer: Buffer,
  size: number = 512
): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, {
      fit: "contain", // keep aspect ratio, pad as needed
      background: { r: 255, g: 255, b: 255, alpha: 0 }, // transparent padding
    })
    .toFormat("webp", { quality: 85 })
    .toBuffer();
}