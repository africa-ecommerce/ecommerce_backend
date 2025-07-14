import nodemailer from "nodemailer";

type MailSender = {
  from: string; 
  user: string; 
  pass: string; 
};

export const mail = async (
  email: string,
  subject: string,
  html: string,
  sender: MailSender,
  replyTo?: string
) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: sender.user,
      pass: sender.pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: sender.from,
      to: email,
      subject,
      html,
      replyTo,
    });

    console.log(`Email sent from ${sender.from} →`, info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};
