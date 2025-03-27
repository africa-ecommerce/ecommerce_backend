// src/routes/notification.routes.ts
import { Router } from "express";
import { authenticateJWT } from "../middleware/auth.middleware";

import {
  notifyInApp,
  notifyEmail,
  notifySMS,
  notify,
} from "../controllers/notification.controller";

const router = Router();
router.post("/", authenticateJWT, notify);
router.post("/in-app", authenticateJWT, notifyInApp);
router.post("/email", authenticateJWT, notifyEmail);
router.post("/sms", authenticateJWT, notifySMS);

export default router;
