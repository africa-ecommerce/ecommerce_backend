import express from "express";
import {startBackgroundProcessor } from "../helper/workers/mailQueue";

const router = express.Router();
router.post("/processQueuedMail", async (req, res) => {
  try {
   
    await startBackgroundProcessor("general", "normal");

    res.status(200).json({ success: true, message: "Processing complete" });
  } catch (error: any) {
    console.error("❌ Mail processing error:", error);
    res.status(500).json({ error: error.message });
  }
});
export default router;
