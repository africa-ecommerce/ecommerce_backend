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












/**
 * Get a specific file from a template (with caching)
 */
// export const getTemplateFile = async (req: Request, res: Response) => {
//   const { id, fileType } = req.params;
//   const normalizedFileType = fileType.toLowerCase();
//   const cacheKey = generateTemplateCacheKey(id, fileType);

//   // Try to get from cache first
//   const cachedResult = templateCache.get(cacheKey);
//   if (cachedResult) {
//     console.log(`Cache HIT for template file: ${id}/${fileType}`);
//     const { content, contentType } = cachedResult as {
//       content: string;
//       contentType: string;
//     };

//     // Set very aggressive client-side caching headers
//     res.setHeader("Content-Type", contentType);
//     res.setHeader("Cache-Control", "public, max-age=604800, immutable"); // 7 days + immutable
//     res.setHeader("ETag", `"${id}-${fileType}-v1"`); // Add version for cache busting

//      res.status(200).send(content);
//      return;
//   }

//   try {
//     console.log(`Cache MISS for template file: ${id}/${fileType} - generating...`);

//     const templateDir = path.join(templatesDir, id);

//     // Check if template directory exists
//     try {
//       await fs.access(templateDir);
//     } catch (error) {
//       res.status(404).json({
//         success: false,
//         error: `'${id}' Template not found!`,
//       });
//       return;
//     }

//     // Determine file path and content type based on request
//     const fileInfo = await resolveFilePath(templateDir, normalizedFileType);

//     if (!fileInfo) {
//       console.error(`File not found for template ${id}: ${normalizedFileType}`);
//       res
//         .status(302)
//         .redirect(
//           "/404"
//         );
//       return;
//     }

//     // Try to read the file
//     try {
//       let fileContent = await fs.readFile(fileInfo.filePath, "utf-8");

      

//       // Cache the processed result with long TTL
//       templateCache.set(cacheKey, {
//         content: fileContent,
//         contentType: fileInfo.contentType,
//       });
//       console.log(`Template file cached with key: ${cacheKey}`);

//       // Set very aggressive client-side caching headers
//       res.setHeader("Content-Type", fileInfo.contentType);
//       res.setHeader("Cache-Control", "public, max-age=604800, immutable"); // 7 days + immutable
//       res.setHeader("ETag", `"${id}-${fileType}-v1"`); // Add version for cache busting

//       res.status(200).send(fileContent);
//     } catch (error) {
  
//       res
//         .status(302)
//         .redirect(
//           "/error"
//         );
//       return;
//     }
//   } catch (error) {
//     console.error(`Error fetching template file:`, error);
//     res
//       .status(302)
//       .redirect(
//         "/error"
//       );
//     return;
//   }
// };



// /**
//  * Get all files in a directory recursively
//  */
// async function getAllFiles(dir: string): Promise<string[]> {
//   try {
//     const entries = await fs.readdir(dir, { withFileTypes: true });

//     const files = await Promise.all(
//       entries.map(async (entry) => {
//         const fullPath = path.join(dir, entry.name);
//         return entry.isDirectory() ? await getAllFiles(fullPath) : fullPath;
//       })
//     );

//     return files.flat();
//   } catch (error) {
//     console.error(`Error reading directory ${dir}:`, error);
//     return [];
//   }
// }

// /**
//  * Find a file by name in the list of files, case-insensitive
//  */
// function findFileByName(
//   allFiles: string[],
//   fileName: string,
//   contentTypeMap: Record<string, string>
// ): { filePath: string; contentType: string } | null {
//   const normalizedFileName = fileName.toLowerCase();
//   const file = allFiles.find(
//     (file) => path.basename(file).toLowerCase() === normalizedFileName
//   );

//   if (file) {
//     const ext = path.extname(file).toLowerCase();
//     return {
//       filePath: file,
//       contentType: contentTypeMap[ext] || "text/plain",
//     };
//   }
//   return null;
// }


