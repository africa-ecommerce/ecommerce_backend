import nodemailer, { Transporter } from "nodemailer";
import { emailConfigs } from "../config";

type MailSender = {
  from: string; // can contain display name, e.g. `"Pluggn" <orders@pluggn.com.ng>`
  user: string; // must be identical to address in `from`
  pass: string;
};

const transporterPool: Record<string, Transporter> = {};
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

  const initPromises = Object.entries(emailConfigs).map(
    async ([key, config]) => {
      try {

        const transporter = createTransporter(config);

        // Verify the connection and warm it up
        await transporter.verify();

        // Store in pool
        transporterPool[config.user] = transporter;
        initializationStatus[config.user] = true;

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

    return info;
  } catch (error: any) {
    console.error(
      `❌ Email failed [${sender.user} → ${email}]:`,
      error.message
    );

    // If connection failed, try to reinitialize transporter
    if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      delete transporterPool[sender.user];
      // Don't await - let it initialize in background for next time
      setTimeout(() => {
        const newTransporter = createTransporter(sender);
        newTransporter
          .verify()
          .then(() => {
            transporterPool[sender.user] = newTransporter;
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
  
  const closePromises = Object.entries(transporterPool).map(async ([user, transporter]) => {
    try {
      transporter.close();
    } catch (error) {
      console.error(`❌ Error closing transporter for ${user}:`, error);
    }
  });
  
  await Promise.allSettled(closePromises);
}

