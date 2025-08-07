// helper/mail/orders/shippedOrderMail.ts
import { queueMail } from "../../workers/mailQueue";
import { frontendUrl } from "../../../config";


export async function shippedOrderMail(
  to: string,
  buyerName: string,
  orderId: string
) {
  const subject = "🚚 Your Order Has Been Shipped – Pluggn";

  const trackingLink = `<a href="${frontendUrl}/track-order/${orderId}" style="color: #0b5ed7; font-weight: 500;">Track your order</a>`;

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 640px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
      <h2 style="color: #111827;">Hi ${buyerName},</h2>

      <p style="color: #374151; font-size: 16px;">🚚 Your order with ID <strong>${orderId}</strong> has been shipped!</p>

      <p style="color: #374151; font-size: 16px;">You can follow the delivery progress here:</p>

      <p>${trackingLink}</p>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="font-size: 15px; color: #374151;">Thank you for shopping with us 💚</p>

      <footer style="font-size: 13px; color: #6b7280; margin-top: 32px;">
        <p>Need help? Reach us at <a href="mailto:support@pluggn.com.ng" style="color: #0b5ed7;">support@pluggn.com.ng</a></p>
        <p style="margin-top: 10px;">This email was sent from <strong>orders@pluggn.com.ng</strong></p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 16px;">&copy; ${new Date().getFullYear()} Pluggn. All rights reserved.</p>
      </footer>
    </div>
  `;

       await queueMail({
             to,
             subject,
             html,
             senderKey: "orders",
             mailType: "shipped_order",
             priority: "normal",
        });
}
