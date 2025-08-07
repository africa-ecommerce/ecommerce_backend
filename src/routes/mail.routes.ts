import express from "express";
import { queueMail, startBackgroundProcessor } from "../helper/workers/mailQueue";
// import { startBackgroundProcessor } from "@/lib/email/queue/processor";

const router = express.Router();

// router.post("/processQueuedMail", async (req, res) => {
//   try {
//     await startBackgroundProcessor("general", "high");
//     await startBackgroundProcessor("general", "normal");
//     await startBackgroundProcessor("general", "low");

//     res.status(200).json({ success: true });
//   } catch (error: any) {
//     console.error("❌ Mail processing error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });



router.post("/processQueuedMail", async (req, res) => {
  try {
    // Process in priority order, small batches
    await startBackgroundProcessor("general", "high");
    await startBackgroundProcessor("general", "normal");
    await startBackgroundProcessor("general", "low");

    res.status(200).json({ success: true, message: "Processing complete" });
  } catch (error: any) {
    console.error("❌ Mail processing error:", error);
    res.status(500).json({ error: error.message });
  }
});
export default router;

// ➤ routes/api/queueMail.ts (Express Route)
// import express from "express";


// const router = express.Router();

router.post("/queueMail", async (req, res) => {
  const data = req.body;

  try {
    const queuedId = await queueMail({
      to: data.to,
      subject: data.subject,
      html: data.html,
      senderKey: data.senderKey,
      replyTo: data.replyTo,
      mailType: data.mailType,
      priority: data.priority || "normal",
    });

    res.status(200).json({ queuedId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// export default router;
