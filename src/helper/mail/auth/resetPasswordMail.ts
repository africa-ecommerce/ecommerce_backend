import { emailConfigs, frontendUrl } from "../../../config";
import { mail } from "../../../lib/mail";


export const resetPasswordMail = async (email: string, token: string) => {
  const subject = "Reset Your Password – Pluggn";
  const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
    <h2 style="color: #333;">Reset Your Password </h2>

    <p style="color: #555;">Hello,</p>
    <p style="color: #555;">
      We received a request to reset the password for your Pluggn account associated with this email address.
      If you made this request, you can reset your password by clicking the button below:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" style="background-color: #007bff; color: #ffffff; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
    </div>

    <p style="color: #555;">
      For security reasons, this link will expire in <strong>15 minutes</strong>.
    </p>

    <p style="color: #555;">
      If the button above doesn't work, you can also copy and paste the link below into your browser:
    </p>

    <p style="word-wrap: break-word; color: #007bff;">
      <a href="${resetUrl}" style="color: #007bff;">${resetUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

    <p style="color: #999; font-size: 13px;">
      If you did not request a password reset, no further action is required.
      However, if you believe your account has been compromised, please contact our support team immediately.
    </p>

    <p style="color: #999; font-size: 12px;">
     This message was sent from <strong>noreply@pluggn.com.ng</strong>. This inbox is not monitored.
        If you need assistance, please contact us at <a href="mailto:support@pluggn.com.ng">support@pluggn.com.ng</a>.
    </p>

    <p style="color: #ccc; font-size: 11px;">&copy; ${new Date().getFullYear()} Pluggn. All rights reserved.</p>
  </div>
`;


  await mail(email, subject, html, emailConfigs.noreply);
};
