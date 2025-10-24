// src/controllers/template/getTemplateFile.ts
import { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import path from "path";
import {
  getTemplateCache,
  setTemplateCache,
} from "../helper/cache/templatesCache";

// 🧱 Absolute path to your templates directory
const templatesDir = path.join(process.cwd(), "public/templates");

// 🔍 Resolve the correct file path and content type
async function resolveFilePath(
  templateDir: string,
  fileType: string
): Promise<{ filePath: string; contentType: string } | null> {
  const candidates = [
    { file: `${fileType}.html`, contentType: "text/html" },
    { file: `css/${fileType}.css`, contentType: "text/css" },
    { file: `js/${fileType}.js`, contentType: "application/javascript" },
  ];

  // Handle shorthand names like index, home, main
  if (["index", "home", "main"].includes(fileType)) {
    candidates.unshift({ file: "index.html", contentType: "text/html" });
  }

  for (const { file, contentType } of candidates) {
    const fullPath = path.join(templateDir, file);
    try {
      await fs.access(fullPath);
      return { filePath: fullPath, contentType };
    } catch {
      // try next candidate
    }
  }

  return null;
}

// 🚀 Main Controller
export const getTemplateFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, fileType = "html" } = req.params;
  const normalizedFileType = fileType.toLowerCase();

  try {
    const templateDir = path.join(templatesDir, id);
    await fs.access(templateDir);

    // Create unique cache key per template + fileType
    const cacheKey = `${id}:${normalizedFileType}`;
    const cached = await getTemplateCache(cacheKey);

    if (cached) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
       res.status(200).send(cached.content);
       return;
    }

    const fileInfo = await resolveFilePath(templateDir, normalizedFileType);
    if (!fileInfo) {
       res.status(404).send("Template not found");
       return;
    }

    const content = await fs.readFile(fileInfo.filePath, "utf-8");

    // Cache in Redis
    if (content.length > 50) {
      await setTemplateCache(cacheKey, content, fileInfo.contentType);
    }

    res.setHeader("Content-Type", fileInfo.contentType);
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    res.status(200).send(content);
  } catch (err) {
    console.error("Template serve error:", err);
    res.status(500).send("Internal server error");
  }
};