// async function resolveFilePath(
//   templateDir: string,
//   fileType: string
// ): Promise<{ filePath: string; contentType: string } | null> {
//   // Map of content types by file extension
//   const contentTypeMap: Record<string, string> = {
//     ".html": "text/html",
//     ".css": "text/css",
//     ".js": "application/javascript",
//     ".json": "application/json",
//     ".svg": "image/svg+xml",
//     ".png": "image/png",
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".gif": "image/gif",
//     ".webp": "image/webp",
//     ".ico": "image/x-icon",
//     ".ttf": "font/ttf",
//     ".woff": "font/woff",
//     ".woff2": "font/woff2",
//   };

//   // Get all files in the template directory recursively
//   const allFiles = await getAllFiles(templateDir);
//   if (allFiles.length === 0) {
//     console.error(`No files found in template directory: ${templateDir}`);
//     return null;
//   }

//   const normalizedFileType = fileType.toLowerCase();

//   // Handle common page aliases
//   if (["index", "home", "main"].includes(normalizedFileType)) {
//     return findFileByName(allFiles, "index.html", contentTypeMap);
//   }

//   // Handle HTML page requests (about, blog, product, etc.)
//   if (
//     ["about", "blog", "product", "marketplace", "product-details"].includes(
//       normalizedFileType
//     )
//   ) {
//     // Find direct HTML file
//     const htmlFile = allFiles.find(
//       (file) =>
//         path.basename(file).toLowerCase() === `${normalizedFileType}.html`
//     );

//     if (htmlFile) {
//       return {
//         filePath: htmlFile,
//         contentType: "text/html",
//       };
//     }
//   }

//   // Handle component requests
//   if (
//     normalizedFileType.startsWith("component/") ||
//     normalizedFileType.startsWith("components/")
//   ) {
//     const parts = normalizedFileType.split("/");
//     const componentName = parts[parts.length - 1].toLowerCase();

//     // Look for the component file anywhere in the structure
//     const componentFile = allFiles.find((file) => {
//       const normalizedPath = file.toLowerCase();
//       const basename = path.basename(normalizedPath, ".html");
//       return basename === componentName && normalizedPath.endsWith(".html");
//     });

//     if (componentFile) {
//       return {
//         filePath: componentFile,
//         contentType: "text/html",
//       };
//     }
//   }

//   // Handle CSS requests
//   if (normalizedFileType === "css") {
//     // First try CSS files in the css directory
//     const cssFiles = allFiles.filter((file) => {
//       const normalizedPath = file.toLowerCase();
//       return (
//         normalizedPath.includes("/css/") && normalizedPath.endsWith(".css")
//       );
//     });

//     // Common CSS files in order of priority
//     const cssOptions = ["global.css", "styles.css", "style.css", "main.css"];

//     // Try to find prioritized CSS files
//     for (const option of cssOptions) {
//       const cssFile = cssFiles.find(
//         (file) => path.basename(file).toLowerCase() === option
//       );

//       if (cssFile) {
//         return {
//           filePath: cssFile,
//           contentType: "text/css",
//         };
//       }
//     }

//     // If no prioritized CSS files found, return the first CSS file
//     if (cssFiles.length > 0) {
//       return {
//         filePath: cssFiles[0],
//         contentType: "text/css",
//       };
//     }

//     // If no CSS files in css directory found, try to find any CSS file
//     const anyCssFile = allFiles.find((file) =>
//       file.toLowerCase().endsWith(".css")
//     );
//     if (anyCssFile) {
//       return {
//         filePath: anyCssFile,
//         contentType: "text/css",
//       };
//     }

//     return null;
//   }

//   // Handle JS requests
//   if (normalizedFileType === "js") {
//     // First try JS files in the js directory
//     const jsFiles = allFiles.filter((file) => {
//       const normalizedPath = file.toLowerCase();
//       return normalizedPath.includes("/js/") && normalizedPath.endsWith(".js");
//     });

//     // Common JS files in order of priority
//     const jsOptions = ["common.js", "script.js", "main.js", "config.js"];

//     // Try to find prioritized JS files
//     for (const option of jsOptions) {
//       const jsFile = jsFiles.find(
//         (file) => path.basename(file).toLowerCase() === option
//       );

