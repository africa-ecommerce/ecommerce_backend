
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
export const mail = async (
  email: string,
  subject: string,
  html: string
) => {
  // Configure your transporter using environment variables for production-grade security
 
   
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: subject,
    html: html,
  });


  
};
