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

// 🔍 Try to find the appropriate file within a template folder
async function resolveFilePath(templateDir: string, fileType: string) {
  const fileMap: Record<string, string[]> = {
    html: ["index.html", "home.html", "main.html"],
    css: ["style.css", "main.css", "home.css"],
    js: ["script.js", "main.js", "index.js"],
  };

  const candidates = fileMap[fileType] || [fileType];
  for (const file of candidates) {
    const full = path.join(templateDir, file);
    try {
      await fs.access(full);
      return { filePath: full, contentType: getContentType(fileType) };
    } catch {
      // try next candidate
    }
  }
  return null;
}

// 🧩 Map file type → correct Content-Type
function getContentType(fileType: string) {
  const map: Record<string, string> = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
  };
  return map[fileType] || "text/plain";
}

// 🚀 Controller
export const getTemplateFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // ✅ Default fileType to 'html' if missing or invalid
  const { id, fileType = "html" } = req.params;
  const normalizedFileType = fileType.toLowerCase();

  try {
    const templateDir = path.join(templatesDir, id);
    await fs.access(templateDir); // ensure template folder exists

    // 🧠 Check Redis cache first
    const cached = await getTemplateCache(id);
    if (cached && cached.contentType === getContentType(normalizedFileType)) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.status(200).send(cached.content);
      return;
    }

    // 💾 Not cached → load from disk
    const fileInfo = await resolveFilePath(templateDir, normalizedFileType);
    if (!fileInfo) {
      res.status(404).send("Template not found");
      return;
    }

    const stat = await fs.stat(fileInfo.filePath);
    const content = await fs.readFile(fileInfo.filePath, "utf-8");

    // 🚫 Skip caching incomplete files
    if (content.length > 50) {
      await setTemplateCache(id, content, fileInfo.contentType);
    }

    res.setHeader("Content-Type", fileInfo.contentType);
    res.setHeader("ETag", `"${stat.mtimeMs}"`);
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    res.status(200).send(content);
  } catch (err) {
    console.error("Template serve error:", err);
    res.status(500).send("Internal error");
  }
};