//       if (jsFile) {
//         return {
//           filePath: jsFile,
//           contentType: "application/javascript",
//         };
//       }
//     }

//     // If no prioritized JS files found, return the first JS file
//     if (jsFiles.length > 0) {
//       return {
//         filePath: jsFiles[0],
//         contentType: "application/javascript",
//       };
//     }

//     // If no JS files in js directory found, try to find any JS file
//     const anyJsFile = allFiles.find((file) =>
//       file.toLowerCase().endsWith(".js")
//     );
//     if (anyJsFile) {
//       return {
//         filePath: anyJsFile,
//         contentType: "application/javascript",
//       };
//     }

//     return null;
//   }

//   // Handle specific CSS file requests
//   if (
//     normalizedFileType.endsWith(".css") ||
//     normalizedFileType.endsWith("-styles.css")
//   ) {
//     // First try to find the CSS file in the css directory
//     const cssFileInDir = allFiles.find((file) => {
//       const normalizedPath = file.toLowerCase();
//       return (
//         normalizedPath.includes("/css/") &&
//         path.basename(normalizedPath) === normalizedFileType
//       );
//     });

//     if (cssFileInDir) {
//       return {
//         filePath: cssFileInDir,
//         contentType: "text/css",
//       };
//     }

//     // If not found in css directory, try to find any matching CSS file
//     const cssFile = allFiles.find(
//       (file) => path.basename(file).toLowerCase() === normalizedFileType
//     );

//     if (cssFile) {
//       return {
//         filePath: cssFile,
//         contentType: "text/css",
//       };
//     }

//     // If we're looking for a page-specific CSS file
//     const baseName = normalizedFileType
//       .replace("-styles.css", "")
//       .replace(".css", "");

//     const pageCssFile = allFiles.find((file) => {
//       const normalizedPath = file.toLowerCase();
//       return (
//         normalizedPath.includes("/css/") &&
//         path.basename(normalizedPath, ".css") === baseName
//       );
//     });

//     if (pageCssFile) {
//       return {
//         filePath: pageCssFile,
//         contentType: "text/css",
//       };
//     }
//   }

//   // Handle specific JS file requests
//   if (normalizedFileType.endsWith(".js")) {
//     // First try to find the JS file in the js directory
//     const jsFileInDir = allFiles.find((file) => {
//       const normalizedPath = file.toLowerCase();
//       return (
//         normalizedPath.includes("/js/") &&
//         path.basename(normalizedPath) === normalizedFileType
//       );
//     });

//     if (jsFileInDir) {
//       return {
//         filePath: jsFileInDir,
//         contentType: "application/javascript",
//       };
//     }

//     // If not found in js directory, try to find any matching JS file
//     const jsFile = allFiles.find(
//       (file) => path.basename(file).toLowerCase() === normalizedFileType
//     );

//     if (jsFile) {
//       return {
//         filePath: jsFile,
//         contentType: "application/javascript",
//       };
//     }

//     // If we're looking for a page-specific JS file
//     const baseName = normalizedFileType.replace(".js", "");

//     const pageJsFile = allFiles.find((file) => {
//       const normalizedPath = file.toLowerCase();
//       return (
//         normalizedPath.includes("/js/") &&
//         path.basename(normalizedPath, ".js") === baseName
//       );
//     });

//     if (pageJsFile) {
//       return {
//         filePath: pageJsFile,
//         contentType: "application/javascript",
//       };
//     }
//   }

//   // Check if the file exists directly with its name (case-insensitive)
//   const directMatch = allFiles.find(
//     (file) => path.basename(file).toLowerCase() === normalizedFileType
//   );
//   if (directMatch) {
//     const ext = path.extname(directMatch).toLowerCase();
//     return {
//       filePath: directMatch,
//       contentType: contentTypeMap[ext] || "text/plain",
//     };
//   }

//   // If direct match not found, try to find a file with the given name and any extension
//   const fileWithoutExt = path.basename(
//     normalizedFileType,
//     path.extname(normalizedFileType)
//   );
//   const possibleMatch = allFiles.find((file) => {
//     const basename = path.basename(file, path.extname(file)).toLowerCase();
//     return basename === fileWithoutExt;
//   });

