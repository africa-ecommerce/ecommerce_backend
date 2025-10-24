import { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import path from "path";
import {
  getTemplateCache,
  setTemplateCache,
} from "../helper/cache/templatesCache";

// 🧱 Use the actual root-based path (relative to your project)
const templatesDir = path.join(process.cwd(), "public/templates");

/**
 * Detect content type based on file extension.
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "application/javascript";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json";
    default:
      return "text/plain";
  }
}

/**
 * Main controller to serve template files dynamically.
 * Supports HTML, CSS, JS, and images within template folders.
 */
export const getTemplateFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const relativePath = req.params[0] || "index.html"; // handle root as index.html

  try {
    const templateDir = path.join(templatesDir, id);
    const filePath = path.join(templateDir, relativePath);

    // 🧩 Security: Prevent directory traversal
    if (!filePath.startsWith(templateDir)) {
      res.status(400).send("Invalid path");
      return;
    }

    // ✅ Check cache
    const cacheKey = `${id}:${relativePath}`;
    const cached = await getTemplateCache(cacheKey);
    if (cached) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.status(200).send(cached.content);
      return;
    }

    // ✅ Check if file exists
    await fs.access(filePath);

    const content = await fs.readFile(filePath, "utf-8");
    const contentType = getContentType(filePath);

    // ✅ Cache the content
    if (content.length > 50) {
      await setTemplateCache(cacheKey, content, contentType);
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    res.status(200).send(content);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.error("Template serve error: File not found ->", err.path);
      res.status(404).send("Template file not found");
    } else {
      console.error("Template serve error:", err);
      res.status(500).send("Internal server error");
    }
  }
};
