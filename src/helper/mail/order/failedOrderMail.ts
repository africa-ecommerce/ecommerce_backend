// import { mail } from "../../../lib/mail";
// import { emailConfigs } from "../../../config";

import { capitalizeName } from "../../helperFunc";

// import { queueMail } from "../../workers/mailQueue";
//  const formattedName = capitalizeName(buyerName);

// const { orders } = emailConfigs;

// export async function failedOrderMail(to: string, buyerName: string) {
//   const subject = "⚠️Order Recieved – Manual Processing In Progress";

//   const html = `
//     <div style="font-family: 'Segoe UI', sans-serif; max-width: 640px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 10px; background-color: #fffbea;">
//       <h2 style="color: #b45309;">Hi ${buyerName},</h2>

//       <p style="color: #92400e; font-size: 16px;">
//         ⚠️ Your order didn’t go through automatically, but don't worry — we've received it!
//       </p>

//       <p style="color: #92400e; font-size: 16px;">
//         We're currently handling your order manually and will follow up shortly to complete the process.
//       </p>

//       <p style="color: #92400e; font-size: 16px;">
//         🛠️ This can happen sometimes due to connectivity issues, failed payments, or other temporary glitches.
//       </p>

//       <p style="color: #92400e; font-size: 16px;">
//         If you need immediate help or want to cancel the order, please don’t hesitate to reach out.
//       </p>

//       <div style="margin: 24px 0;">
//         <a href="mailto:support@pluggn.com.ng" style="display: inline-block; padding: 12px 18px; background-color: #d97706; color: white; border-radius: 8px; font-weight: 600; text-decoration: none;">
//           📩 Contact Support
//         </a>
//       </div>

//       <hr style="margin: 32px 0; border: none; border-top: 1px solid #fcd34d;" />

//       <h3 style="color: #b45309; font-size: 18px;">We're On It 💪</h3>
//       <p style="font-size: 16px; color: #78350f;">
//         Sit tight while we resolve things. We'll keep you updated.
//       </p>

//       <hr style="margin: 32px 0; border: none; border-top: 1px solid #fcd34d;" />

//       <footer style="font-size: 13px; color: #a16207;">
//         <p>If you need help, please reach out to <a href="mailto:support@pluggn.com.ng" style="color: #b45309;">support@pluggn.com.ng</a>.</p>
//         <p style="margin-top: 10px;">
//           This message was sent from <strong>noreply@pluggn.com.ng</strong> and this inbox is not monitored.
//         </p>
//         <p style="font-size: 11px; color: #854d0e; margin-top: 16px;">&copy; ${new Date().getFullYear()} Pluggn. All rights reserved.</p>
//       </footer>
//     </div>
//   `;

//      await queueMail({
//            to,
//            subject,
//            html,
//            senderKey: "orders",
          
//       });
// }
