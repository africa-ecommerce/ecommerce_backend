import { mail } from "../../../lib/mail";
import { emailConfigs } from "../../../config";

export const otpMail = async (email: string, otp: string) => {
  const subject = "Your Admin OTP – Pluggn";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #333;">Your One-Time Password</h2>
      <p style="color: #555;">Use the following OTP to login:</p>
      <div style="text-align: center; margin: 24px 0;">
        <p style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</p>
      </div>
      <p style="color: #555;">This OTP will expire in <strong>5 minutes</strong>.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
    </div>
  `;

  await mail(email, subject, html, emailConfigs.devTeam);
};
