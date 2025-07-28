import { mail } from "../../../lib/mail";
import { emailConfigs } from "../../../config";


export async function notifyOrderMail() {
    const { noreply } = emailConfigs;

    const html = `
  <div style="font-family: Arial, sans-serif; background: #fefefe; padding: 20px; border: 1px solid #ccc; border-radius: 6px;">
    <h2 style="color: #2e7d32;">🛒 New Order Notification</h2>
    <p style="font-size: 15px; color: #333;">
      A new order has been placed successfully on your store.  
      Please log in to the admin dashboard to view the details.
    </p>
    <p style="margin-top: 20px; font-size: 14px; color: #555;">
      — Pluggn System
    </p>
  </div>
`;

    await mail("admin@pluggn.com.ng", "New Order Placed", html, noreply);
}
