import express from "express";
import { contactSupport } from "../controllers/contactSupport.controller";

const router = express.Router();
router.post("/", contactSupport);

export default router;
