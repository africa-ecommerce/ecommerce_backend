// // src/routes/staticRoutes.ts

// import express, { Request } from "express";
// import multer from "multer";
// import path from "path";
// import fs from "fs";
// import os from "os";
// import {
//   uploadStaticFile,
//   uploadStaticContent,
//   uploadDirectory,
//   listStaticFiles,
//   deleteStaticFile,
//   getStaticFileContent,
//   MIME_TYPES,
// } from "../helper/minioObjectStore/staticSite";

// const router = express.Router();

// // // Configure multer for temporary file storage
// // const storage = multer.diskStorage({
// //   destination: (req, file, cb) => {
// //     const tempDir = path.join(os.tmpdir(), "static-uploads");
// //     if (!fs.existsSync(tempDir)) {
// //       fs.mkdirSync(tempDir, { recursive: true });
// //     }
// //     cb(null, tempDir);
// //   },
// //   filename: (req, file, cb) => {
// //     cb(null, file.originalname);
// //   },
// // });

// // const upload = multer({ storage });



// // Configure multer for in-memory file storage
// const storage = multer.memoryStorage();

// // Define allowed image types
// const ALLOWED_MIME_TYPES = [
//    "text/html",
//    "text/css",
//  "application/javascript",
//   "application/json",
//    "image/svg+xml",
//    "image/png",
//    "image/jpeg",
//   "image/jpeg",
//    "image/gif",
//   "image/webp",
//    "image/x-icon",
//   "font/woff",
//   "font/woff2",
//    "font/ttf",
//    "application/vnd.ms-fontobject",
//    "font/otf",
//    "text/plain",
//    "application/xml",
//    "application/pdf",
// ];

// // File filter to validate uploads
// const fileFilter = (
//   req: Request,
//   file: Express.Multer.File,
//   cb: multer.FileFilterCallback
// ) => {
//   if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(
//       new Error(
//         `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
//       )
//     );
//   }
// };

// // Configure multer middleware
// export const uploadMiddleware = multer({
//   storage,
//   fileFilter,
// });

// // Upload a single static file
// router.post("/upload-file", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     const targetPath = req.body.path || req.file.originalname;

//     // Upload file to MinIO
//     const fileUrl = await uploadStaticFile(req.file.path, targetPath);

//     // Clean up temp file
//     fs.unlinkSync(req.file.path);

//     return res.status(200).json({
//       success: true,
//       fileUrl,
//     });
//   } catch (error) {
//     console.error("Error uploading static file:", error);
//     return res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

// // Upload content as a file
// router.post(
//   "/upload-content",
//   express.json({ limit: "10mb" }),
//   async (req, res) => {
//     try {
//       const { content, path: targetPath, contentType } = req.body;

//       if (!content || !targetPath) {
//         return res.status(400).json({ error: "Content and path are required" });
//       }

//       // Upload content to MinIO
//       const fileUrl = await uploadStaticContent(
//         content,
//         targetPath,
//         contentType
//       );

//       return res.status(200).json({
//         success: true,
//         fileUrl,
//       });
//     } catch (error) {
//       console.error("Error uploading static content:", error);
//       return res.status(500).json({
//         success: false,
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//     }
//   }
// );

// // List static files
// router.get("/list", async (req, res) => {
//   try {
//     const prefix = (req.query.prefix as string) || "";

//     // List files from MinIO
//     const files = await listStaticFiles(prefix);

//     return res.status(200).json({
//       success: true,
//       files,
//     });
//   } catch (error) {
//     console.error("Error listing static files:", error);
//     return res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

// // Delete a static file
// router.delete("/:path(*)", async (req, res) => {
//   try {
//     const filePath = req.params.path;

//     if (!filePath) {
//       return res.status(400).json({ error: "File path is required" });
//     }

//     // Delete file from MinIO
//     await deleteStaticFile(filePath);

//     return res.status(200).json({
//       success: true,
//       message: "File deleted successfully",
//     });
//   } catch (error) {
//     console.error("Error deleting static file:", error);
//     return res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

// // Get static file content
// router.get("/content/:path(*)", async (req, res) => {
//   try {
//     const filePath = req.params.path;

//     if (!filePath) {
//       return res.status(400).json({ error: "File path is required" });
//     }

//     // Get file content from MinIO
//     const { content, contentType } = await getStaticFileContent(filePath);

//     return res.status(200).json({
//       success: true,
//       content,
//       contentType,
//     });
//   } catch (error) {
//     console.error("Error getting static file content:", error);
//     return res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

// export default router;
