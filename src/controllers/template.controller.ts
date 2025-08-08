import { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import {
  generateTemplateCacheKey,
  templateCache,
} from "../helper/cache/templatesCache";

// Templates directory path
const templatesDir = path.join(__dirname, "../../public/templates");

export const getTemplateFile = async (req: Request, res: Response, next: NextFunction) => {
  const { id, fileType } = req.params;
  const normalizedFileType = fileType.toLowerCase();
  const cacheKey = generateTemplateCacheKey(id, fileType);

  // Check cache
  const cachedResult = templateCache.get(cacheKey);
  if (cachedResult) {
    console.log(`Cache HIT: ${id}/${fileType}`);
    const { content, contentType } = cachedResult as { content: string; contentType: string };
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.setHeader("ETag", `"${id}-${fileType}-v1"`);
    res.status(200).send(content);
    return;
  }

  try {
    const templateDir = path.join(templatesDir, id);
    await fs.access(templateDir).catch(() => {
      res.status(404).json({ success: false, error: `Template '${id}' not found!` });
      return;
    });

    const fileInfo = await resolveFilePath(templateDir, normalizedFileType);
    if (!fileInfo) {
      console.error(`File not found: ${id}/${normalizedFileType}`);
       // Serve 404.html without changing the URL
            res
              .status(404)
              .sendFile(
                path.join(__dirname, "../../public/templates/primary/404.html")
              );
            return;
    }

    const fileContent = await fs.readFile(fileInfo.filePath, "utf-8");
    templateCache.set(cacheKey, { content: fileContent, contentType: fileInfo.contentType });
    console.log(`Cached: ${cacheKey}`);

    res.setHeader("Content-Type", fileInfo.contentType);
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.setHeader("ETag", `"${id}-${fileType}-v1"`);
    res.status(200).send(fileContent);

  } catch (err) {
    console.error("Template serve error:", err);
    // Serve error.html without changing URL
        res
          .status(500)
          .sendFile(
            path.join(__dirname, "../../public/templates/primary/error.html")
          );
  }
};

async function resolveFilePath(
  templateDir: string,
  fileType: string
): Promise<{ filePath: string; contentType: string } | null> {
  const candidates = [
    { file: `${fileType}.html`, contentType: "text/html" },
    { file: `css/${fileType}.css`, contentType: "text/css" },
    { file: `js/${fileType}.js`, contentType: "application/javascript" },
  ];

  // Special case: treat index, home, main as index.html
  if (["index", "home", "main"].includes(fileType)) {
    candidates.unshift({ file: "index.html", contentType: "text/html" });
  }

  for (const { file, contentType } of candidates) {
    const fullPath = path.join(templateDir, file);
    try {
      await fs.access(fullPath);
      return { filePath: fullPath, contentType };
    } catch {
      // continue to next candidate
    }
  }

  return null;
}










