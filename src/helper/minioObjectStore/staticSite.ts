
import { minioClient, getMinioUrl, STATIC_SITE_BUCKET, IMAGES_BUCKET } from "../../config/minio";
import multer from 'multer';
import { Request } from "express";



// Configure multer for in-memory file storage
const storage = multer.memoryStorage();

// Define allowed image types
const ALLOWED_MIME_TYPES = [
   "text/html",
   "text/css",
 "application/javascript",
  "application/json",
   "image/svg+xml",
   "image/png",
   "image/jpeg",
  "image/jpg",
   "image/gif",
  "image/webp",
   "image/x-icon",
  "font/woff",
  "font/woff2",
     "font/eot",
   "font/ttf",
   "application/vnd.ms-fontobject",
   "font/otf",
   "text/plain",
   "application/xml",
   "application/pdf",
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
  fileFilter,
});



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


// Determine appropriate cache control based on file type
const getCacheControl = (mimeType: string): string => {

    // Handle specific MIME types


  // Static assets like images and fonts are cached longer
  if (
    [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/x-icon",
      "image/webp",
       "image/svg+xml",
       "font/woff",
       "font/woff2",
       "font/ttf",
       "font/eot",
       "font/otf",
        "application/vnd.ms-fontobject",
        "application/pdf",
        "text/plain",
    ].includes(mimeType)
  ) {
    return "public, max-age=31536000, immutable"; // 1 year
  }

  // CSS and JS are cached but allow for revalidation
  if (["text/css", "application/javascript"].includes(mimeType)) {
    return "public, max-age=604800, stale-while-revalidate=86400"; // 1 week, revalidate after 1 day
  }

  // HTML and JSON should be checked more frequently
  if (["text/html", "application/json"].includes(mimeType)) {
    return "public, max-age=300, must-revalidate"; // 5 minutes
  }

  // Default cache policy
  return "public, max-age=3600"; // 1 hour
};



// Upload a single image to MinIO
export const uploadSiteImage = async (
  file: Express.Multer.File,
  objectName: string,
): Promise<string> => {
 

  // Set metadata
  const metaData = {
    "Content-Type": file.mimetype,
    "Cache-Control": getCacheControl(file.mimetype),
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

  return getMinioUrl(IMAGES_BUCKET, objectName);
};



// Upload string content as a file (useful for dynamically generated HTML/CSS/JS)
export const uploadSiteContent = async (
  file: Express.Multer.File,
  objectName: string,
): Promise<string> => {
  

  // Set metadata
  const metaData = {
    "Content-Type": file.mimetype,
    "Cache-Control": getCacheControl(file.mimetype),
    "X-Amz-Meta-Original-Name": file.originalname,
    "X-Amz-Meta-Upload-Date": new Date().toISOString(),
  };

  // Upload to MinIO
  await minioClient.putObject(
    STATIC_SITE_BUCKET,
    objectName,
    file.buffer,
    file.size,
    metaData
  );

  // Return public URL to the file
  return getMinioUrl(STATIC_SITE_BUCKET, objectName);
};


// Delete a static file
export const deleteStaticFile = async (url: string): Promise<void> => {
   const objectName = extractObjectName(url);

  try {
    await minioClient.removeObject(STATIC_SITE_BUCKET, objectName);
    console.log(`Deleted static file: ${objectName}`);
  } catch (error) {
    console.error(`Failed to delete static file ${objectName}:`, error);
    throw error;
  }
};

// Get a static file's content
export const getStaticFileInfo = async (
  url: string,
    bucket: string
) => {
  const objectName = extractObjectName(url);

  try {
    
        const stat = await minioClient.statObject(bucket, objectName);
    // Get the object
      return {
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        contentType: stat.metaData["content-type"],
        originalName: stat.metaData["x-amz-meta-original-name"],
        uploadDate: stat.metaData["x-amz-meta-upload-date"],
      };
  } catch (error) {
    console.error(`Failed to get static file info ${objectName}:`, error);
    throw error;
  }
};
