import {  frontendUrl } from "../../../config";
import { queueMail, } from "../../workers/mailQueue";

export async function successOrderMail(
  to: string,
  buyerName: string,
  plugBusinessName: string,
  plugStoreUrl: string | null,
  orderNumber: string,
  deliveryType: string,
  terminalAddress: string | null
) {


  const subject = "✅ Your Order Has Been Placed – Pluggn";

  const trackingLink = `<a href="${frontendUrl}/track-order/${orderNumber}" style="color: #0b5ed7; font-weight: 500;">Click here to track your order</a>`;

  // Conditional pickup section for terminal deliveries
  const terminalInfo =
    deliveryType === "terminal" && terminalAddress
      ? `
        <div style="margin: 20px 0; padding: 16px; border-radius: 8px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
          <h3 style="color: #111827; font-size: 16px; margin: 0 0 10px 0;">📦 Pickup Instructions</h3>
          <p style="font-size: 14px; color: #374151; margin: 0 0 6px 0;">
            Your order will be available for pickup at the following terminal:
          </p>
          <p style="font-size: 14px; color: #111827; font-weight: bold; margin: 0 0 8px 0;">
            ${terminalAddress}
          </p>
          <p style="font-size: 14px; color: #374151; margin: 0;">
            Please tender your Pluggn Order Number <strong>#${orderNumber}</strong> when picking up from <strong>GIG Logistics</strong>.
          </p>
        </div>
      `
      : "";

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 640px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
      <h2 style="color: #111827;">Hi ${buyerName},</h2>

      <p style="color: #374151; font-size: 16px;">✅ Your order has been placed successfully!</p>

      <p style="color: #374151; font-size: 16px;">
        We’re currently <strong>handpicking your items</strong> and preparing them for delivery. You’ll be notified when it’s on the way.
      </p>

      <p style="color: #374151; font-size: 16px;">
        💳 Your payment has been received successfully. We’re processing your order.
      </p>

      ${
        trackingLink
          ? `<p style="margin-top: 12px; font-size: 16px;">${trackingLink}</p>`
          : ""
      }

      ${terminalInfo}

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <h3 style="color: #111827; font-size: 18px;">Thank You for Shopping with Us 💚</h3>
      <p style="font-size: 16px; color: #374151;">
        We appreciate your order with <strong>${plugBusinessName}</strong> via Pluggn.
      </p>

      ${
        plugStoreUrl
          ? `
        <p style="font-size: 16px; color: #374151;">
          🌟 Discover more amazing items: <a href="${plugStoreUrl}" style="color: #0b5ed7; font-weight: 500;">Visit the store</a>
        </p>
      `
          : ""
      }

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <footer style="font-size: 13px; color: #6b7280;">
        <p>If you need help with your order, please contact your seller or reach out to us at <a href="mailto:support@pluggn.com.ng" style="color: #0b5ed7;">support@pluggn.com.ng</a>.</p>
        <p style="margin-top: 10px;">
          This message was sent from <strong>orders@pluggn.com.ng</strong> and this inbox is not monitored.
        </p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 16px;">&copy; ${new Date().getFullYear()} Pluggn. All rights reserved.</p>
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
