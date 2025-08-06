import {  frontendUrl } from "../../../config";
import { queueMail, } from "../../workers/mailQueue";

export async function successOrderMail(
  to: string,
  buyerName: string,
  paymentMethod: string,
  plugBusinessName: string,
  plugStoreUrl: string | null,
  orderNumber: string
) {
  const subject = "✅ Your Order Has Been Placed – Pluggn";

  const isCash = paymentMethod === "cash";

  const trackingLink = `<a href="${frontendUrl}/track-order/${orderNumber}" style="color: #0b5ed7; font-weight: 500;">Click here to track your order</a>`;

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 640px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
      <h2 style="color: #111827;">Hi ${buyerName},</h2>

      <p style="color: #374151; font-size: 16px;">✅ Your order has been placed successfully!</p>

      <p style="color: #374151; font-size: 16px;">
        We’re currently <strong>handpicking your items</strong> and preparing them for delivery. You’ll be notified when it’s on the way.
      </p>

      ${
        isCash
          ? `
        <p style="color: #374151; font-size: 16px;">
          💸 You selected <strong>Pay on Delivery</strong>. Kindly prepare to transfer payment to the account below <strong>once our delivery agent confirms delivery with us</strong>:
        </p>
        <div style="margin: 16px 0; padding: 12px; border: 1px solid #ddd; border-radius: 8px; background-color: #f1f5f9;">
          <p style="margin: 4px 0;"><strong>Account Name:</strong> Pluggn Logistics</p>
          <p style="margin: 4px 0;"><strong>Bank:</strong> Wema Bank</p>
          <p style="margin: 4px 0;"><strong>Account Number:</strong> 1234567890</p>
        </div>
      `
          : `
        <p style="color: #374151; font-size: 16px;">
          💳 Your payment has been received successfully. We’re processing your order.
        </p>
      `
      }

      ${
        plugStoreUrl
          ? `
        <p style="color: #374151; font-size: 16px;">
          📦 Want to follow your order’s journey?<br />
          ${trackingLink}
        </p>
      `
          : ""
      }

    
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

  // await sendQueuedMail({
  //   to,
  //   subject,
  //   html,
  //   senderKey: "orders", // key from emailConfigs
  // });


  await queueMail(
    {
      to,
      subject,
      html,
      senderKey: "orders",
      mailType: "general",
      priority: "normal",
    }
  );
}
