import { emailConfigs, prisma } from "../../config";
import { mail } from "../../lib/mail";
import nodemailer, { Transporter } from "nodemailer";

type MailSender = {
  from: string;
  user: string;
  pass: string;
};

// // Queue a mail to be sent later
//  async function queueMail({
//   to,
//   subject,
//   html,
//   senderKey,
//   replyTo,
// }: {
//   to: string;
//   subject: string;
//   html: string;
//   senderKey: keyof typeof emailConfigs;
//   replyTo?: string;
// }) {


//   console.log("mail queued")
//   await prisma.mailQueue.create({
//     data: {
//       to,
//       subject,
//       html,
//       senderKey,
//       replyTo,
//     },
//   });

//   // Trigger the processor (runs for ~5s max)
//   await processMailQueueFor(5000);
// }

// // Background processor: sends queued mail in batches
// export async function processMailQueueFor(durationMs = 5000) {
//   const stopAt = Date.now() + durationMs;

//   while (Date.now() < stopAt) {
//     const next = await prisma.mailQueue.findFirst({
//       where: { status: "PENDING" },
//       orderBy: { createdAt: "asc" },
//     });

//     if (!next) break;
//     const sender = emailConfigs[next.senderKey as keyof typeof emailConfigs];
//     if (!sender) {
//       console.error("❌ Invalid senderKey:", next.senderKey);
//       await prisma.mailQueue.update({
//         where: { id: next.id },
//         data: { status: "FAILED", attempts: { increment: 1 } },
//       });
//       continue;
//     }

//     try {
//       const info = await mail(
//         next.to,
//         next.subject,
//         next.html,
//         sender,
//         next.replyTo || undefined
//       );

//       console.log(`📨 Sent from ${sender.user} → ${next.to}`, info.messageId);

//       await prisma.mailQueue.delete({ where: { id: next.id } });
//     } catch (err) {
//       console.error("❌ Failed to send queued mail:", err);
//       await prisma.mailQueue.update({
//         where: { id: next.id },
//         data: {
//           attempts: { increment: 1 },
//           status: "FAILED",
//         },
//       });
//     }
//   }
// }


// // Simple helper to enqueue a mail and trigger the processor
// export async function sendQueuedMail({
//   to,
//   subject,
//   html,
//   senderKey,
//   replyTo,
// }: {
//   to: string;
//   subject: string;
//   html: string;
//   senderKey: "orders" | "admin" | "noreply"; // Add other keys if needed
//   replyTo?: string;
// }) {
//   try {
//     await queueMail({ to, subject, html, senderKey, replyTo });
//   } catch (err) {
//     console.error("Failed to queue mail:", err);
//   }
// }



// // src/workers/mailQueue.ts

// import { prisma, emailConfigs } from "../../config";
// import { mail } from "../../lib/mail";

// // In-memory lock to prevent overlapping processors
// let isProcessing = false;

// export async function processMailQueueFor(durationMs = 5000) {
//   if (isProcessing) return;
//   isProcessing = true;

//   const stopAt = Date.now() + durationMs;

//   try {
//     while (Date.now() < stopAt) {
//       const queuedMail = await prisma.mailQueue.findFirst({
//         where: { status: "PENDING", attempts: { lt: 3 } },
//         orderBy: { createdAt: "asc" },
//       });

//       if (!queuedMail) break;

//       const sender =
//         emailConfigs[queuedMail.senderKey as keyof typeof emailConfigs];
//       if (!sender) {
//         console.error("Invalid senderKey:", queuedMail.senderKey);
//         await failMail(queuedMail.id);
//         continue;
//       }

//       try {
//         const info = await mail(
//           queuedMail.to,
//           queuedMail.subject,
//           queuedMail.html,
//           sender,
//           queuedMail.replyTo || undefined
//         );

//         console.log(`✅ Mail sent: ${info.messageId}`);
//         await prisma.mailQueue.delete({ where: { id: queuedMail.id } });
//       } catch (err) {
//         console.error("❌ Failed to send:", err);
//         await prisma.mailQueue.update({
//           where: { id: queuedMail.id },
//           data: {
//             attempts: { increment: 1 },
//             status: "FAILED",
//           },
//         });
//       }
//     }
//   } catch (err) {
//     console.error("Mail processor error:", err);
//   } finally {
//     isProcessing = false;
//   }
// }

// async function failMail(id: string) {
//   await prisma.mailQueue.update({
//     where: { id },
//     data: {
//       attempts: { increment: 1 },
//       status: "FAILED",
//     },
//   });
// }

// export async function sendQueuedMail({
//   to,
//   subject,
//   html,
//   senderKey,
//   replyTo,
// }: {
//   to: string;
//   subject: string;
//   html: string;
//   senderKey: keyof typeof emailConfigs;
//   replyTo?: string;
// }) {
//   await prisma.mailQueue.create({
//     data: { to, subject, html, senderKey, replyTo },
//   });

//   void processMailQueueFor(5000); // run behind-the-scenes
// }





const transporterPool: Record<string, Transporter> = {};
let isProcessing = false; // Prevent multiple processors running

