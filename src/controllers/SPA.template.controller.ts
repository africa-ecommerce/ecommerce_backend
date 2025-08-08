import { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import NodeCache from "node-cache";
import { getStoreConfigFromMinio } from "../helper/minioObjectStore/storeConfig";

// Templates directory path
const templatesDir = path.join(__dirname, "../../public/templates");

// Cache for compiled SPA templates (24 hour TTL)
const spaCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

// Route definitions for the SPA - now includes 404 as a valid route
const VALID_ROUTES = ["index", "marketplace", "product-details"];

interface TemplateFile {
  name: string;
  content: string;
  type: "html" | "css" | "js";
}

// GET /template/spa/:subdomain?requestedPath=page
export const getSPATemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { subdomain } = req.params;
  const requestedPath = (req.query.requestedPath as string) || "index";

  // Normalize the requested path
  const normalizedPath = normalizeRoutePath(requestedPath);

  const cacheKey = `spa-${subdomain}`;

  // Check cache first
  const cachedSPA = spaCache.get(cacheKey);
  if (cachedSPA) {
    console.log(`SPA Cache HIT: ${subdomain}`);
    const spaHtml = cachedSPA as string;

    // Inject the initial route
    const finalHtml = injectInitialRoute(spaHtml, normalizedPath);

    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=600, stale-while-revalidate=3600"
    );
    res.setHeader("ETag", `"spa-${subdomain}-v1"`);
    res.status(200).send(finalHtml);
    return;
  }

  try {
    // Get store configuration
    const storeConfig = await getStoreConfigFromMinio(subdomain);
    if (!storeConfig) {
      return handle404(res);
    }

    // Build the complete SPA
    const spaHtml = await buildSPA(subdomain, storeConfig);

    // Cache the compiled SPA
    spaCache.set(cacheKey, spaHtml);
    console.log(`SPA Cached: ${subdomain}`);

    // Inject the initial route
    const finalHtml = injectInitialRoute(spaHtml, normalizedPath);

    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=600, stale-while-revalidate=3600"
    );
    res.setHeader("ETag", `"spa-${subdomain}-v1"`);
    res.status(200).send(finalHtml);
  } catch (err) {
    console.error("SPA build error:", err);
    return handle500(res);
  }
};

async function buildSPA(subdomain: string, config: any): Promise<string> {
  const templateId = "primary"; // Could be dynamic based on subdomain
  const templateDir = path.join(templatesDir, templateId);

  // Check if template exists
  try {
    await fs.access(templateDir);
  } catch {
    throw new Error(`Template '${templateId}' not found`);
  }

  // Read all template files
  const [htmlFiles, cssFiles, jsFiles] = await Promise.all([
    getTemplateFiles(templateDir, "html"),
    getTemplateFiles(templateDir, "css"),
    getTemplateFiles(templateDir, "js"),
  ]);

  // Build the main HTML structure
  let spaHtml = await buildMainHTML(htmlFiles, config);

  // Inject CSS
  spaHtml = injectCSS(spaHtml, cssFiles, config);

  // Inject JavaScript
  spaHtml = injectJS(spaHtml, jsFiles, config);

  // Add SPA router
  spaHtml = injectSPARouter(spaHtml);

  return spaHtml;
}

async function getTemplateFiles(
  templateDir: string,
  fileType: "html" | "css" | "js"
): Promise<TemplateFile[]> {
  const files: TemplateFile[] = [];

  try {
    let searchDir = templateDir;
    let pattern = "";

    switch (fileType) {
      case "html":
        pattern = ".html";
        break;
      case "css":
        searchDir = path.join(templateDir, "css");
        pattern = ".css";
        break;
      case "js":
        searchDir = path.join(templateDir, "js");
        pattern = ".js";
        break;
    }

    const dirExists = await fs
      .access(searchDir)
      .then(() => true)
      .catch(() => false);
    if (!dirExists) return files;

    const entries = await fs.readdir(searchDir);

    for (const entry of entries) {
      if (entry.endsWith(pattern)) {
        const filePath = path.join(searchDir, entry);
        const content = await fs.readFile(filePath, "utf-8");
        const name = path.basename(entry, pattern);

        files.push({
          name,
          content,
          type: fileType,
        });
      }
    }
  } catch (error) {
    console.log(`No ${fileType} files found in template`);
  }

  return files;
}

async function buildMainHTML(
  htmlFiles: TemplateFile[],
  config: any
): Promise<string> {
  // Find index.html as the base template
  const indexFile = htmlFiles.find((f) => f.name === "index");
  if (!indexFile) {
    throw new Error("index.html template not found");
  }

  let html = indexFile.content;

  // Add hidden page containers for other HTML files
  const pageContainers = htmlFiles
    .filter((f) => f.name !== "index" && VALID_ROUTES.includes(f.name))
    .map((f) => {
      // Extract body content from each page
      const bodyMatch = f.content.match(/<main>([\s\S]*?)<\/main>/);
      const mainContent = bodyMatch ? bodyMatch[1] : f.content;

      return `<div id="page-${f.name}" class="spa-page" style="display: none;">${mainContent}</div>`;
    })
    .join("\n");

  // Insert page containers before closing body tag
  html = html.replace("</body>", `${pageContainers}\n</body>`);

  return html;
}

function injectCSS(
  html: string,
  cssFiles: TemplateFile[],
  config: any
): string {
  // Combine all CSS content
  let combinedCSS = cssFiles
    .map((f) => {
      let css = f.content;

      return css;
    })
    .join("\n\n");

  // Add SPA-specific styles
  combinedCSS += `
    .spa-page {
      display: none;
    }
    .spa-page.active {
      display: block;
    }
    .page-transition {
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    .page-transition.show {
      opacity: 1;
    }
  `;

  // Inject CSS into head
  const cssTag = `<style>${combinedCSS}</style>`;
  html = html.replace("</head>", `${cssTag}\n</head>`);

  return html;
}

