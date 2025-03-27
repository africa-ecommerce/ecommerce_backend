// src/services/qrcode.service.ts
import QRCode from "qrcode";

export const generateStoreQRCode = async (
  storeUrl: string
): Promise<string> => {
  try {
    // Generate a QR code as a data URL (base64 encoded image)

    // // Add branding overlay
    // const canvas = createCanvas(300, 350);
    // const ctx = canvas.getContext("2d");
    // ctx.fillStyle = "#FFFFFF";
    // ctx.fillRect(0, 0, 300, 350);

    // // Draw QR + logo
    // const qrImg = await loadImage(qr);
    // ctx.drawImage(qrImg, 50, 50, 200, 200);

    return await QRCode.toDataURL(storeUrl);
  } catch (error: any) {
    throw new Error("QR code generation failed");
  }
};















// import { createCanvas } from "canvas";
// import QRCode from "qrcode";
// import { sign } from "jsonwebtoken";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export class QRManager {
//   async generateSecureQR(targetType: "product" | "store", targetId: string) {
//     // JWT payload to prevent tampering
//     const token = sign(
//       { targetType, targetId, ts: Date.now() },
//       process.env.QR_SECRET!,
//       { expiresIn: "30d" }
//     );

//     const url = `https://africonnect.com/qr/${token}`;
//     const qr = await QRCode.toDataURL(url);

//     // Add anti-phishing measures
//     const canvas = createCanvas(400, 450);
//     const ctx = canvas.getContext("2d");
//     ctx.fillStyle = "#ffffff";
//     ctx.fillRect(0, 0, 400, 450);

//     // Embed security pattern
//     ctx.beginPath();
//     ctx.arc(200, 200, 50, 0, Math.PI * 2);
//     ctx.fillStyle = "#4f46e5";
//     ctx.fill();

//     return {
//       qrImage: canvas.toDataURL(),
//       trackingId: await this.createTrackingRecord(targetId, token),
//     };
//   }

//   async scanQR(token: string) {
//     try {
//       const payload = verify(token, process.env.QR_SECRET!);
//       const product = await prisma.product.findUnique({
//         where: { id: payload.targetId },
//         include: { merchant: true },
//       });

//       await prisma.qrScan.create({
//         data: {
//           productId: payload.targetId,
//           merchantId: product.merchantId,
//           location: payload.location, // From GPS data
//         },
//       });

//       return product;
//     } catch (e) {
//       throw new Error("Invalid or expired QR code");
//     }
//   }
// }
