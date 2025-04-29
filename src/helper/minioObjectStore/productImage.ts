// // import multer from "multer";
// // import path from "path";
// // import { v4 as uuidv4 } from "uuid";
// // import { BUCKET_NAME, minioClient} from "../../config/minio";




// // //Configure multer for file uploads
// // const storage = multer.diskStorage({
// //   destination: (req, file, cb) => {
// //     const uploadDir = path.join(__dirname, "../uploads");
// //     if (!fs.existsSync(uploadDir)) {
// //       fs.mkdirSync(uploadDir, { recursive: true });
// //     }
// //     cb(null, uploadDir);
// //   },
// //   filename: (req, file, cb) => {
// //     const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
// //     cb(null, uniqueFilename);
// //   },
// // });

// // Configure multer for file uploads (in-memory storage)
// // const storage = multer.memoryStorage();

// // const fileFilter = (
// //   req: any,
// //   file: Express.Multer.File,
// //   cb: multer.FileFilterCallback
// // ) => {
// //   const allowedMimeTypes = [
// //     "image/jpeg",
// //     "image/png",
// //     "image/webp",
// //     "image/jpg",
// //     "image/svg+xml",
// //     "image/gif",
// //   ];

// //   if (allowedMimeTypes.includes(file.mimetype)) {
// //     cb(null, true);
// //   } else {
// //     cb(
// //       new Error(
// //         "Invalid file type. Allowed types: JPEG, PNG, JPG, WebP, SVG, and GIF."
// //       )
// //     );
// //   }
// // };

// export const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
//   fileFilter,
// });



// // Upload images to MinIO and return URLs
// export const uploadToMinio = async (
//   files: Express.Multer.File[]
// ): Promise<string[]> => {
//   const imageUrls: string[] = [];

//   for (const file of files) {
//     const objectName = `plug-products/${Date.now()}-${uuidv4()}${path.extname(
//       file.originalname
//     )}`;

//     await minioClient.putObject(
//       BUCKET_NAME,
//       objectName,
//       file.buffer,
//       file.size,
//       {
//         "Content-Type": file.mimetype,
//         "X-Amz-Meta-Secure": "true",
//         "Cache-Control": "max-age=31536000",
//         "Content-Security-Policy": "default-src self",
//       }
//     );

//     // Generate URL to the uploaded file
//     const imageUrl = `${
//       process.env.MINIO_BASE_URL ||
//       `http://${process.env.MINIO_ENDPOINT || "localhost"}:${
//         process.env.MINIO_PORT || "9000"
//       }`
//     }/${BUCKET_NAME}/${objectName}`;
//     imageUrls.push(imageUrl);
//   }

//   return imageUrls;
// };

// // Function to delete images from MinIO
// export async function deleteFromMinio(images: string[]) {
//   if (images.length > 0) {
//     try {
//       // Extract object name from the full URL
//       const extractObjectNameFromUrl = (url: string): string => {
//         const urlObj = new URL(url);
//         const pathParts = urlObj.pathname.split("/");
//         pathParts.shift(); // Remove empty segment
//         pathParts.shift(); // Remove bucket name
//         return pathParts.join("/"); // Join remaining parts
//       };

//       // Delete each image from MinIO
//       for (const imageUrl of images) {
//         try {
//           const objectName = extractObjectNameFromUrl(imageUrl);
//           await minioClient.removeObject(BUCKET_NAME, objectName);
//           console.log(`Deleted image from MinIO: ${objectName}`);
//         } catch (singleImageError) {
//           console.error(
//             `Failed to delete image ${imageUrl}:`,
//             singleImageError
//           );
//         }
//       }
//     } catch (imageError) {
//       console.error("Error initializing MinIO client for cleanup:", imageError);
//     }
//   }
// }







import multer from 'multer';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
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
    fileSize: 3 * 1024 * 1024, // 3MB size limit
  },
  fileFilter,
});

// Generate optimized object name for images
const generateObjectName = (originalFilename: string): string => {
  const timestamp = Date.now();
  const uuid = uuidv4();
  const extension = path.extname(originalFilename);
  const sanitizedName = path.basename(originalFilename, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  
  return `images/${sanitizedName}-${timestamp}-${uuid.substring(0, 8)}${extension}`;
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


// Upload multiple images to MinIO
export const uploadImages = async (
  files: Express.Multer.File[]
): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadImage(file));
  return Promise.all(uploadPromises);
};

// Upload a single image to MinIO
export const uploadImage = async (
  file: Express.Multer.File
): Promise<string> => {
  // Generate optimized object name
  const objectName = generateObjectName(file.originalname);

  // Set metadata
  const metaData = {
    "Content-Type": file.mimetype,
    "Cache-Control": getImageCacheControl(),
    "Content-Disposition": getContentDisposition(file.originalname),
    "X-Amz-Meta-Original-Name": file.originalname,
    "X-Amz-Meta-Upload-Date": new Date().toISOString(),
  };

  // Upload to MinIO  ---> does this create the url directory or can i create it manually to make it more deterministic
  await minioClient.putObject(
    IMAGES_BUCKET,
    objectName,
    file.buffer,
    file.size,
    metaData
  );

  // Return public URL to the image

  //baseUrl/product-images/${objectName}--> object name which is random, may need to make it more deterministic according to user details for logo or so
  return getMinioUrl(IMAGES_BUCKET, objectName);
};


// Parse and extract object name from a full URL
export const extractObjectName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Remove empty first segment and bucket name
    pathParts.shift();
    pathParts.shift();
    return pathParts.join('/');
  } catch (error) {
    // If not a valid URL, assume it's already an object name
    return url.replace(/^\/+/, '');
  }
};

// Delete images from MinIO
export const deleteImages = async (urls: string[]): Promise<void> => {
  if (!urls.length) return;
  
  for (const url of urls) {
    try {
      const objectName = extractObjectName(url);
      await minioClient.removeObject(IMAGES_BUCKET, objectName);
      console.log(`Deleted image from MinIO: ${objectName}`);
    } catch (error) {
      console.error(`Failed to delete image ${url}:`, error);
      throw error;
    }
  }
};

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