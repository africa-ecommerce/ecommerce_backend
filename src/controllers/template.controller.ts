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
       res.status(404).json({
        success: false,
        error: `Template not found!`,
      });
      return;
    }

    // Handle different file types
    let filePath: string;
    let contentType: string;

    // Map common page names to their file paths
    if (fileType === "index" || fileType === "home" || fileType === "main") {
      filePath = path.join(templateDir, "index.html");
      contentType = "text/html";
    } else if (
      fileType === "about" ||
      fileType === "blog" ||
      fileType === "product"
    ) {
      filePath = path.join(templateDir, `${fileType}.html`);
      contentType = "text/html";
    } else if (fileType === "css") {
      // First try main.css, then style.css, then the first CSS file found
      const cssFiles = (await fs.readdir(templateDir)).filter((file) =>
        file.endsWith(".css")
      );

      if (cssFiles.includes("main.css")) {
        filePath = path.join(templateDir, "main.css");
      } else if (cssFiles.includes("style.css")) {
        filePath = path.join(templateDir, "style.css");
      } else if (cssFiles.length > 0) {
        filePath = path.join(templateDir, cssFiles[0]);
      } else {
         res.status(404).json({
          error: `No CSS files found!`,
        });
        return;
      }
      contentType = "text/css";
    } else if (fileType === "js") {
      // First try main.js, then script.js, then the first JS file found
      const jsFiles = (await fs.readdir(templateDir)).filter((file) =>
        file.endsWith(".js")
      );

      if (jsFiles.includes("main.js")) {
        filePath = path.join(templateDir, "main.js");
      } else if (jsFiles.includes("script.js")) {
        filePath = path.join(templateDir, "script.js");
      } else if (jsFiles.length > 0) {
        filePath = path.join(templateDir, jsFiles[0]);
      } else {
         res.status(404).json({
          
          error: `No JavaScript files found!`,
        });
        return;
      }
      contentType = "application/javascript";
    } else {
      // Check if the file exists directly with its name
      const allFiles = await fs.readdir(templateDir);
      if (allFiles.includes(fileType)) {
        filePath = path.join(templateDir, fileType);

        // Determine content type based on file extension
        if (fileType.endsWith(".html")) contentType = "text/html";
        else if (fileType.endsWith(".css")) contentType = "text/css";
        else if (fileType.endsWith(".js"))
          contentType = "application/javascript";
        else if (fileType.endsWith(".json")) contentType = "application/json";
        else contentType = "text/plain";
      } else {
         res.status(404).json({
           error: `${fileType} File not found in template!`,
         });
        return;
      }
    }

    // Try to read the file
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");

      // Set content type
      res.setHeader("Content-Type", contentType);

      // Serve file content
       res.status(200).send(fileContent);
       return;
    } catch (error: any) {
       res.status(404).json({
        
        error: `File could not be read: ${error.message}!`,
      });
      return;
    }
  } catch (error) {
    console.error(`Error fetching template file:`, error);
     res.status(500).json({
       error: "Internal server error!",
     });
    return;
  }

};
