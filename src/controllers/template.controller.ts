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
 * For HTML pages, returns a fully rendered page with all CSS and JS injected
 * For other files, returns the raw content
 */
export const getTemplateFile = async (req: Request, res: Response) => {
  const { id, fileType } = req.params;
  const normalizedFileType = fileType.toLowerCase(); // Normalize fileType to lowercase

  try {
    const templateDir = path.join(templatesDir, id);

    // Check if template directory exists
    try {
      await fs.access(templateDir);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: `Template '${id}' not found!`,
      });
      
      return;
    }

    // Determine file path and content type based on request
    const fileInfo = await resolveFilePath(templateDir, normalizedFileType);
    
    if (!fileInfo) {
      res.status(404).json({
        success: false,
        error: `'${fileType}' file not found in template!`,
      });

      return;
    }

    // Try to read the file
    try {
      let fileContent = await fs.readFile(fileInfo.filePath, "utf-8");

      // If this is an HTML file (but not a component), inject assets directly
      if (fileInfo.contentType === "text/html" && !normalizedFileType.startsWith("component")) {
        const pageName = path.basename(fileInfo.filePath, ".html").toLowerCase();
        fileContent = await injectPageAssets(fileContent, templateDir, pageName);
        
        // Set content type and send full HTML
        res.setHeader("Content-Type", "text/html");
        res.status(200).send(fileContent);
        return;
      } else {
        // For non-HTML files or component files, just send the content
        res.setHeader("Content-Type", fileInfo.contentType);
        res.status(200).send(fileContent);
        return;
      }
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: `File could not be read: ${error.message}`,
      });
      return;
    }
  } catch (error) {
    console.error(`Error fetching template file:`, error);
    res.status(500).json({
      success: false,
      error: "Internal server error!",
    });
    
    return;
  }
};

/**
 * Injects all assets (CSS, JS, components) into an HTML page
 * @param htmlContent The original HTML content
 * @param templateDir The template directory
 * @param pageName The name of the page (without extension)
 * @returns The HTML with all assets injected
 */
async function injectPageAssets(htmlContent: string, templateDir: string, pageName: string): Promise<string> {
  const allFiles = await getAllFiles(templateDir);
  
  try {
    // First, inject components recursively to handle nested components
    htmlContent = await injectComponents(htmlContent, allFiles, templateDir);
    
    // Collect CSS files
    const cssFiles: { path: string, content: string }[] = [];
    
    // Check for page-specific CSS (e.g., blog.css for blog.html)
    const pageSpecificCssFiles = allFiles.filter(file => {
      const basename = path.basename(file).toLowerCase();
      return basename === `${pageName}.css` || basename === `${pageName}-styles.css`;
    });
    
    for (const cssFile of pageSpecificCssFiles) {
      cssFiles.push({
        path: cssFile,
        content: await fs.readFile(cssFile, "utf-8")
      });
    }
    
    // Check for common CSS files
    const commonCssFiles = ["styles.css", "style.css", "main.css", "components.css", "global.css"];
    for (const cssFileName of commonCssFiles) {
      const cssFilePaths = allFiles.filter(file => 
        path.basename(file).toLowerCase() === cssFileName.toLowerCase()
      );
      
      for (const cssFilePath of cssFilePaths) {
        cssFiles.push({
          path: cssFilePath,
          content: await fs.readFile(cssFilePath, "utf-8")
        });
      }
    }
    
    // Collect JS files
    const jsFiles: { path: string, content: string }[] = [];
    
    // Check for page-specific JS
    const pageSpecificJsFiles = allFiles.filter(file => {
      const basename = path.basename(file).toLowerCase();
      return basename === `${pageName}.js`;
    });
    
    for (const jsFile of pageSpecificJsFiles) {
      jsFiles.push({
        path: jsFile,
        content: await fs.readFile(jsFile, "utf-8")
      });
    }
    
    // Check for common JS files
    const commonJsFiles = ["script.js", "main.js", "layout.js", "cart.js", "common.js", "global.js"];
    for (const jsFileName of commonJsFiles) {
      const jsFilePaths = allFiles.filter(file => 
        path.basename(file).toLowerCase() === jsFileName.toLowerCase()
      );
      
      for (const jsFilePath of jsFilePaths) {
        jsFiles.push({
          path: jsFilePath,
          content: await fs.readFile(jsFilePath, "utf-8")
        });
      }
    }
    
    // Inject CSS into head
    if (cssFiles.length > 0) {
      const cssContent = cssFiles.map(css => 
        `<style>/* ${path.basename(css.path)} */\n${css.content}\n</style>`
      ).join('\n');
      
      // Try to find the end of head tag to insert styles
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', `${cssContent}\n</head>`);
      } else {
        // If no head tag, try to insert at the beginning of the html
        const htmlStart = htmlContent.indexOf('<html');
        if (htmlStart !== -1) {
          const htmlEndTag = htmlContent.indexOf('>', htmlStart);
          if (htmlEndTag !== -1) {
            htmlContent = htmlContent.slice(0, htmlEndTag + 1) + 
                         `\n<head>${cssContent}\n</head>\n` + 
                         htmlContent.slice(htmlEndTag + 1);
          }
        } else {
          // If no html tag, just prepend at the top
          htmlContent = `<html><head>${cssContent}</head><body>${htmlContent}</body></html>`;
        }
      }
    }
    
    // Inject JS before end of body
    if (jsFiles.length > 0) {
      const jsContent = jsFiles.map(js => 
        `<script>/* ${path.basename(js.path)} */\n${js.content}\n</script>`
      ).join('\n');
      
      // Try to find the end of body tag to insert scripts
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `${jsContent}\n</body>`);
      } else {
        // If no body tag, append to the end of html
        htmlContent = htmlContent + `\n${jsContent}\n`;
      }
    }
    
    return htmlContent;
  } catch (error) {
    console.error(`Error injecting page assets:`, error);
    return htmlContent; // Return original HTML if there was an error
  }
}

