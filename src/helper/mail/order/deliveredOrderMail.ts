import { mail } from "../../../lib/mail";
import { emailConfigs, frontendUrl } from "../../../config";

const { orders } = emailConfigs;

export async function deliveredOrderMail(
  to: string,
  buyerName: string,
  orderId: string
) {
  const subject = "📦 Your Order Has Been Delivered – Pluggn";


  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 640px; margin: auto; padding: 24px; border-radius: 12px; background-color: #ffffff; border: 1px solid #e5e7eb;">
      <h2 style="color: #111827;">Hi ${buyerName},</h2>

      <p style="font-size: 16px; color: #374151;">
        Thank you for shopping with us on Pluggn. We're pleased to inform you that your order <strong>#${orderId}</strong> has been <strong style="color: #10b981;">successfully delivered</strong>.
      </p>

      <p style="font-size: 16px; color: #374151;">
        If you have any questions or concerns regarding your order, our support team is available and ready to assist you.
      </p>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <h3 style="color: #111827; font-size: 18px;">Need Help?</h3>
       <p style="font-size: 15px; color: #374151;">
        Want to return an item? Returns are accepted within <strong>3 days of delivery</strong>. Please email our support team with the subject line <strong>"Return Order Item"</strong>, and include your order ID and the item details.
       </p>

      <p style="font-size: 15px; color: #374151;">
        📩 <a href="mailto:support@pluggn.com.ng?subject=Return Order Item" style="color: #0b5ed7;">support@pluggn.com.ng</a>
      </p>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <footer style="font-size: 12px; color: #9ca3af;">
        <p>This message was sent from <strong>orders@pluggn.com.ng</strong> and this inbox is not monitored.</p>
        <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} Pluggn. All rights reserved.</p>
      </footer>
    </div>
  `;

  await mail(to, subject, html, orders);
}
