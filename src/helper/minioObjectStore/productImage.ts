import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { BUCKET_NAME, minioClient} from "../../config/minio";




// //Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = path.join(__dirname, "../uploads");
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
//     cb(null, uniqueFilename);
//   },
// });

// Configure multer for file uploads (in-memory storage)
const storage = multer.memoryStorage();

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "image/svg+xml",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed types: JPEG, PNG, JPG, WebP, SVG, and GIF."
      )
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});



// Upload images to MinIO and return URLs
export const uploadToMinio = async (
  files: Express.Multer.File[]
): Promise<string[]> => {
  const imageUrls: string[] = [];

  for (const file of files) {
    const objectName = `plug-products/${Date.now()}-${uuidv4()}${path.extname(
      file.originalname
    )}`;

    await minioClient.putObject(
      BUCKET_NAME,
      objectName,
      file.buffer,
      file.size,
      {
        "Content-Type": file.mimetype,
        "X-Amz-Meta-Secure": "true",
        "Cache-Control": "max-age=31536000",
        "Content-Security-Policy": "default-src self",
      }
    );

    // Generate URL to the uploaded file
    const imageUrl = `${
      process.env.MINIO_BASE_URL ||
      `http://${process.env.MINIO_ENDPOINT || "localhost"}:${
        process.env.MINIO_PORT || "9000"
      }`
    }/${BUCKET_NAME}/${objectName}`;
    imageUrls.push(imageUrl);
  }

  return imageUrls;
};

// Function to delete images from MinIO
export async function deleteFromMinio(images: string[]) {
  if (images.length > 0) {
    try {
      // Extract object name from the full URL
      const extractObjectNameFromUrl = (url: string): string => {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/");
        pathParts.shift(); // Remove empty segment
        pathParts.shift(); // Remove bucket name
        return pathParts.join("/"); // Join remaining parts
      };

      // Delete each image from MinIO
      for (const imageUrl of images) {
        try {
          const objectName = extractObjectNameFromUrl(imageUrl);
          await minioClient.removeObject(BUCKET_NAME, objectName);
          console.log(`Deleted image from MinIO: ${objectName}`);
        } catch (singleImageError) {
          console.error(
            `Failed to delete image ${imageUrl}:`,
            singleImageError
          );
        }
      }
    } catch (imageError) {
      console.error("Error initializing MinIO client for cleanup:", imageError);
    }
  }
}