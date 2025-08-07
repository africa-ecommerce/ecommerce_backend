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
import { emailConfigs } from "../config";

type MailSender = {
  from: string; // can contain display name, e.g. `"Pluggn" <orders@pluggn.com.ng>`
  user: string; // must be identical to address in `from`
  pass: string;
};

const transporterPool: Record<string, Transporter> = {};

//  function getTransporter(sender: MailSender): Transporter {
//    if (!transporterPool[sender.user]) {
//      transporterPool[sender.user] = nodemailer.createTransport({
//        host: "smtp.zoho.com",
//        port: 465,
//        secure: true,
//        pool: true,
//       auth: {
//       user: sender.user,
//       pass: sender.pass,
//     },
//     connectionTimeout: 5000,  //Reduced from 10s
//     socketTimeout: 10000,  //Reduced from 20s
//     logger: false,  //Disable detailed logging
//     debug: false,  //Disable debug mode
//   });


//      console.log(`🚀 SMTP transporter created for: ${sender.user}`);
//    }

//    return transporterPool[sender.user];
//  }

// export const mail = async (
//   email: string,
//   subject: string,
//   html: string,
//   sender: MailSender,
//   replyTo?: string
// ) => {
//   const transporter = getTransporter(sender);

//   // Validate: `from` must include the correct format and match `user`
//   const formattedFrom = `"Pluggn" <${sender.user}>`; // safer than sender.from
//   const envelopeFrom = sender.user; // ensures SMTP compliance

//   try {
//     const info = await transporter.sendMail({
//       from: formattedFrom,
//       to: email,
//       subject,
//       html,
//       replyTo,
//       envelope: {
//         from: envelopeFrom,
//         to: email,
//       },
//     });

//     console.log(
//       `📨 Email sent → ${info.messageId} [from: ${formattedFrom} → to: ${email}]`
//     );
//     return info;
//   } catch (error) {
//     console.error(`❌ Email failed from: ${formattedFrom} →`, error);
//     throw new Error("Failed to send email");
//   }
// };



// const transporterPool: Record<string, Transporter> = {};
const initializationStatus: Record<string, boolean> = {};

// ========================================
// TRANSPORTER INITIALIZATION FUNCTION
// ========================================

function createTransporter(sender: MailSender): Transporter {
  return nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
      user: sender.user,
      pass: sender.pass,
    },
    connectionTimeout: 8000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
    // Add retry configuration
    rateLimit: 14, // Max 14 emails per second
    rateDelta: 1000, // Per 1 second
  });
}

// ========================================
// PRE-INITIALIZE ALL TRANSPORTERS
// Call this during app startup
// ========================================

export async function initializeMailTransporters(): Promise<void> {
  console.log("🚀 Initializing mail transporters...");

  const initPromises = Object.entries(emailConfigs).map(
    async ([key, config]) => {
      try {
        console.log(`📧 Initializing transporter for: ${config.user}`);

        const transporter = createTransporter(config);

        // Verify the connection and warm it up
        await transporter.verify();

        // Store in pool
        transporterPool[config.user] = transporter;
        initializationStatus[config.user] = true;

        console.log(`✅ Transporter ready for: ${config.user}`);
      } catch (error) {
        console.error(
          `❌ Failed to initialize transporter for ${config.user}:`,
          error
        );
        initializationStatus[config.user] = false;
      }
    }
  );

  await Promise.allSettled(initPromises);

  const readyCount = Object.values(initializationStatus).filter(Boolean).length;
  const totalCount = Object.keys(emailConfigs).length;

  console.log(
    `📊 Mail transporters initialized: ${readyCount}/${totalCount} ready`
  );
}

// ========================================
// GET TRANSPORTER (Now instant!)
// ========================================

function getTransporter(sender: MailSender): Transporter {
  // Check if we have a pre-initialized transporter
  if (transporterPool[sender.user]) {
    return transporterPool[sender.user];
  }

  // Fallback: create on-demand (should rarely happen after initialization)
  console.log(`⚠️ Creating transporter on-demand for: ${sender.user}`);
  const transporter = createTransporter(sender);
  transporterPool[sender.user] = transporter;
  return transporter;
}

// ========================================
// OPTIMIZED MAIL FUNCTION
// ========================================

export const mail = async (
  email: string,
  subject: string,
  html: string,
  sender: MailSender,
  replyTo?: string
) => {
  // Get pre-initialized transporter (instant!)
  const transporter = getTransporter(sender);
  const formattedFrom = `"Pluggn" <${sender.user}>`;

  try {
    const info = await transporter.sendMail({
      from: formattedFrom,
      to: email,
      subject,
      html,
      replyTo,
      envelope: {
        from: sender.user,
        to: email,
      },
    });

    console.log(`📨 Email sent: ${info.messageId} [${sender.user} → ${email}]`);
    return info;
  } catch (error: any) {
    console.error(
      `❌ Email failed [${sender.user} → ${email}]:`,
      error.message
    );

    // If connection failed, try to reinitialize transporter
    if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      console.log(`🔄 Reinitializing transporter for: ${sender.user}`);
      delete transporterPool[sender.user];
      // Don't await - let it initialize in background for next time
      setTimeout(() => {
        const newTransporter = createTransporter(sender);
        newTransporter
          .verify()
          .then(() => {
            transporterPool[sender.user] = newTransporter;
            console.log(`✅ Transporter reinitialized for: ${sender.user}`);
          })
          .catch((err) =>
            console.error(`❌ Reinitialize failed for ${sender.user}:`, err)
          );
      }, 1000);
    }

    throw error;
  }
};



// ========================================
// GRACEFUL SHUTDOWN
// ========================================

export async function closeAllTransporters(): Promise<void> {
  console.log("🔄 Closing all mail transporters...");
  
  const closePromises = Object.entries(transporterPool).map(async ([user, transporter]) => {
    try {
      transporter.close();
      console.log(`✅ Closed transporter for: ${user}`);
    } catch (error) {
      console.error(`❌ Error closing transporter for ${user}:`, error);
    }
  });
  
  await Promise.allSettled(closePromises);
  console.log("📧 All transporters closed");
}



































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