// src/services/payment.service.ts
import axios from "axios";

export const initiateFlutterwavePayment = async (
  orderId: string,
  amount: number,
  customerEmail: string
) => {
  // Stub: In a real-world scenario, integrate with Flutterwave's API.
  try {
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: orderId,
        amount,
        currency: "NGN",
        customer: { email: customerEmail },
        redirect_url: "https://yourdomain.com/payment/callback",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error("Payment initiation failed");
  }
};







// export const initPayment = async (request: PaymentRequest) => {
//   try {
//     const response = await axios.post(
//       "https://api.flutterwave.com/v3/payments",
//       {
//         tx_ref: request.tx_ref,
//         amount: String(request.amount),
//         currency: request.currency,
//         redirect_url: `${process.env.BASE_URL}/payments/callback`,
//         customer: {
//           email: request.email,
//         },
//         customizations: {
//           title: "AfriConnect Payment",
//           logo: "https://africonnect.com/logo.png",
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${FLW_SECRET_KEY}`,
//         },
//       }
//     );

//     await prisma.payment.create({
//       data: {
//         reference: request.tx_ref,
//         amount: request.amount,
//         status: "INITIATED",
//         merchantId: request.merchantId,
//         flwTransactionId: response.data.data.id,
//       },
//     });

//     return response.data.data.link;
//   } catch (error) {
//     console.error("[Payment Init Error]", error.response?.data);
//     throw new Error("Payment initialization failed");
//   }
// };

// export const verifyWebhook = (req: Request) => {
//   const hash = crypto
//     .createHash("sha256")
//     .update(FLW_WEBHOOK_HASH + req.body.data.id + req.body.data.tx_ref)
//     .digest("hex");

//   if (hash !== req.headers["verif-hash"]) {
//     throw new Error("Invalid webhook signature");
//   }
// };

// export const handlePaymentWebhook = async (req: Request) => {
//   try {
//     verifyWebhook(req);

//     const { status, tx_ref, flw_ref } = req.body.data;
//     const payment = await prisma.payment.update({
//       where: { reference: tx_ref },
//       data: {
//         status: status === "successful" ? "COMPLETED" : "FAILED",
//         flwReference: flw_ref,
//         completedAt: new Date(),
//       },
//       include: { order: true },
//     });

//     if (status === "successful") {
//       await prisma.$transaction([
//         prisma.order.update({
//           where: { id: payment.orderId },
//           data: { status: "PAID" },
//         }),
//         ...payment.order.items.map((item) =>
//           prisma.product.update({
//             where: { id: item.productId },
//             data: { inventory: { decrement: item.quantity } },
//           })
//         ),
//       ]);
//     }

//     return true;
//   } catch (error) {
//     console.error("[Webhook Error]", error);
//     throw error;
//   }
// };