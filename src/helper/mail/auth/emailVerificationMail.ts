import { frontendUrl } from "../../../config";
import { mail } from "../../../lib/mail";
import { emailConfigs } from "../../../config";

export const emailVerificationMail = async (email: string, token: string) => {
  const subject = "Verify Your Email Address – Pluggn";
  const url = `${frontendUrl}/auth/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; font-size: 13px;">
      <h2 style="color: #333; font-size: 18px;">Verify Your Email Address</h2>

      <p style="color: #555; font-size: 13px;">
        Thank you for signing up with <strong>Pluggn</strong>!
        To complete your registration, please confirm your email address by clicking the button below:
      </p>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${url}" style="background-color: #28a745; color: #ffffff; padding: 10px 16px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block; font-size: 13px;">
          Verify Email
        </a>
      </div>

      <p style="color: #555; font-size: 13px;">
        If the button above doesn't work, copy and paste the link below into your browser:
      </p>

      <p style="word-wrap: break-word; color: #007bff; font-size: 12px;">
        <a href="${url}" style="color: #007bff; font-size: 12px;">${url}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

      <p style="color: #999; font-size: 12px;">
        If you did not create an account with Pluggn, you can safely ignore this email.
      </p>

      <p style="color: #999; font-size: 11px;">
        This message was sent from <strong>noreply@pluggn.com.ng</strong>. This inbox is not monitored.
        If you need assistance, please contact us at <a href="mailto:support@pluggn.com.ng">support@pluggn.com.ng</a>.
      </p>

      <p style="color: #ccc; font-size: 10px;">&copy; ${new Date().getFullYear()} Pluggn. All rights reserved.</p>
    </div>
  `;

  await mail(email, subject, html, emailConfigs.noreply);
};
