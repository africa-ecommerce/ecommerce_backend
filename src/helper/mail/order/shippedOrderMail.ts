// helper/mail/orders/shippedOrderMail.ts
import { queueMail } from "../../workers/mailQueue";
import { frontendUrl } from "../../../config";
import { capitalizeName } from "../../helperFunc";

export async function shippedOrderMail(
  to: string,
  buyerName: string,
  orderId: string,
  deliveryType: string,
  terminalAddress: string | null
) {
  const subject = "🚚 Your Order Has Been Shipped – Pluggn";

  const trackingLink = `<a href="${frontendUrl}/track-order/${orderId}" style="color: #0b5ed7; font-weight: 500; font-size: 12px;">Track your order</a>`;

  // Conditional pickup section for terminal deliveries
  const terminalInfo =
    deliveryType === "terminal" && terminalAddress
      ? `
        <div style="margin: 20px 0; padding: 12px; border-radius: 6px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
          <h3 style="color: #111827; font-size: 15px; margin: 0 0 8px 0;">Pickup Instructions</h3>
          <p style="font-size: 13px; color: #374151; margin: 0 0 6px 0;">
            Once your package arrives, you can pick it up at the following terminal:
          </p>
          <p style="font-size: 13px; color: #111827; font-weight: bold; margin: 0 0 8px 0;">
            ${terminalAddress}
          </p>
          <p style="font-size: 13px; color: #374151; margin: 0;">
            Please tender your Pluggn Order Number <strong>#${orderId}</strong> when picking up from <strong>GIG Logistics</strong>.
          </p>
        </div>
      `
      : "";

       const formattedName = capitalizeName(buyerName);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; font-size: 13px;">
      <h2 style="color: #111827; font-size: 18px;">Hi ${formattedName},</h2>

      <p style="color: #374151; font-size: 13px;">🚚 Your order with ID <strong>${orderId}</strong> has been shipped!</p>

      <p style="color: #374151; font-size: 13px;">You can follow the delivery progress here:</p>

      <p style="margin: 8px 0;">${trackingLink}</p>

      ${terminalInfo}

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="font-size: 13px; color: #374151;">Thank you for shopping with us 💚</p>

      <footer style="font-size: 11px; color: #6b7280; margin-top: 20px;">
        <p>Need help? Reach us at <a href="mailto:support@pluggn.com.ng" style="color: #0b5ed7; font-size: 12px;">support@pluggn.com.ng</a></p>
        <p style="margin-top: 8px;">This email was sent from <strong>orders@pluggn.com.ng</strong></p>
        <p style="font-size: 10px; color: #9ca3af; margin-top: 12px;">&copy; ${new Date().getFullYear()} Pluggn. All rights reserved.</p>
      </footer>
    </div>
  `;

  await queueMail({
    to,
    subject,
    html,
    senderKey: "orders",
  });
}
