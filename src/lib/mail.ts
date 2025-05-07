
// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_API_KEY);
// export const mail = async (
//   email: string,
//   subject: string,
//   html: string
// ) => {
//   // Configure your transporter using environment variables for production-grade security
 
   
//   await resend.emails.send({
//     from: "onboarding@resend.dev",
//     to: email,
//     subject: subject,
//     html: html,
//   });


  
// };


import nodemailer from "nodemailer";


// Create reusable transporter
let transporter: nodemailer.Transporter;

// Initialize the transporter (call this when your app starts)
const initializeTransporter = () => {
  // Option 1: Using Gmail (easy to set up but has limitations)
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "", // your Gmail address
      pass: process.env.EMAIL_PASSWORD || "", // your Gmail app password (not your regular password)
    },
  });

  return transporter;
};


// Get or initialize transporter
const getTransporter = () => {
  if (!transporter) {
    return initializeTransporter();
  }
  return transporter;
};

// Single recipient email
export const mail = async (
  email: string,
  subject: string,
  html: string
) => {
  const transport = getTransporter();
  
  try {
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || '"Your App" <your-app@example.com>',
      to: email,
      subject: subject,
      html: html,
    });
    
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};