function getTransporter(sender: MailSender): Transporter {
  if (!transporterPool[sender.user]) {
    transporterPool[sender.user] = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 2,
      maxMessages: 50,
      auth: {
        user: sender.user,
        pass: sender.pass,
      },
      connectionTimeout: 15_000,
      socketTimeout: 25_000,
      logger: false, // Reduced logging
      debug: false,
    });

    console.log(`🚀 SMTP transporter created for: ${sender.user}`);
  }

  return transporterPool[sender.user];
}

/**
 * Main function - queues email and triggers processing
 * This replaces your existing sendQueuedMail function
 */
export async function sendQueuedMail({
  to,
  subject, 
  html,
  senderKey,
  replyTo
}: {
  to: string;
  subject: string;
  html: string;
  senderKey: keyof typeof emailConfigs;
  replyTo?: string | null;
}): Promise<string> {
  try {
    // Queue the email first
    const mailQueue = await prisma.mailQueue.create({
      data: {
        to,
        subject,
        html,
        senderKey,
        replyTo,
        status: 'PENDING',
        attempts: 0,
        createdAt: new Date(),
      },
    });

    console.log(`✅ Mail queued: ${mailQueue.id}`);

    // Trigger processing immediately (non-blocking)
    setImmediate(() => {
      triggerMailProcessor().catch(err => 
        console.error('Failed to trigger mail processor:', err)
      );
    });

    return mailQueue.id;
  } catch (error) {
    console.error('❌ Failed to queue mail:', error);
    throw new Error('Failed to queue email');
  }
}

/**
 * Triggers the mail processor to run for 5 seconds max
 */
async function triggerMailProcessor(): Promise<void> {
  if (isProcessing) {
    console.log('📤 Mail processor already running, skipping trigger');
    return;
  }

  isProcessing = true;
  console.log('🔄 Starting mail processor...');
  
  const startTime = Date.now();
  const maxRunTime = 5000; // 5 seconds max

  try {
    while (Date.now() - startTime < maxRunTime) {
      // Get next pending email
      const pendingMail = await prisma.mailQueue.findFirst({
        where: {
          status: 'PENDING',
          attempts: { lt: 3 }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!pendingMail) {
        console.log('📭 No pending mails, stopping processor');
        break;
      }

      // Process this email
      const success = await processSingleMail(pendingMail.id);
      
      if (success) {
        console.log(`📨 Successfully sent mail ${pendingMail.id}`);
      } else {
        console.log(`❌ Failed to send mail ${pendingMail.id}, will retry`);
      }

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Mail processor finished (ran for ${Date.now() - startTime}ms)`);
    
  } catch (error) {
    console.error('❌ Mail processor error:', error);
  } finally {
    isProcessing = false;
    
    // Clean up old mails
    cleanupOldMails().catch(err => 
      console.error('Failed to cleanup old mails:', err)
    );
  }
}

/**
 * Process a single email from queue
 */
async function processSingleMail(mailId: string): Promise<boolean> {
  try {
    const mail = await prisma.mailQueue.findUnique({
      where: { id: mailId, status: 'PENDING' }
    });

    if (!mail) return true; // Already processed

    const senderConfig = emailConfigs[mail.senderKey as keyof typeof emailConfigs];
    if (!senderConfig) {
      await prisma.mailQueue.update({
        where: { id: mailId },
        data: { status: 'FAILED', attempts: { increment: 1 } }
      });
      return false;
    }

    const transporter = getTransporter(senderConfig);
    const formattedFrom = `"Pluggn" <${senderConfig.user}>`;

    // Send the email
    await transporter.sendMail({
      from: formattedFrom,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      // replyTo: mail.replyTo,
      envelope: {
        from: senderConfig.user,
        to: mail.to,
      },
    });

    // Mark as sent
    await prisma.mailQueue.update({
      where: { id: mailId },
      data: { 
        status: 'SENT',
        attempts: { increment: 1 },
        sentAt: new Date()
      }
    });

    return true;

  } catch (error) {
    console.error(`❌ Failed to send mail ${mailId}:`, error);

    try {
      const updatedMail = await prisma.mailQueue.update({
        where: { id: mailId },
        data: { 
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Mark as failed if max attempts reached
      if (updatedMail.attempts >= 3) {
        await prisma.mailQueue.update({
          where: { id: mailId },
          data: { status: 'FAILED' }
        });
      }
    } catch (dbError) {
      console.error('Failed to update mail attempts:', dbError);
    }

    return false;
  }
}

/**
 * Clean up old processed mails (sent/failed > 24 hours)
 */
async function cleanupOldMails(): Promise<void> {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const deleted = await prisma.mailQueue.deleteMany({
      where: {
        OR: [
          { status: 'SENT', sentAt: { lt: oneDayAgo } },
          { status: 'FAILED', attempts: { gte: 3 }, lastAttemptAt: { lt: oneDayAgo } }
        ]
      }
    });

    if (deleted.count > 0) {
      console.log(`🗑️ Cleaned up ${deleted.count} old mail records`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up old mails:', error);
  }
}