/**
 * Recursively inject components in HTML content
 * This handles both <!-- INCLUDE COMPONENT: Name --> syntax and also checks for <include-component> tags
 */
async function injectComponents(htmlContent: string, allFiles: string[], templateDir: string, processedComponents: Set<string> = new Set()): Promise<string> {
  // Handle <!-- INCLUDE COMPONENT: Name --> syntax
  const componentCommentRegex = /<!--\s*INCLUDE\s+COMPONENT\s*:\s*([A-Za-z0-9_-]+)\s*-->/gi;
  let match;
  let newContent = htmlContent;
  let componentFound = false;
  
  // Look for component include tags and replace them
  while ((match = componentCommentRegex.exec(htmlContent)) !== null) {
    const componentName = match[1].toLowerCase();
    
    // Skip if this component was already processed (prevent infinite recursion)
    if (processedComponents.has(componentName)) {
      newContent = newContent.replace(match[0], `<!-- Component ${componentName} already included -->`);
      continue;
    }
    
    const componentPath = allFiles.find(file => {
      const normalizedPath = file.toLowerCase();
      return (normalizedPath.includes(`/components/`) || normalizedPath.includes(`\\components\\`)) && 
             path.basename(normalizedPath, ".html") === componentName;
    });
    
    if (componentPath) {
      componentFound = true;
      processedComponents.add(componentName);
      let componentContent = await fs.readFile(componentPath, "utf-8");
      
      // Recursively process this component for nested components
      componentContent = await injectComponents(componentContent, allFiles, templateDir, processedComponents);
      
      newContent = newContent.replace(match[0], componentContent);
    }
  }
  
  // Also handle <include-component name="Name"></include-component> syntax
  const componentTagRegex = /<include-component[^>]*name=["']([A-Za-z0-9_-]+)["'][^>]*><\/include-component>/gi;
  
  while ((match = componentTagRegex.exec(htmlContent)) !== null) {
    const componentName = match[1].toLowerCase();
    
    // Skip if this component was already processed (prevent infinite recursion)
    if (processedComponents.has(componentName)) {
      newContent = newContent.replace(match[0], `<!-- Component ${componentName} already included -->`);
      continue;
    }
    
    const componentPath = allFiles.find(file => {
      const normalizedPath = file.toLowerCase();
      return (normalizedPath.includes(`/components/`) || normalizedPath.includes(`\\components\\`)) && 
             path.basename(normalizedPath, ".html") === componentName;
    });
    
    if (componentPath) {
      componentFound = true;
      processedComponents.add(componentName);
      let componentContent = await fs.readFile(componentPath, "utf-8");
      
      // Recursively process this component for nested components
      componentContent = await injectComponents(componentContent, allFiles, templateDir, processedComponents);
      
      newContent = newContent.replace(match[0], componentContent);
    }
  }
  
  // If we found and replaced components, check again for nested components
  if (componentFound) {
    return injectComponents(newContent, allFiles, templateDir, processedComponents);
  }
  
  return newContent;
}

/**
 * Get all files in a directory recursively
 */
async function getAllFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    const files = await Promise.all(entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? 
        await getAllFiles(fullPath) : 
        fullPath;
    }));
    
    return files.flat();
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return [];
  }
}

/**
 * Find a file by name in the list of files, case-insensitive
 */
function findFileByName(
  allFiles: string[],
  fileName: string,
  contentTypeMap: Record<string, string>
): { filePath: string; contentType: string } | null {
  const normalizedFileName = fileName.toLowerCase();
  const file = allFiles.find(file => path.basename(file).toLowerCase() === normalizedFileName);
  
  if (file) {
    const ext = path.extname(file).toLowerCase();
    return {
      filePath: file,
      contentType: contentTypeMap[ext] || "text/plain"
    };
  }
  return null;
}

