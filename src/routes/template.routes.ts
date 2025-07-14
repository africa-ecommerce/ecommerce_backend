// src/routes/templateRoutes.ts
import { Router } from "express";
import {
  // getAllTemplates,
  // getTemplateById,
  getTemplateFile,
} from "../controllers/template.controller";

const router = Router();

// // Get all available templates
// router.get("/", getAllTemplates);

// // Get a specific template by ID
// router.get("/:id", getTemplateById);

// Get a specific file from a template (HTML, CSS, JS)
router.get("/:id/:fileType", getTemplateFile);

export default router;