function injectJS(html: string, jsFiles: TemplateFile[], config: any): string {
  // Remove external JS links

  // Combine all JS content and inject config
  const combinedJS = jsFiles.map((f) => f.content).join("\n\n");

  const configJS = `
    // Store configuration
    window.STORE_CONFIG = ${JSON.stringify(config)};
    window.SUBDOMAIN = "${config.storeName.toLowerCase().replace(/\s+/g, "")}";
  `;

  const scriptTag = `<script>${configJS}\n${combinedJS}</script>`;
  html = html.replace("</body>", `${scriptTag}\n</body>`);

  return html;
}

function injectSPARouter(html: string): string {
  const routerJS = `
    <script>
    // SPA Router
    class SPARouter {
      constructor() {
        this.routes = ${JSON.stringify(VALID_ROUTES)};
        this.currentRoute = 'index';
        this.init();
      }

      init() {
        // Handle initial route
        const initialRoute = window.INITIAL_ROUTE || 'index';
        this.navigateToRoute(initialRoute, false);
        
        // Handle browser navigation
        window.addEventListener('popstate', (e) => {
          const route = e.state?.route || this.getRouteFromPath();
          this.navigateToRoute(route, false);
        });

        // Handle link clicks
        document.addEventListener('click', (e) => {
          const link = e.target.closest('a[href^="/"]');
          if (link && this.isInternalLink(link.href)) {
            e.preventDefault();
            const route = this.getRouteFromPath(link.pathname);
            this.navigateToRoute(route, true);
          }
        });
      }

      getRouteFromPath(pathname = window.location.pathname) {
        const route = pathname === '/' ? 'index' : pathname.replace('/', '').split('/')[0];
        return this.routes.includes(route) ? route : '404';
      }

      isInternalLink(href) {
        try {
          const url = new URL(href, window.location.origin);
          return url.origin === window.location.origin;
        } catch {
          return false;
        }
      }

      navigateToRoute(route, updateHistory = true) {
        // Handle invalid routes by redirecting to 404
        if (!this.routes.includes(route)) {
          route = '404';
        }

        // Hide all pages
        document.querySelectorAll('.spa-page').forEach(page => {
          page.style.display = 'none';
          page.classList.remove('active');
        });

        // Show target page or main content for index
        if (route === 'index') {
          document.querySelector('main').style.display = 'block';
        } else {
          document.querySelector('main').style.display = 'none';
          const targetPage = document.getElementById(\`page-\${route}\`);
          if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('active');
          } else {
            // Fallback if template file doesn't exist - show 404 route
            route = '404';
            const notFoundPage = document.getElementById('page-404');
            if (notFoundPage) {
              notFoundPage.style.display = 'block';
              notFoundPage.classList.add('active');
            }
          }
        }

        // Update URL and history
        if (updateHistory) {
          const url = route === 'index' ? '/' : \`/\${route}\`;
          window.history.pushState({ route }, '', url);
        }

        // Update navigation active states
        this.updateNavigation(route);
        this.currentRoute = route;

        // Trigger route change event
        window.dispatchEvent(new CustomEvent('routechange', { detail: { route } }));
      }

      updateNavigation(activeRoute) {
        document.querySelectorAll('.nav-link, .sidebar-nav a').forEach(link => {
          const href = link.getAttribute('href');
          const linkRoute = href === '/' ? 'index' : href.replace('/', '');
          
          if (linkRoute === activeRoute) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    }

    // Initialize router when DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.spaRouter = new SPARouter();
      });
    } else {
      window.spaRouter = new SPARouter();
    }
    </script>
  `;

  html = html.replace("</body>", `${routerJS}\n</body>`);
  return html;
}

function injectInitialRoute(html: string, requestedPath: string): string {
  // Inject the initial route information
  const initialRouteScript = `
    <script>
      window.INITIAL_ROUTE = "${requestedPath}";
    </script>
  `;

  html = html.replace("<head>", `<head>${initialRouteScript}`);
  return html;
}

function normalizeRoutePath(path: string): string {
  // Remove leading slashes and get the first segment
  const cleanPath = path.replace(/^\/+/, "").split("/")[0] || "index";

  // Map common variations - now includes 404 as a valid route
  const routeMap: { [key: string]: string } = {
    "": "index",
    home: "index",
    main: "index",
    shop: "marketplace",
    products: "marketplace",
    store: "marketplace",
    "404": "404",
    "not-found": "404",
    error: "error",
  };

  const mappedRoute = routeMap[cleanPath] || cleanPath;

  // Return valid route or 404
  return VALID_ROUTES.includes(mappedRoute) ? mappedRoute : "404";
}

function handle404(res: Response) {
  res
    .status(404)
    .sendFile(path.join(__dirname, "../../public/templates/primary/404.html"));
  return;
}

function handle500(res: Response) {
  res
    .status(500)
    .sendFile(
      path.join(__dirname, "../../public/templates/primary/error.html")
    );
  return;
}
// Cache management endpoints
export const clearSPACache = async (req: Request, res: Response) => {
  const { subdomain } = req.params;
  
  if (subdomain) {
    spaCache.del(`spa-${subdomain}`);
    res.json({ success: true, message: `Cache cleared for ${subdomain}` });
  } else {
    spaCache.flushAll();
    res.json({ success: true, message: 'All SPA cache cleared' });
  }
};

export const getSPACacheStats = async (req: Request, res: Response) => {
  const stats = spaCache.getStats();
  res.json({
    success: true,
    stats: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize
    }
  });
};