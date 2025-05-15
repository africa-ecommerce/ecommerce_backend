import { frontendUrl } from "../config";
import { mail } from "../lib/mail";

// Helper function to send a verification email
export const sendVerificationMail = async (email: string, token: string) => {
  const subject = "Verify Your Email Address";
  // Build the URL with token and source (callback) parameter.
  const url = `${frontendUrl}/auth/verify-email?token=${token}`;

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Verify Your Email</h2>
            <p style="color: #555;">Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="${url}" style="background-color: #28a745; color: #ffffff; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
                    Verify Email
                </a>
            </div>

            <p style="color: #555;">If the button above doesn’t work, copy and paste the following URL into your browser:</p>
            <p style="word-wrap: break-word; color: #007bff;">
                <a href="${url}" style="color: #007bff;">${url}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px;">If you did not sign up for an account, please ignore this email.</p>
            <p style="color: #999; font-size: 12px;">&copy; ${new Date().getFullYear()} Your Company Name</p>
        </div>
    `;

  await mail(email, subject, html);
};
