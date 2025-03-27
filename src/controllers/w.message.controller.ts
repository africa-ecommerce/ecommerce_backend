// src/controllers/whatsapp.message.controller.ts
import { Request, Response } from "express";
import {
  saveWhatsAppMessage,
  getMerchantWhatsAppMessages,
  WhatsAppMessageInput,
} from "../services/w.message.service";
import { AuthRequest } from "../middleware/auth.middleware";

/**
 * Endpoint to process inbound WhatsApp messages.
 * This endpoint can be used as a webhook for the WhatsApp Business API.
 */
export const receiveWhatsAppMessage = async (req: Request, res: Response) => {
  try {
    // Expecting a payload from WhatsApp with sender, message, and optionally mediaUrl.
    const { merchantId, sender, content, mediaUrl } =
      req.body as WhatsAppMessageInput;
    if (!merchantId || !sender || !content) {
      return res
        .status(400)
        .json({ error: "merchantId, sender, and content are required" });
    }
    const message = await saveWhatsAppMessage({
      merchantId,
      sender,
      content,
      mediaUrl,
    });
    // Optionally, trigger notifications or real-time updates here.
    res.status(201).json({ message });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Endpoint for merchants to retrieve their WhatsApp messages,
 * which can then be displayed on their website (e.g., live chat/inbox).
 */
export const getWhatsAppMessagesForMerchant = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const merchantId = req.merchant.id;
    const messages = await getMerchantWhatsAppMessages(merchantId);
    res.status(200).json({ messages });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

















// import { Request, Response } from "express";
// import { Twilio } from "twilio";
// import { prisma } from "../config/prisma";
// import { validateTwilioSignature } from "../middleware/twilioAuth";

// const twilio = new Twilio(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!);

// export const handleIncomingMessage = [
//   validateTwilioSignature,
//   async (req: Request, res: Response) => {
//     try {
//       const { From, Body, MediaUrl0 } = req.body;

//       // Find or create customer
//       const customer = await prisma.customer.upsert({
//         where: { phone: From },
//         create: { phone: From },
//         update: {},
//       });

//       // Detect merchant from product links
//       const productMatch = Body.match(/africonnect.com\/products\/([\w-]+)/);
//       const merchant = productMatch
//         ? await prisma.product
//             .findUnique({
//               where: { id: productMatch[1] },
//               select: { merchant: true },
//             })
//             .then((p) => p?.merchant)
//         : null;

//       if (!merchant) {
//         return twilioResponse(res, "Merchant not found");
//       }

//       // Store message
//       await prisma.message.create({
//         data: {
//           content: Body,
//           direction: "INBOUND",
//           merchantId: merchant.id,
//           customerId: customer.id,
//           productId: productMatch?.[1],
//           status: "DELIVERED",
//         },
//       });

//       // Auto-reply for businesses
//       if (merchant.whatsappAutoReply) {
//         await twilio.messages.create({
//           body: merchant.whatsappAutoReply,
//           from: `whatsapp:${process.env.TWILIO_NUMBER}`,
//           to: From,
//         });
//       }

//       twilioResponse(res, "Message processed");
//     } catch (error) {
//       console.error("[WhatsApp Error]", error);
//       twilioResponse(res, "Processing failed", 500);
//     }
//   },
// ];

// function twilioResponse(res: Response, message: string, status = 200) {
//   res.status(status).type("text/xml").send(`
//     <Response>
//       <Message>${message}</Message>
//     </Response>
//   `);
// }