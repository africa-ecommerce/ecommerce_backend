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
  from: string; // can contain display name, e.g. `"Pluggn" <orders@pluggn.com.ng>`
  user: string; // must be identical to address in `from`
  pass: string;
};

const transporterPool: Record<string, Transporter> = {};

 function getTransporter(sender: MailSender): Transporter {
   if (!transporterPool[sender.user]) {
     transporterPool[sender.user] = nodemailer.createTransport({
       host: "smtp.zoho.com",
       port: 465,
       secure: true,
       pool: true,
      auth: {
      user: sender.user,
      pass: sender.pass,
    },
    connectionTimeout: 5000,  //Reduced from 10s
    socketTimeout: 10000,  //Reduced from 20s
    logger: false,  //Disable detailed logging
    debug: false,  //Disable debug mode
  });


     console.log(`🚀 SMTP transporter created for: ${sender.user}`);
   }

   return transporterPool[sender.user];
 }

export const mail = async (
  email: string,
  subject: string,
  html: string,
  sender: MailSender,
  replyTo?: string
) => {
  const transporter = getTransporter(sender);

  // Validate: `from` must include the correct format and match `user`
  const formattedFrom = `"Pluggn" <${sender.user}>`; // safer than sender.from
  const envelopeFrom = sender.user; // ensures SMTP compliance

  try {
    const info = await transporter.sendMail({
      from: formattedFrom,
      to: email,
      subject,
      html,
      replyTo,
      envelope: {
        from: envelopeFrom,
        to: email,
      },
    });

    console.log(
      `📨 Email sent → ${info.messageId} [from: ${formattedFrom} → to: ${email}]`
    );
    return info;
  } catch (error) {
    console.error(`❌ Email failed from: ${formattedFrom} →`, error);
    throw new Error("Failed to send email");
  }
};



// import nodemailer, { Transporter } from "nodemailer";

// type MailSender = {
//   from: string;
//   user: string;
//   pass: string;
// };

// // Don't use connection pooling - create fresh connections
// function createTransporter(sender: MailSender): Transporter {
//   return nodemailer.createTransport({
//     host: "smtp.zoho.com",
//     port: 465,
//     secure: true,
//     pool: false, // No pooling to avoid connection issues
//     auth: {
//       user: sender.user,
//       pass: sender.pass,
//     },
//     connectionTimeout: 5000, // Reduced from 10s
//     socketTimeout: 10000, // Reduced from 20s
//     logger: false, // Disable detailed logging
//     debug: false, // Disable debug mode
//   });
// }

// // SIMPLIFIED MAIL FUNCTION
// export const mail = async (
//   email: string,
//   subject: string,
//   html: string,
//   sender: MailSender,
//   replyTo?: string
// ) => {
//   const transporter = createTransporter(sender);
//   const formattedFrom = `"Pluggn" <${sender.user}>`;

//   try {
//     const info = await transporter.sendMail({
//       from: formattedFrom,
//       to: email,
//       subject,
//       html,
//       replyTo,
//     });

//     console.log(`📨 Email sent: ${info.messageId}`);
//     return info;
//   } catch (error: any) {
//     console.error(`❌ Email failed:`, error.message);
//     throw error;
//   } finally {
//     // Always close the connection
//     transporter.close();
//   }
// };