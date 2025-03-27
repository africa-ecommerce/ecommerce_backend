// src/services/whatsapp.message.service.ts
import { prisma } from "../config";

export interface WhatsAppMessageInput {
  merchantId: string;
  sender: string;
  content: string;
  mediaUrl?: string;
}

// Save a new WhatsApp message
export const saveWhatsAppMessage = async (data: WhatsAppMessageInput) => {
  return await prisma.whatsAppMessage.create({
    data,
  });
};

// Retrieve all messages for a given merchant, sorted by newest first
export const getMerchantWhatsAppMessages = async (merchantId: string) => {
  return await prisma.whatsAppMessage.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });
};















// import { Request, Response } from "express";
// import { prisma } from "../config/prisma";

// export const getConversations = async (req: Request, res: Response) => {
//   const conversations = await prisma.customer.findMany({
//     where: {
//       messages: { some: { merchantId: req.merchant.id } },
//     },
//     include: {
//       messages: {
//         orderBy: { timestamp: "desc" },
//         take: 1,
//       },
//     },
//   });

//   res.json(
//     conversations.map((c) => ({
//       id: c.id,
//       phone: c.phone,
//       lastMessage: c.messages[0]?.content,
//       unread: c._count?.messages - c._count?.readMessages,
//     }))
//   );
// };

// export const sendReply = async (req: Request, res: Response) => {
//   const { customerId, content } = req.body;

//   const message = await prisma.message.create({
//     data: {
//       content,
//       direction: "OUTBOUND",
//       status: "SENT",
//       merchantId: req.merchant.id,
//       customerId,
//     },
//   });

//   // Send via Twilio
//   const customer = await prisma.customer.findUnique({
//     where: { id: customerId },
//   });

//   await this.twilio.messages.create({
//     body: content,
//     from: `whatsapp:${process.env.TWILIO_NUMBER}`,
//     to: `whatsapp:${customer?.phone}`,
//   });

//   res.json(message);
// };