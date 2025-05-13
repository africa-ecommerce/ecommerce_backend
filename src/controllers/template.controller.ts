import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";

// Templates directory path
const templatesDir = path.join(__dirname, "../../public/templates");

/**
 * Get all available templates
 * Lists all template directories in the public/templates folder
 */
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    // Read all directories in the templates folder
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });

    // Filter for directories only
    const templates = entries
      .filter((entry) => entry.isDirectory())
      .map((dir) => ({
        id: dir.name,
        name: dir.name,
      }));

     res.status(200).json({
      message: "Templates fetched successfully!",  
      count: templates.length,
      data: templates,
    });
    return;
  } catch (error) {
    console.error("Error fetching templates:", error);
     res.status(500).json({
      error: "Internal server error!",
    });
    return;
  }
};

/**
 * Get a specific template by ID
 * Lists all files available in the specified template directory
 */
export const getTemplateById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const templateDir = path.join(templatesDir, id);

    // Check if directory exists
    try {
      await fs.access(templateDir);
    } catch (error) {
       res.status(404).json({
        error: `Template not found!`,
      });
      return;
    }

    // Read all files in the template directory
    const files = await fs.readdir(templateDir);

    // Group files by type
    const htmlFiles = files.filter((file) => file.endsWith(".html"));
    const cssFiles = files.filter((file) => file.endsWith(".css"));
    const jsFiles = files.filter((file) => file.endsWith(".js"));
    const otherFiles = files.filter(
      (file) =>
        !file.endsWith(".html") &&
        !file.endsWith(".css") &&
        !file.endsWith(".js")
    );

     res.status(200).json({
      message: "Template fetched successfully!",
      data: {
        id,
        name: id,
        files: {
          html: htmlFiles,
          css: cssFiles,
          js: jsFiles,
          other: otherFiles,
        },
      },
    })
    return;
  } catch (error) {
    console.error(`Error fetching template ${id}:`, error);
     res.status(500).json({
       error: "Internal server error!",
     });
    return;
  }
};

/**
 * Get a specific file from a template
 * Returns the content of the requested file
 */

export const getTemplateFile = async (req: Request, res: Response) => {
  const { id, fileType } = req.params;

  try {
    const templateDir = path.join(templatesDir, id);

    // Check if template directory exists
    try {
      await fs.access(templateDir);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: `Template '${id}' not found!`,
      });
    }

    // Determine file path and content type based on request
    const fileInfo = await resolveFilePath(templateDir, fileType);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: `'${fileType}' file not found in template!`,
      });
    }

    // Try to read the file
    try {
      const fileContent = await fs.readFile(fileInfo.filePath, "utf-8");

      // Set content type
      res.setHeader("Content-Type", fileInfo.contentType);

      // Serve file content
      return res.status(200).send(fileContent);
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        error: `File could not be read: ${error.message}`,
      });
    }
  } catch (error) {
    console.error(`Error fetching template file:`, error);
    return res.status(500).json({
      success: false,
      error: "Internal server error!",
    });
  }
};

/**
 * Resolves the file path based on the requested file type
 * Returns the file path and content type if found
 */
async function resolveFilePath(templateDir: string, fileType: string): Promise<{ filePath: string; contentType: string } | null> {
  // Map of content types by file extension
  const contentTypeMap: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };

  // Get all files in the template directory recursively
  const allFiles = await getAllFiles(templateDir);
  
  // Handle common page aliases
  if (["index", "home", "main"].includes(fileType)) {
    return findFileByName(allFiles, "index.html", contentTypeMap);
  }
  
  // Handle HTML page requests (about, blog, product, etc.)
  if (["about", "blog", "product", "marketplace", "product-details"].includes(fileType)) {
    return findFileByName(allFiles, `${fileType}.html`, contentTypeMap);
  }
  
  // Handle component requests
  if (fileType.startsWith("component/") || fileType.startsWith("components/")) {
    const componentName = fileType.split("/")[1];
    const componentPath = allFiles.find(file => 
      file.includes(`/components/`) && file.endsWith(`${componentName}.html`)
    );
    
    if (componentPath) {
      return {
        filePath: componentPath,
        contentType: "text/html"
      };
    }
  }
  
  // Handle CSS requests
  if (fileType === "css") {
    // First try styles.css, then main.css, then first CSS file
    const cssOptions = ["styles.css", "main.css", "style.css"];
    
    for (const option of cssOptions) {
      const result = findFileByName(allFiles, option, contentTypeMap);
      if (result) return result;
    }
    
    // If none of the main CSS files are found, return the first CSS file
    const firstCssFile = allFiles.find(file => file.endsWith(".css"));
    if (firstCssFile) {
      return {
        filePath: firstCssFile,
        contentType: "text/css"
      };
    }
    
    return null;
  }
  
  // Handle JS requests
  if (fileType === "js") {
    // First try script.js, then main.js, then first JS file
    const jsOptions = ["script.js", "main.js", "index.js"];
    
    for (const option of jsOptions) {
      const result = findFileByName(allFiles, option, contentTypeMap);
      if (result) return result;
    }
    
    // If none of the main JS files are found, return the first JS file
    const firstJsFile = allFiles.find(file => file.endsWith(".js"));
    if (firstJsFile) {
      return {
        filePath: firstJsFile,
        contentType: "application/javascript"
      };
    }
    
    return null;
  }
  
  // Handle specific CSS files
  if (fileType.endsWith("-styles.css") || fileType.endsWith(".css")) {
    const cssFileName = fileType;
    return findFileByName(allFiles, cssFileName, contentTypeMap);
  }
  
  // Handle specific JS files
  if (fileType.endsWith(".js")) {
    const jsFileName = fileType;
    return findFileByName(allFiles, jsFileName, contentTypeMap);
  }
  
  // Check if the file exists directly with its name
  const directMatch = allFiles.find(file => path.basename(file) === fileType);
  if (directMatch) {
    const ext = path.extname(directMatch);
    return {
      filePath: directMatch,
      contentType: contentTypeMap[ext] || "text/plain"
    };
  }
  
  // If direct match not found, try to find a file with the given name and any extension
  const fileWithoutExt = path.basename(fileType, path.extname(fileType));
  const possibleMatch = allFiles.find(file => {
    const basename = path.basename(file, path.extname(file));
    return basename === fileWithoutExt;
  });
  
  if (possibleMatch) {
    const ext = path.extname(possibleMatch);
    return {
      filePath: possibleMatch,
      contentType: contentTypeMap[ext] || "text/plain"
    };
  }
  
  return null;
}

/**
 * Find a file by name in the list of files
 */
function findFileByName(
  allFiles: string[],
  fileName: string,
  contentTypeMap: Record<string, string>
): { filePath: string; contentType: string } | null {
  const file = allFiles.find(file => path.basename(file) === fileName);
  if (file) {
    const ext = path.extname(file);
    return {
      filePath: file,
      contentType: contentTypeMap[ext] || "text/plain"
    };
  }
  return null;
}

/**
 * Get all files in a directory recursively
 */
async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  const files = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? 
      await getAllFiles(fullPath) : 
      fullPath;
  }));
  
  return files.flat();
}