import { mail } from "../../../lib/mail";
import { emailConfigs } from "../../../config";

const { noreply } = emailConfigs;

export async function withdrawalVerificationMail(email: string, token: string) {
  const subject = "Withdrawal Verification Code – Pluggn";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #333;">Confirm Your Withdrawal</h2>

      <p style="color: #555;">
        You're receiving this email because a withdrawal was requested on your <strong>Pluggn</strong> account.
        Use the verification code below to complete the process:
      </p>

      <div style="font-size: 32px; font-weight: bold; color: #007bff; text-align: center; margin: 24px 0;">
        ${token}
      </div>

      <p style="color: #555;">This code will expire in <strong>5 minutes</strong>. For your security, do not share it with anyone.</p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

      <p style="color: #999; font-size: 13px;">
        If you did not initiate this withdrawal, please contact us immediately at 
        <a href="mailto:support@pluggn.com.ng">support@pluggn.com.ng</a>.
      </p>

      <p style="color: #999; font-size: 12px;">
        This message was sent from <strong>noreply@pluggn.com.ng</strong>. This inbox is not monitored.
        If you need assistance, please contact us at <a href="mailto:support@pluggn.com.ng">support@pluggn.com.ng</a>.
      </p>

      <p style="color: #ccc; font-size: 11px;">&copy; ${new Date().getFullYear()} Pluggn. All rights reserved.</p>
    </div>
  `;

  await mail(email, subject, html, noreply);
}
