import { frontendUrl } from "../config";
import { mail } from "../lib/mail";

// Helper function to send a reset password email
export const sendResetPasswordMail = async (email: string, token: string) => {
  const subject = "Reset Your Password";
  const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p style="color: #555;">We received a request to reset your password. If you did not request this, you can ignore this email.</p>
            <p style="color: #555;">Otherwise, click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="${resetUrl}" style="background-color: #007bff; color: #ffffff; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
            </div>

            <p style="color: #555;">This link will expire in <strong>15 minutes</strong> for security reasons.</p>
            <p style="color: #555;">If the button above doesn’t work, copy and paste the following URL into your browser:</p>
            <p style="word-wrap: break-word; color: #007bff;">
                <a href="${resetUrl}" style="color: #007bff;">${resetUrl}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px;">If you did not request this password reset, please ignore this email or contact support.</p>
            <p style="color: #999; font-size: 12px;">&copy; ${new Date().getFullYear()} Your Company Name</p>
        </div>
    `;

  await mail(email, subject, html);
};
