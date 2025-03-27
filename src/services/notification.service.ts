// src/services/notification.service.ts
export const sendNotification = async (merchantId: string, message: string) => {
  // For demonstration, log the notification. In a real-world scenario, integrate with an email/SMS service.
  console.log(`Notification for Merchant ${merchantId}: ${message}`);
  return true;
};

// src/services/notification.service.ts
export const sendInAppNotification = async (merchantId: string, message: string) => {
  // In a real implementation, store notifications in a DB or push via websockets.
  console.log(`In-App Notification for Merchant ${merchantId}: ${message}`);
  return true;
};

export const sendEmailNotification = async (email: string, subject: string, message: string) => {
  // Stub for sending email. Replace with integration with an email service like SendGrid, Mailgun, etc.
  console.log(`Email sent to ${email}: ${subject} - ${message}`);
  return true;
};

export const sendSMSNotification = async (phone: string, message: string) => {
  // Stub for SMS sending. Replace with an SMS API (e.g., Twilio).
  console.log(`SMS sent to ${phone}: ${message}`);
  return true;
};






// import { Twilio } from "twilio";
// import { PrismaClient } from "@prisma/client";
// import { sendSMS } from "./sms";

// const prisma = new PrismaClient();
// const twilio = new Twilio(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!);

// export const notifyOrderUpdate = async (orderId: string) => {
//   const order = await prisma.order.findUnique({
//     where: { id: orderId },
//     include: { merchant: true, customer: true },
//   });

//   const templates = {
//     PAID: `📦 Order #${orderId} confirmed! Your items will be delivered soon.`,
//     DELIVERED: `✅ Order #${orderId} delivered! Thank you for choosing ${order.merchant.businessName}`,
//     FAILED: `⚠️ Payment failed for order #${orderId}. Please retry: ${process.env.BASE_URL}/orders/${orderId}/pay`,
//   };

//   if (order.customer?.phone) {
//     await sendSMS(order.customer.phone, templates[order.status]);
//   }

//   // WhatsApp notification for business users
//   if (order.merchant.whatsappEnabled) {
//     await twilio.messages.create({
//       body: `🛒 New order update: ${order.status}\nOrder ID: ${orderId}`,
//       from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
//       to: `whatsapp:${order.merchant.phone}`,
//     });
//   }
// };

// export const lowStockAlert = async (productId: string) => {
//   const product = await prisma.product.findUnique({
//     where: { id: productId },
//     include: { merchant: true },
//   });

//   if (product.inventory < 10) {
//     await twilio.messages.create({
//       body: `⚠️ Low stock alert: ${product.name} (${product.inventory} remaining)`,
//       from: process.env.TWILIO_NUMBER,
//       to: product.merchant.phone,
//     });
//   }
// };