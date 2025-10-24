import { Router } from "express";
import { getTemplateFile } from "../controllers/template.controller";
import { getSPATemplate } from "../controllers/SPA.template.controller";

const router = Router();

/**
 * Serve any static file from a template (HTML, CSS, JS)
 * Example:
 *  /template/primary/index
 *  /template/primary/css/style.css
 *  /template/primary/js/main.js
 */

router.get("/:id/*", getTemplateFile);

// For SPA rendering
router.get("/spa/:subdomain", getSPATemplate);

export default router;