/**
 * Resolves the file path based on the requested file type
 * Returns the file path and content type if found
 * Normalized for case-insensitivity
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
  if (allFiles.length === 0) {
    console.error(`No files found in template directory: ${templateDir}`);
    return null;
  }
  
  const normalizedFileType = fileType.toLowerCase();
  
  // Handle common page aliases
  if (["index", "home", "main"].includes(normalizedFileType)) {
    return findFileByName(allFiles, "index.html", contentTypeMap);
  }
  
  // Handle HTML page requests (about, blog, product, etc.)
  if (["about", "blog", "product", "marketplace", "product-details"].includes(normalizedFileType)) {
    return findFileByName(allFiles, `${normalizedFileType}.html`, contentTypeMap);
  }
  
  // Handle component requests - more robust handling
  if (normalizedFileType.startsWith("component/") || normalizedFileType.startsWith("components/")) {
    const parts = normalizedFileType.split("/");
    const componentName = parts[parts.length - 1].toLowerCase();
    
    // Look for the component file - case insensitive
    const componentPath = allFiles.find(file => {
      const normalizedFilePath = file.toLowerCase();
      return (normalizedFilePath.includes(`/components/`) || normalizedFilePath.includes(`\\components\\`)) && 
             path.basename(normalizedFilePath, path.extname(normalizedFilePath)) === componentName;
    });
    
    if (componentPath) {
      return {
        filePath: componentPath,
        contentType: "text/html"
      };
    }
  }
  
  // Handle CSS requests
  if (normalizedFileType === "css") {
    // First try styles.css, then other CSS options
    const cssOptions = ["styles.css", "style.css", "main.css", "global.css"];
    
    for (const option of cssOptions) {
      const result = findFileByName(allFiles, option, contentTypeMap);
      if (result) return result;
    }
    
    // If none of the main CSS files are found, return the first CSS file
    const firstCssFile = allFiles.find(file => file.toLowerCase().endsWith(".css"));
    if (firstCssFile) {
      return {
        filePath: firstCssFile,
        contentType: "text/css"
      };
    }
    
    return null;
  }
  
  // Handle JS requests
  if (normalizedFileType === "js") {
    // Try common JS files first
    const jsOptions = ["script.js", "main.js", "index.js", "app.js"];
    
    for (const option of jsOptions) {
      const result = findFileByName(allFiles, option, contentTypeMap);
      if (result) return result;
    }
    
    // If none of the main JS files are found, return the first JS file
    const firstJsFile = allFiles.find(file => file.toLowerCase().endsWith(".js"));
    if (firstJsFile) {
      return {
        filePath: firstJsFile,
        contentType: "application/javascript"
      };
    }
    
    return null;
  }
  
  // Handle specific CSS files with case insensitivity
  if (normalizedFileType.endsWith("-styles.css") || normalizedFileType.endsWith(".css")) {
    const cssFileName = normalizedFileType;
    return findFileByName(allFiles, cssFileName, contentTypeMap);
  }
  
  // Handle specific JS files with case insensitivity
  if (normalizedFileType.endsWith(".js")) {
    const jsFileName = normalizedFileType;
    return findFileByName(allFiles, jsFileName, contentTypeMap);
  }
  
  // Check if the file exists directly with its name (case-insensitive)
  const directMatch = allFiles.find(file => path.basename(file).toLowerCase() === normalizedFileType);
  if (directMatch) {
    const ext = path.extname(directMatch).toLowerCase();
    return {
      filePath: directMatch,
      contentType: contentTypeMap[ext] || "text/plain"
    };
  }
  
  // If direct match not found, try to find a file with the given name and any extension
  const fileWithoutExt = path.basename(normalizedFileType, path.extname(normalizedFileType));
  const possibleMatch = allFiles.find(file => {
    const basename = path.basename(file, path.extname(file)).toLowerCase();
    return basename === fileWithoutExt;
  });
  
  if (possibleMatch) {
    const ext = path.extname(possibleMatch).toLowerCase();
    return {
      filePath: possibleMatch,
      contentType: contentTypeMap[ext] || "text/plain"
    };
  }
  
  // Last resort: Check for the file in any directory
  const fileName = path.basename(normalizedFileType);
  const fileInAnyDir = allFiles.find(file => path.basename(file).toLowerCase() === fileName);
  if (fileInAnyDir) {
    const ext = path.extname(fileInAnyDir).toLowerCase();
    return {
      filePath: fileInAnyDir,
      contentType: contentTypeMap[ext] || "text/plain"
    };
  }
  
  return null;
}