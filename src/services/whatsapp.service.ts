// src/services/whatsapp.service.ts
import { createProduct } from "./product.service";

// Simulate processing a WhatsApp message containing product details
export const processWhatsAppProduct = async (
  merchantId: string,
  message: {
    photoUrl: string;
    details: {
      title: string;
      description: string;
      price: number;
      inventory: number;
    };
  }
) => {
  // In a production system, you’d download the photo, process it, etc.
  // For now, create a product record using the provided details.
  const { title, description, price, inventory } = message.details;
  return await createProduct(merchantId, title, description, price, inventory);
};











// import { prisma } from "../config/prisma";
// import { Twilio } from "twilio";

// export class WhatsAppSync {
//   private twilio = new Twilio(
//     process.env.TWILIO_SID!,
//     process.env.TWILIO_TOKEN!
//   );

//   async syncHistory(merchantId: string) {
//     const messages = await this.twilio.messages.list({
//       to: `whatsapp:${process.env.TWILIO_NUMBER}`,
//       limit: 1000,
//     });

//     await prisma.$transaction(
//       messages.map((msg) =>
//         prisma.message.upsert({
//           where: { sid: msg.sid },
//           create: this.transformMessage(msg, merchantId),
//           update: {},
//         })
//       )
//     );
//   }

//   private transformMessage(msg: any, merchantId: string) {
//     return {
//       sid: msg.sid,
//       content: msg.body,
//       direction: msg.direction === "inbound" ? "INBOUND" : "OUTBOUND",
//       status: this.mapStatus(msg.status),
//       timestamp: new Date(msg.dateCreated),
//       merchantId,
//       customer: {
//         connectOrCreate: {
//           where: { phone: msg.from },
//           create: { phone: msg.from },
//         },
//       },
//     };
//   }
// }