//   if (possibleMatch) {
//     const ext = path.extname(possibleMatch).toLowerCase();
//     return {
//       filePath: possibleMatch,
//       contentType: contentTypeMap[ext] || "text/plain",
//     };
//   }

//   // Last resort: Check for the file in any directory
//   const fileName = path.basename(normalizedFileType);
//   const fileInAnyDir = allFiles.find(
//     (file) => path.basename(file).toLowerCase() === fileName
//   );
//   if (fileInAnyDir) {
//     const ext = path.extname(fileInAnyDir).toLowerCase();
//     return {
//       filePath: fileInAnyDir,
//       contentType: contentTypeMap[ext] || "text/plain",
//     };
//   }

//   return null;
// }






// /**
//  * Get all available templates (with unified caching)
//  */
// export const getAllTemplates = async (req: Request, res: Response) => {
//   const cacheKey = generateTemplateListCacheKey();

//   // Try to get from cache first
//   // const cachedResult = templateCache.get(cacheKey);
//   // if (cachedResult) {
//   //   console.log(`Cache HIT for template list`);
//   //    res.status(200).json(cachedResult);
//   //    return;
//   // }

//   try {
//     console.log(`Cache MISS for template list - generating...`);

//     // Read all directories in the templates folder
//     const entries = await fs.readdir(templatesDir, { withFileTypes: true });

//     // Filter for directories only
//     const templates = entries
//       .filter((entry) => entry.isDirectory())
//       .map((dir) => ({
//         id: dir.name,
//         name: dir.name,
//       }));

//     const result = {
//       message: "Templates fetched successfully!",
//       count: templates.length,
//       data: templates,
//     };

//     // Cache the result with long TTL
//     templateCache.set(cacheKey, result);
//     console.log(`Template list cached with key: ${cacheKey}`);

//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error fetching templates:", error);
//     res.status(500).json({
//       error: "Internal server error!",
//     });
//   }
// };

// /**
//  * Get a specific template by ID (with unified caching)
//  */
// export const getTemplateById = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const cacheKey = generateTemplateDetailsCacheKey(id);

//   // Try to get from cache first
//   const cachedResult = templateCache.get(cacheKey);
//   if (cachedResult) {
//     console.log(`Cache HIT for template details: ${id}`);
//      res.status(200).json(cachedResult);
//      return;
//   }

//   try {
//     console.log(`Cache MISS for template details: ${id} - generating...`);

//     // Specific template directory
//     const templateDir = path.join(templatesDir, id);

//     // Check if directory exists
//     try {
//       await fs.access(templateDir);
//     } catch (error) {
//       res.status(404).json({
//         error: `Template not found!`,
//       });
//       return;
//     }

//     // Get all files recursively in the template directory
//     const allFiles = await getAllFiles(templateDir);
//     const relativeFiles = allFiles.map((file) =>
//       path.relative(templateDir, file)
//     );

//     // Group files by type
//     const htmlFiles = relativeFiles.filter((file) => file.endsWith(".html"));
//     const cssFiles = relativeFiles.filter((file) => file.endsWith(".css"));
//     const jsFiles = relativeFiles.filter((file) => file.endsWith(".js"));
//     const otherFiles = relativeFiles.filter(
//       (file) =>
//         !file.endsWith(".html") &&
//         !file.endsWith(".css") &&
//         !file.endsWith(".js")
//     );

//     const result = {
//       message: "Template fetched successfully!",
//       data: {
//         id,
//         name: id,
//         files: {
//           html: htmlFiles,
//           css: cssFiles,
//           js: jsFiles,
//           other: otherFiles,
//         },
//       },
//     };

//     // Cache the result with long TTL
//     templateCache.set(cacheKey, result);
//     console.log(`Template details cached with key: ${cacheKey}`);

//     res.status(200).json(result);
//   } catch (error) {
//     console.error(`Error fetching template ${id}:`, error);
//     res.status(500).json({
//       error: "Internal server error!",
//     });
//   }
// };