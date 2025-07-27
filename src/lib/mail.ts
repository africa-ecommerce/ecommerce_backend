// import nodemailer from "nodemailer";

// type MailSender = {
//   from: string; 
//   user: string; 
//   pass: string; 
// };

// export const mail = async (
//   email: string,
//   subject: string,
//   html: string,
//   sender: MailSender,
//   replyTo?: string
// ) => {
//   const transporter = nodemailer.createTransport({
//     host: "smtp.zoho.com",
//     port: 465,
//     secure: true,
//     pool: true, 
//     maxConnections: 3,
//     maxMessages: 50,
//     auth: {
//       user: sender.user,
//       pass: sender.pass,
//     },
//   });

//   try {
//     const info = await transporter.sendMail({
//       from: sender.from,
//       to: email,
//       subject,
//       html,
//       replyTo,
//     });

//     console.log(`Email sent from ${sender.from} →`, info.messageId);
//     return info;
//   } catch (error) {
//     console.error("Error sending email:", error);
//     throw new Error("Failed to send email");
//   }
// };


import nodemailer, { Transporter } from "nodemailer";

type MailSender = {
  from: string;
  user: string;
  pass: string;
};

let transporter: Transporter | null = null;

function getTransporter(sender: MailSender) {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      auth: {
        user: sender.user,
        pass: sender.pass,
      },
      connectionTimeout: 10_000,
      socketTimeout: 20_000,
    });
    console.log("SMTP transporter created with pooling.");
  }
  return transporter;
}

export const mail = async (
  email: string,
  subject: string,
  html: string,
  sender: MailSender,
  replyTo?: string
) => {
  const t = getTransporter(sender);

  try {
    const info = await t.sendMail({
      from: sender.from,
      to: email,
      subject,
      html,
      replyTo,
    });

    console.log(`Email sent from ${sender.from} → ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};
