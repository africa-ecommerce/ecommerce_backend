// src/controllers/website.controller.ts
import { Request, Response } from "express";
import {
  upsertWebsite,
  getWebsite,
  deleteWebsite,
  WebsiteInput,
} from "../services/website.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const createOrUpdateWebsite = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const merchantId = req.merchant.id;
    const data: WebsiteInput = req.body;
    const website = await upsertWebsite(merchantId, data);
    res.status(200).json({ website });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const fetchWebsite = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const website = await getWebsite(merchantId);
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }
    res.status(200).json({ website });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const removeWebsite = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    await deleteWebsite(merchantId);
    res.status(200).json({ message: "Website deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};




// import { Request, Response } from "express";
// import { HugoService } from "../services/hugoGenerator";
// import { Queue } from "bullmq";

// const editQueue = new Queue("website-edits");

// export const updateWebsiteContent = async (req: Request, res: Response) => {
//   const merchantId = req.merchant!.id;

//   await editQueue.add("update-content", {
//     merchantId,
//     updates: req.body,
//   });

//   res.json({ message: "Update queued - site will refresh within 5 minutes" });
// };

// export const getCurrentContent = async (req: Request, res: Response) => {
//   const contentPath = path.join(HUGO_BASE_PATH, req.merchant.id, "content");
//   const content = await fs.readdir(contentPath);
//   res.json(content);
// };

// export const resetToTemplate = async (req: Request, res: Response) => {
//   await HugoService.regenerateSite(req.merchant.id);
//   res.json({ message: "Site reset to template defaults" });
// };

// // Worker Implementation
// const worker = new Worker("website-edits", async (job) => {
//   switch (job.name) {
//     case "update-content":
//       await updateContentFiles(job.data.merchantId, job.data.updates);
//       await HugoService.regenerateSite(job.data.merchantId);
//       break;
//   }
// });