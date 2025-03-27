// src/routes/whatsapp.routes.ts
import { Router } from "express";
import { whatsappProductUpload } from "../controllers/whatsapp.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();
router.post("/product", authenticateJWT, whatsappProductUpload);
export default router;




// import express from "express";
// import {
//   handleIncomingMessage,
//   syncHistory,
//   getConversations,
//   sendReply,
// } from "../controllers/whatsapp.controller";
// import { authMiddleware } from "../middleware/auth";

// const router = express.Router();

// // Webhook
// router.post("/webhook", handleIncomingMessage);

// // Authenticated routes
// router.use(authMiddleware);
// router.get("/sync", syncHistory);
// router.get("/conversations", getConversations);
// router.post("/reply", sendReply);

// export default router;