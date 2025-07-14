import express from "express";
import { contactSupport } from "../controllers/contactSupport.controller";

const router = express.Router();
// This route handles generating a short link for plugs
router.post("/", contactSupport);

export default router;
