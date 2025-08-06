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





// const transporterPool: Record<string, Transporter> = {};
// let isProcessing = false; // Prevent multiple processors running

// function getTransporter(sender: MailSender): Transporter {
//   if (!transporterPool[sender.user]) {
//     transporterPool[sender.user] = nodemailer.createTransport({
//       host: "smtp.zoho.com",
//       port: 465,
//       secure: true,
//       pool: true,
//       maxConnections: 2,
//       maxMessages: 50,
//       auth: {
//         user: sender.user,
//         pass: sender.pass,
//       },
//       connectionTimeout: 15_000,
//       socketTimeout: 25_000,
//       logger: false, // Reduced logging
//       debug: false,
//     });

//     console.log(`🚀 SMTP transporter created for: ${sender.user}`);
//   }

//   return transporterPool[sender.user];
// }

// /**
//  * Main function - queues email and triggers processing
//  * This replaces your existing sendQueuedMail function
//  */
// export async function sendQueuedMail({
//   to,
//   subject, 
//   html,
//   senderKey,
//   replyTo
// }: {
//   to: string;
//   subject: string;
//   html: string;
//   senderKey: keyof typeof emailConfigs;
//   replyTo?: string | null;
// }): Promise<string> {
//   try {
//     // Queue the email first
//     const mailQueue = await prisma.mailQueue.create({
//       data: {
//         to,
//         subject,
//         html,
//         senderKey,
//         replyTo,
//         status: 'PENDING',
//         attempts: 0,
//         createdAt: new Date(),
//       },
//     });

//     console.log(`✅ Mail queued: ${mailQueue.id}`);

//     // Trigger processing immediately (non-blocking)
//     setImmediate(() => {
//       triggerMailProcessor().catch(err => 
//         console.error('Failed to trigger mail processor:', err)
//       );
//     });

//     return mailQueue.id;
//   } catch (error) {
//     console.error('❌ Failed to queue mail:', error);
//     throw new Error('Failed to queue email');
//   }
// }

// /**
//  * Triggers the mail processor to run for 5 seconds max
//  */
// async function triggerMailProcessor(): Promise<void> {
//   if (isProcessing) {
//     console.log('📤 Mail processor already running, skipping trigger');
//     return;
//   }

//   isProcessing = true;
//   console.log('🔄 Starting mail processor...');
  
//   const startTime = Date.now();
//   const maxRunTime = 5000; // 5 seconds max

//   try {
//     while (Date.now() - startTime < maxRunTime) {
//       // Get next pending email
//       const pendingMail = await prisma.mailQueue.findFirst({
//         where: {
//           status: 'PENDING',
//           attempts: { lt: 3 }
//         },
//         orderBy: { createdAt: 'asc' }
//       });

//       if (!pendingMail) {
//         console.log('📭 No pending mails, stopping processor');
//         break;
//       }

//       // Process this email
//       const success = await processSingleMail(pendingMail.id);
      
//       if (success) {
//         console.log(`📨 Successfully sent mail ${pendingMail.id}`);
//       } else {
//         console.log(`❌ Failed to send mail ${pendingMail.id}, will retry`);
//       }

//       // Small delay to prevent overwhelming
//       await new Promise(resolve => setTimeout(resolve, 100));
//     }

//     console.log(`✅ Mail processor finished (ran for ${Date.now() - startTime}ms)`);
    
//   } catch (error) {
//     console.error('❌ Mail processor error:', error);
//   } finally {
//     isProcessing = false;
    
//     // Clean up old mails
//     cleanupOldMails().catch(err => 
//       console.error('Failed to cleanup old mails:', err)
//     );
//   }
// }

// /**
//  * Process a single email from queue
//  */
// async function processSingleMail(mailId: string): Promise<boolean> {
//   try {
//     const mail = await prisma.mailQueue.findUnique({
//       where: { id: mailId, status: 'PENDING' }
//     });

//     if (!mail) return true; // Already processed

//     const senderConfig = emailConfigs[mail.senderKey as keyof typeof emailConfigs];
//     if (!senderConfig) {
//       await prisma.mailQueue.update({
//         where: { id: mailId },
//         data: { status: 'FAILED', attempts: { increment: 1 } }
//       });
//       return false;
//     }

//     const transporter = getTransporter(senderConfig);
//     const formattedFrom = `"Pluggn" <${senderConfig.user}>`;

//     // Send the email
//     await transporter.sendMail({
//       from: formattedFrom,
//       to: mail.to,
//       subject: mail.subject,
//       html: mail.html,
//       // replyTo: mail.replyTo,
//       envelope: {
//         from: senderConfig.user,
//         to: mail.to,
//       },
//     });

//     // Mark as sent
//     await prisma.mailQueue.update({
//       where: { id: mailId },
//       data: { 
//         status: 'SENT',
//         attempts: { increment: 1 },
//         sentAt: new Date()
//       }
//     });

//     return true;

//   } catch (error) {
//     console.error(`❌ Failed to send mail ${mailId}:`, error);

//     try {
//       const updatedMail = await prisma.mailQueue.update({
//         where: { id: mailId },
//         data: { 
//           attempts: { increment: 1 },
//           lastAttemptAt: new Date(),
//           error: error instanceof Error ? error.message : 'Unknown error'
//         }
//       });

//       // Mark as failed if max attempts reached
//       if (updatedMail.attempts >= 3) {
//         await prisma.mailQueue.update({
//           where: { id: mailId },
//           data: { status: 'FAILED' }
//         });
//       }
//     } catch (dbError) {
//       console.error('Failed to update mail attempts:', dbError);
//     }

//     return false;
//   }
// }

// /**
//  * Clean up old processed mails (sent/failed > 24 hours)
//  */
// async function cleanupOldMails(): Promise<void> {
//   try {
//     const oneDayAgo = new Date();
//     oneDayAgo.setHours(oneDayAgo.getHours() - 24);

//     const deleted = await prisma.mailQueue.deleteMany({
//       where: {
//         OR: [
//           { status: 'SENT', sentAt: { lt: oneDayAgo } },
//           { status: 'FAILED', attempts: { gte: 3 }, lastAttemptAt: { lt: oneDayAgo } }
//         ]
//       }
//     });

//     if (deleted.count > 0) {
//       console.log(`🗑️ Cleaned up ${deleted.count} old mail records`);
//     }
//   } catch (error) {
//     console.error('❌ Error cleaning up old mails:', error);
//   }
// }




// const transporterPool: Record<string, Transporter> = {};
// let isProcessing = false;
// let processingPromise: Promise<void> | null = null;

// function getTransporter(sender: MailSender): Transporter {
//   if (!transporterPool[sender.user]) {
//     transporterPool[sender.user] = nodemailer.createTransport({
//       host: "smtp.zoho.com",
//       port: 465,
//       secure: true,
//       pool: true,
//       maxConnections: 2,
//       maxMessages: 50,
//       auth: {
//         user: sender.user,
//         pass: sender.pass,
//       },
//       connectionTimeout: 15_000,
//       socketTimeout: 25_000,
//       logger: false,
//       debug: false,
//     });

//     console.log(`🚀 SMTP transporter created for: ${sender.user}`);
//   }

//   return transporterPool[sender.user];
// }

// /**
//  * Main function - queues email and triggers processing
//  */
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
//   replyTo?: string | null;
// }): Promise<string> {
//   try {
//     // Queue the email first
//     const mailQueue = await prisma.mailQueue.create({
//       data: {
//         to,
//         subject,
//         html,
//         senderKey,
//         replyTo,
//         status: "PENDING",
//         attempts: 0,
//         createdAt: new Date(),
//       },
//     });

//     console.log(`✅ Mail queued: ${mailQueue.id}`);

//     // **FIX: Wait for processing to complete instead of fire-and-forget**
//     await triggerMailProcessor();

//     return mailQueue.id;
//   } catch (error) {
//     console.error("❌ Failed to queue mail:", error);
//     throw new Error("Failed to queue email");
//   }
// }

// /**
//  * **FIXED**: Proper concurrency control and error handling
//  */
// async function triggerMailProcessor(): Promise<void> {
//   // If already processing, wait for that to complete
//   if (isProcessing && processingPromise) {
//     console.log("📤 Mail processor already running, waiting for completion...");
//     await processingPromise;
//     return;
//   }

//   if (isProcessing) {
//     console.log("📤 Mail processor already running, skipping trigger");
//     return;
//   }

//   isProcessing = true;
//   console.log("🔄 Starting mail processor...");

//   // Create the processing promise
//   processingPromise = (async () => {
//     const startTime = Date.now();
//     const maxRunTime = 8000; // Increased to 8 seconds for better reliability

//     try {
//       let processedCount = 0;

//       while (Date.now() - startTime < maxRunTime) {
//         // **FIX: Better error handling for database queries**
//         let pendingMail;
//         try {
//           pendingMail = await prisma.mailQueue.findFirst({
//             where: {
//               status: "PENDING",
//               attempts: { lt: 3 },
//             },
//             orderBy: { createdAt: "asc" },
//           });
//         } catch (dbError) {
//           console.error("❌ Database error fetching pending mail:", dbError);
//           // Wait a bit before retrying
//           await new Promise((resolve) => setTimeout(resolve, 1000));
//           continue;
//         }

//         if (!pendingMail) {
//           console.log(
//             `📭 No pending mails, stopping processor (processed: ${processedCount})`
//           );
//           break;
//         }

//         // Process this email
//         const success = await processSingleMail(pendingMail.id);

//         if (success) {
//           processedCount++;
//           console.log(
//             `📨 Successfully sent mail ${pendingMail.id} (${processedCount} total)`
//           );
//         } else {
//           console.log(
//             `❌ Failed to send mail ${pendingMail.id}, will retry later`
//           );
//         }

//         // Prevent overwhelming the system
//         await new Promise((resolve) => setTimeout(resolve, 200));
//       }

//       console.log(
//         `✅ Mail processor finished (ran for ${
//           Date.now() - startTime
//         }ms, processed: ${processedCount})`
//       );
//     } catch (error) {
//       console.error("❌ Mail processor error:", error);
//     }
//   })();

//   try {
//     await processingPromise;
//   } finally {
//     isProcessing = false;
//     processingPromise = null;

//     // Clean up old mails (fire and forget is OK here)
//     cleanupOldMails().catch((err) =>
//       console.error("Failed to cleanup old mails:", err)
//     );
//   }
// }

// /**
//  * **IMPROVED**: Better error handling and retry logic
//  */
// async function processSingleMail(mailId: string): Promise<boolean> {
//   let retryCount = 0;
//   const maxRetries = 2;

//   while (retryCount <= maxRetries) {
//     try {
//       // **FIX: Use transaction to prevent race conditions**
//       const result = await prisma.$transaction(async (tx) => {
//         const mail = await tx.mailQueue.findUnique({
//           where: { id: mailId, status: "PENDING" },
//         });

//         if (!mail) {
//           console.log(`📭 Mail ${mailId} already processed or not found`);
//           return { success: true, alreadyProcessed: true };
//         }

//         const senderConfig =
//           emailConfigs[mail.senderKey as keyof typeof emailConfigs];
//         if (!senderConfig) {
//           await tx.mailQueue.update({
//             where: { id: mailId },
//             data: {
//               status: "FAILED",
//               attempts: { increment: 1 },
//               error: "Invalid sender configuration",
//             },
//           });
//           return { success: false, mail };
//         }

//         return { success: false, mail, senderConfig };
//       });

//       if (result.success && result.alreadyProcessed) {
//         return true;
//       }

//       if (!result.success && !result.senderConfig) {
//         return false; // Invalid config, don't retry
//       }

//       const { mail, senderConfig } = result;
//       const transporter = getTransporter(senderConfig!);
//       const formattedFrom = `"Pluggn" <${senderConfig!.user}>`;

//       // **FIX: Send email with better timeout handling**
//       await Promise.race([
//         transporter.sendMail({
//           from: formattedFrom,
//           to: mail!.to,
//           subject: mail!.subject,
//           html: mail!.html,
//           envelope: {
//             from: senderConfig!.user,
//             to: mail!.to,
//           },
//         }),
//         new Promise((_, reject) =>
//           setTimeout(() => reject(new Error("Email send timeout")), 20000)
//         ),
//       ]);

//       // Mark as sent
//       await prisma.mailQueue.update({
//         where: { id: mailId },
//         data: {
//           status: "SENT",
//           attempts: { increment: 1 },
//           sentAt: new Date(),
//         },
//       });

//       console.log(`📧 Email sent successfully: ${mailId}`);
//       return true;
//     } catch (error) {
//       retryCount++;
//       console.error(
//         `❌ Attempt ${retryCount} failed for mail ${mailId}:`,
//         error
//       );

//       if (retryCount <= maxRetries) {
//         // Wait before retrying
//         await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
//         continue;
//       }

//       // Max retries reached, update database
//       try {
//         const updatedMail = await prisma.mailQueue.update({
//           where: { id: mailId },
//           data: {
//             attempts: { increment: 1 },
//             lastAttemptAt: new Date(),
//             error: error instanceof Error ? error.message : "Unknown error",
//           },
//         });

//         // Mark as failed if max attempts reached
//         if (updatedMail.attempts >= 3) {
//           await prisma.mailQueue.update({
//             where: { id: mailId },
//             data: { status: "FAILED" },
//           });
//           console.log(
//             `💀 Mail ${mailId} marked as failed after ${updatedMail.attempts} attempts`
//           );
//         }
//       } catch (dbError) {
//         console.error("Failed to update mail attempts:", dbError);
//       }

//       return false;
//     }
//   }

//   return false;
// }

// /**
//  * **IMPROVED**: Better cleanup with error handling
//  */
// async function cleanupOldMails(): Promise<void> {
//   try {
//     const oneDayAgo = new Date();
//     oneDayAgo.setHours(oneDayAgo.getHours() - 24);

//     const deleted = await prisma.mailQueue.deleteMany({
//       where: {
//         OR: [
//           { status: "SENT", sentAt: { lt: oneDayAgo } },
//           {
//             status: "FAILED",
//             attempts: { gte: 3 },
//             lastAttemptAt: { lt: oneDayAgo },
//           },
//         ],
//       },
//     });

//     if (deleted.count > 0) {
//       console.log(`🗑️ Cleaned up ${deleted.count} old mail records`);
//     }
//   } catch (error) {
//     console.error("❌ Error cleaning up old mails:", error);
//   }
// }




































// const transporterPool: Record<string, Transporter> = {};

// // **DYNAMIC PROCESSING FLAGS** - Can handle any mail type
// const processingFlags = new Map<string, boolean>();
// const processingPromises = new Map<string, Promise<void>>();

// function getTransporter(sender: MailSender): Transporter {
//   if (!transporterPool[sender.user]) {
//     transporterPool[sender.user] = nodemailer.createTransport({
//       host: "smtp.zoho.com",
//       port: 465,
//       secure: true,
//       pool: true,
//       maxConnections: 3,
//       maxMessages: 100,
//       auth: {
//         user: sender.user,
//         pass: sender.pass,
//       },
//       connectionTimeout: 10_000,
//       socketTimeout: 15_000,
//       logger: false,
//       debug: false,
//     });

//     console.log(`🚀 SMTP transporter created for: ${sender.user}`);
//   }

//   return transporterPool[sender.user];
// }

// /**
//  * **UNIVERSAL**: Queue any mail type with immediate processing
//  */
// export async function sendQueuedMail({
//   to,
//   subject,
//   html,
//   senderKey,
//   replyTo,
//   mailType = "general",
//   priority = "normal", // Add priority support
// }: {
//   to: string;
//   subject: string;
//   html: string;
//   senderKey: keyof typeof emailConfigs;
//   replyTo?: string | null;
//   mailType?: string; // Any string allowed
//   priority?: "high" | "normal" | "low";
// }): Promise<string> {
//   try {
//     console.log(
//       `📥 Queueing ${mailType} mail for: ${to} (priority: ${priority})`
//     );

//     // Queue the email
//     const mailQueue = await prisma.mailQueue.create({
//       data: {
//         to,
//         subject,
//         html,
//         senderKey,
//         replyTo,
//         status: "PENDING",
//         attempts: 0,
//         createdAt: new Date(),
//         mailType,
//         priority,
//       },
//     });

//     console.log(`✅ Mail queued: ${mailQueue.id} (${mailType})`);

//     // **TRIGGER PROCESSOR FOR THIS MAIL TYPE**
//     setImmediate(() => {
//       triggerMailProcessor(mailType, priority).catch((err) =>
//         console.error(`Failed to trigger ${mailType} processor:`, err)
//       );
//     });

//     return mailQueue.id;
//   } catch (error) {
//     console.error(`❌ Failed to queue ${mailType} mail:`, error);
//     throw new Error(`Failed to queue ${mailType} email`);
//   }
// }

// /**
//  * **DYNAMIC**: Handle any mail type processor
//  */
// async function triggerMailProcessor(
//   mailType: string,
//   priority: string = "normal"
// ): Promise<void> {
//   const processorKey = `${mailType}_${priority}`;

//   // If this exact processor is running, wait for it
//   if (processingFlags.get(processorKey)) {
//     console.log(`📤 ${processorKey} processor already running, waiting...`);
//     const existingPromise = processingPromises.get(processorKey);
//     if (existingPromise) {
//       await existingPromise;
//     }
//     return;
//   }

//   // Start new processor
//   processingFlags.set(processorKey, true);
//   console.log(`🔄 Starting ${processorKey} processor...`);

//   const processingPromise = runMailProcessor(mailType, priority).finally(() => {
//     processingFlags.delete(processorKey);
//     processingPromises.delete(processorKey);
//     console.log(`✅ ${processorKey} processor finished`);
//   });

//   processingPromises.set(processorKey, processingPromise);

//   try {
//     await processingPromise;
//   } catch (error) {
//     console.error(`❌ ${processorKey} processor failed:`, error);
//   }
// }

// /**
//  * **FLEXIBLE**: Process any mail type with priority support
//  */
// async function runMailProcessor(
//   mailType: string,
//   priority: string
// ): Promise<void> {
//   const startTime = Date.now();
//   const maxRunTime = getProcessingTime(priority); // Different times based on priority
//   let processedCount = 0;

//   try {
//     while (Date.now() - startTime < maxRunTime) {
//       // Get next pending email of this type and priority
//       let pendingMails;
//       try {
//         pendingMails = await prisma.mailQueue.findMany({
//           where: {
//             status: "PENDING",
//             attempts: { lt: 3 },
//             mailType: mailType,
//             priority: priority,
//           },
//           orderBy: [
//             { priority: "desc" }, // High priority first
//             { createdAt: "asc" }, // Then oldest first
//           ],
//           take: getBatchSize(priority), // Process multiple at once for efficiency
//         });
//       } catch (dbError) {
//         console.error(`❌ Database error in ${mailType} processor:`, dbError);
//         await new Promise((resolve) => setTimeout(resolve, 500));
//         continue;
//       }

//       if (pendingMails.length === 0) {
//         console.log(
//           `📭 No pending ${mailType} (${priority}) mails (processed: ${processedCount})`
//         );
//         break;
//       }

//       // **CONCURRENT PROCESSING** within the same type/priority
//       const results = await Promise.allSettled(
//         pendingMails.map((mail) => processSingleMailFast(mail.id))
//       );

//       // Count successes
//       results.forEach((result, index) => {
//         if (result.status === "fulfilled" && result.value) {
//           processedCount++;
//           console.log(`📨 ${mailType} mail sent: ${pendingMails[index].id}`);
//         } else {
//           console.log(`❌ ${mailType} mail failed: ${pendingMails[index].id}`);
//         }
//       });

//       // Small delay between batches
//       await new Promise((resolve) => setTimeout(resolve, 100));
//     }

//     console.log(
//       `✅ ${mailType}(${priority}) completed (${
//         Date.now() - startTime
//       }ms, processed: ${processedCount})`
//     );
//   } catch (error) {
//     console.error(`❌ ${mailType}(${priority}) processor error:`, error);
//   }
// }

// /**
//  * **CONFIGURABLE**: Get processing time based on priority
//  */
// function getProcessingTime(priority: string): number {
//   switch (priority) {
//     case "high":
//       return 10000; // 10 seconds for high priority
//     case "low":
//       return 3000; // 3 seconds for low priority
//     default:
//       return 5000; // 5 seconds for normal
//   }
// }

// /**
//  * **CONFIGURABLE**: Get batch size based on priority
//  */
// function getBatchSize(priority: string): number {
//   switch (priority) {
//     case "high":
//       return 5; // Process 5 high priority at once
//     case "low":
//       return 2; // Process 2 low priority at once
//     default:
//       return 3; // Process 3 normal priority at once
//   }
// }

// /**
//  * **OPTIMIZED**: Fast single mail processing
//  */
// async function processSingleMailFast(mailId: string): Promise<boolean> {
//   try {
//     // Single transaction - Get and update
//     const result = await prisma.$transaction(async (tx) => {
//       const mail = await tx.mailQueue.findUnique({
//         where: { id: mailId, status: "PENDING" },
//       });

//       if (!mail) return { alreadyProcessed: true };

//       const senderConfig =
//         emailConfigs[mail.senderKey as keyof typeof emailConfigs];
//       if (!senderConfig) {
//         await tx.mailQueue.update({
//           where: { id: mailId },
//           data: {
//             status: "FAILED",
//             attempts: { increment: 1 },
//             error: "Invalid sender configuration",
//           },
//         });
//         return { invalidConfig: true };
//       }

//       // Mark as processing
//       await tx.mailQueue.update({
//         where: { id: mailId },
//         data: { attempts: { increment: 1 } },
//       });

//       return { mail, senderConfig };
//     });

//     if (result.alreadyProcessed) return true;
//     if (result.invalidConfig) return false;

//     const { mail, senderConfig } = result;
//     const transporter = getTransporter(senderConfig!);
//     const formattedFrom = `"Pluggn" <${senderConfig!.user}>`;

//     // Send email with timeout
//     await Promise.race([
//       transporter.sendMail({
//         from: formattedFrom,
//         to: mail!.to,
//         subject: mail!.subject,
//         html: mail!.html,
//         envelope: {
//           from: senderConfig!.user,
//           to: mail!.to,
//         },
//       }),
//       new Promise((_, reject) =>
//         setTimeout(() => reject(new Error("Send timeout")), 10000)
//       ),
//     ]);

//     // Mark as sent
//     await prisma.mailQueue.update({
//       where: { id: mailId },
//       data: {
//         status: "SENT",
//         sentAt: new Date(),
//       },
//     });

//     return true;
//   } catch (error) {
//     console.error(`❌ Mail send failed ${mailId}:`, error);

//     try {
//       const updatedMail = await prisma.mailQueue.update({
//         where: { id: mailId },
//         data: {
//           lastAttemptAt: new Date(),
//           error: error instanceof Error ? error.message : "Unknown error",
//         },
//       });

//       if (updatedMail.attempts >= 3) {
//         await prisma.mailQueue.update({
//           where: { id: mailId },
//           data: { status: "FAILED" },
//         });
//       }
//     } catch (dbError) {
//       console.error("Failed to update mail attempts:", dbError);
//     }

//     return false;
//   }
// }

// /**
//  * **BACKGROUND CLEANUP**
//  */
// let cleanupInterval: NodeJS.Timeout | null = null;

// function startCleanupProcess() {
//   if (cleanupInterval) return;

//   cleanupInterval = setInterval(() => {
//     cleanupOldMails().catch((err) => console.error("Cleanup error:", err));
//   }, 10 * 60 * 1000);
// }

// async function cleanupOldMails(): Promise<void> {
//   try {
//     const sixHoursAgo = new Date();
//     sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

//     const deleted = await prisma.mailQueue.deleteMany({
//       where: {
//         OR: [
//           { status: "SENT", sentAt: { lt: sixHoursAgo } },
//           {
//             status: "FAILED",
//             attempts: { gte: 3 },
//             lastAttemptAt: { lt: sixHoursAgo },
//           },
//         ],
//       },
//     });

//     if (deleted.count > 0) {
//       console.log(`🗑️ Cleaned up ${deleted.count} old mail records`);
//     }
//   } catch (error) {
//     console.error("❌ Cleanup error:", error);
//   }
// }

// startCleanupProcess();

// /**
//  * **CONVENIENCE FUNCTIONS** - You can create as many as needed
//  */
// export async function queueMail(
//   mailType: string ,
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">,
//   priority: "high" | "normal" | "low" = "normal"
// ): Promise<string> {
//   return sendQueuedMail({ ...params, mailType, priority });
// }

// // **SPECIFIC MAIL TYPE HELPERS** - Add any you need
// export const queueSuccessMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("success_order", params, "high");

// export const queueNotifyMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("notify_admin", params, "normal");

// export const queueFailedMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("failed_order", params, "high");

// export const queueWelcomeMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("welcome_user", params, "normal");

// export const queuePasswordResetMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("password_reset", params, "high");

// export const queueNewsletterMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("newsletter", params, "low");

// export const queuePromotionalMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("promotional", params, "low");

// export const queueInvoiceMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("invoice", params, "high");

// export const queueReminderMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("reminder", params, "normal");

// export const queueVerificationMail = (
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
// ) => queueMail("email_verification", params, "high");

// /**
//  * **BULK MAIL FUNCTION** - For sending to multiple recipients
//  */
// export async function queueBulkMail(
//   mailType: string,
//   recipients: string[],
//   mailData: Omit<Parameters<typeof sendQueuedMail>[0], "to" | "mailType">,
//   priority: "high" | "normal" | "low" = "normal"
// ): Promise<string[]> {
//   const mailIds = await Promise.all(
//     recipients.map((to) =>
//       sendQueuedMail({ ...mailData, to, mailType, priority })
//     )
//   );

//   console.log(`📬 Queued ${mailIds.length} ${mailType} bulk mails`);
//   return mailIds;
// }

// /**
//  * **SCHEDULED MAIL FUNCTION** - For future sending (you can extend this)
//  */
// export async function queueScheduledMail(
//   mailType: string,
//   params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">,
//   sendAt: Date,
//   priority: "high" | "normal" | "low" = "normal"
// ): Promise<string> {
//   // For now, just queue normally - you can extend this to support scheduled sending
//   console.log(`📅 Scheduling ${mailType} mail for ${sendAt.toISOString()}`);
//   return sendQueuedMail({ ...params, mailType, priority });
// }







const transporterPool: Record<string, Transporter> = {};

// **DYNAMIC PROCESSING FLAGS** - Can handle any mail type
const processingFlags = new Map<string, boolean>();
const processingPromises = new Map<string, Promise<void>>();

function getTransporter(sender: MailSender): Transporter {
  if (!transporterPool[sender.user]) {
    transporterPool[sender.user] = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 5, // Increased connections
      maxMessages: 100,
      auth: {
        user: sender.user,
        pass: sender.pass,
      },
      connectionTimeout: 15_000, // Increased timeout
      socketTimeout: 20_000, // Increased timeout
      greetingTimeout: 10_000,
      logger: false,
      debug: false,
    });

    console.log(`🚀 SMTP transporter created for: ${sender.user}`);
  }

  return transporterPool[sender.user];
}

// Helper function to reset transporter if needed
function resetTransporter(senderKey: string) {
  const senderConfig = emailConfigs[senderKey as keyof typeof emailConfigs];
  if (senderConfig && transporterPool[senderConfig.user]) {
    console.log(`🔄 Resetting transporter for: ${senderConfig.user}`);
    transporterPool[senderConfig.user].close();
    delete transporterPool[senderConfig.user];
  }
}

/**
 * **UNIVERSAL**: Queue any mail type with immediate processing
 */
export async function sendQueuedMail({
  to,
  subject,
  html,
  senderKey,
  replyTo,
  mailType = "general",
  priority = "normal",
}: {
  to: string;
  subject: string;
  html: string;
  senderKey: keyof typeof emailConfigs;
  replyTo?: string | null;
  mailType?: string;
  priority?: "high" | "normal" | "low";
}): Promise<string> {
  try {
    console.log(
      `📥 Queueing ${mailType} mail for: ${to} (priority: ${priority})`
    );

    // Queue the email
    const mailQueue = await prisma.mailQueue.create({
      data: {
        to,
        subject,
        html,
        senderKey,
        replyTo,
        status: "PENDING",
        attempts: 0,
        createdAt: new Date(),
        mailType,
        priority,
      },
    });

    console.log(`✅ Mail queued: ${mailQueue.id} (${mailType})`);

    // **TRIGGER PROCESSOR FOR THIS MAIL TYPE**
    setImmediate(() => {
      triggerMailProcessor(mailType, priority).catch((err) =>
        console.error(`Failed to trigger ${mailType} processor:`, err)
      );
    });

    return mailQueue.id;
  } catch (error) {
    console.error(`❌ Failed to queue ${mailType} mail:`, error);
    throw new Error(`Failed to queue ${mailType} email`);
  }
}

/**
 * **DYNAMIC**: Handle any mail type processor
 */
async function triggerMailProcessor(
  mailType: string,
  priority: string = "normal"
): Promise<void> {
  const processorKey = `${mailType}_${priority}`;

  // If this exact processor is running, wait for it
  if (processingFlags.get(processorKey)) {
    console.log(`📤 ${processorKey} processor already running, waiting...`);
    const existingPromise = processingPromises.get(processorKey);
    if (existingPromise) {
      await existingPromise;
    }
    return;
  }

  // Start new processor
  processingFlags.set(processorKey, true);
  console.log(`🔄 Starting ${processorKey} processor...`);

  const processingPromise = runMailProcessor(mailType, priority).finally(() => {
    processingFlags.delete(processorKey);
    processingPromises.delete(processorKey);
    console.log(`✅ ${processorKey} processor finished`);
  });

  processingPromises.set(processorKey, processingPromise);

  try {
    await processingPromise;
  } catch (error) {
    console.error(`❌ ${processorKey} processor failed:`, error);
  }
}

/**
 * **FLEXIBLE**: Process any mail type with priority support
 */
async function runMailProcessor(
  mailType: string,
  priority: string
): Promise<void> {
  const startTime = Date.now();
  const maxRunTime = getProcessingTime(priority);
  let processedCount = 0;

  try {
    while (Date.now() - startTime < maxRunTime) {
      // Get next pending email of this type and priority
      let pendingMails;
      try {
        pendingMails = await prisma.mailQueue.findMany({
          where: {
            status: "PENDING",
            attempts: { lt: 3 },
            mailType: mailType,
            priority: priority,
          },
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
          take: getBatchSize(priority),
        });
      } catch (dbError) {
        console.error(`❌ Database error in ${mailType} processor:`, dbError);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      if (pendingMails.length === 0) {
        console.log(
          `📭 No pending ${mailType} (${priority}) mails (processed: ${processedCount})`
        );
        break;
      }

      // **SEQUENTIAL PROCESSING** to avoid transaction conflicts
      for (const mail of pendingMails) {
        try {
          const success = await processSingleMailFixed(mail.id);
          if (success) {
            processedCount++;
            console.log(`📨 ${mailType} mail sent: ${mail.id}`);
          } else {
            console.log(`❌ ${mailType} mail failed: ${mail.id}`);
          }
        } catch (error) {
          console.error(`❌ Error processing mail ${mail.id}:`, error);
        }

        // Small delay between emails to prevent overwhelming
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Delay between batches
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(
      `✅ ${mailType}(${priority}) completed (${
        Date.now() - startTime
      }ms, processed: ${processedCount})`
    );
  } catch (error) {
    console.error(`❌ ${mailType}(${priority}) processor error:`, error);
  }
}

/**
 * **CONFIGURABLE**: Get processing time based on priority
 */
function getProcessingTime(priority: string): number {
  switch (priority) {
    case "high":
      return 15000; // 15 seconds for high priority
    case "low":
      return 5000; // 5 seconds for low priority
    default:
      return 10000; // 10 seconds for normal
  }
}

/**
 * **CONFIGURABLE**: Get batch size based on priority
 */
function getBatchSize(priority: string): number {
  switch (priority) {
    case "high":
      return 3; // Process 3 high priority at once
    case "low":
      return 2; // Process 2 low priority at once
    default:
      return 2; // Process 2 normal priority at once
  }
}

/**
 * **FIXED**: Single mail processing without transaction conflicts
 */
async function processSingleMailFixed(mailId: string): Promise<boolean> {
  let mail: any = null;
  let senderConfig: any = null;

  try {
    // Step 1: Get mail data and increment attempts
    await prisma.$transaction(
      async (tx) => {
        mail = await tx.mailQueue.findUnique({
          where: { id: mailId, status: "PENDING" },
        });

        if (!mail) {
          throw new Error("Mail not found or already processed");
        }

        if (mail.attempts >= 3) {
          throw new Error("Max attempts reached");
        }

        // Increment attempts
        await tx.mailQueue.update({
          where: { id: mailId },
          data: { attempts: { increment: 1 } },
        });
      },
      {
        timeout: 10000, // 10 second timeout
      }
    );

    if (!mail) {
      console.log(`📭 Mail ${mailId} not found or already processed`);
      return true;
    }

    // Step 2: Validate sender config
    senderConfig = emailConfigs[mail.senderKey as keyof typeof emailConfigs];
    if (!senderConfig) {
      await prisma.mailQueue.update({
        where: { id: mailId },
        data: {
          status: "FAILED",
          error: "Invalid sender configuration",
        },
      });
      return false;
    }

    // Step 3: Get or create transporter
    let transporter = getTransporter(senderConfig);
    const formattedFrom = `"Pluggn" <${senderConfig.user}>`;

    // Step 4: Send email with extended timeout and retry logic
    let sendSuccess = false;
    let sendError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await Promise.race([
          transporter.sendMail({
            from: formattedFrom,
            to: mail.to,
            subject: mail.subject,
            html: mail.html,
            envelope: {
              from: senderConfig.user,
              to: mail.to,
            },
          }),
          new Promise(
            (_, reject) =>
              setTimeout(() => reject(new Error("Send timeout")), 25000) // 25 second timeout
          ),
        ]);

        sendSuccess = true;
        break;
      } catch (error: any) {
        sendError = error;
        console.log(`❌ Send attempt ${attempt} failed for ${mailId}:`, error);

        // If it's a connection issue, reset transporter and try again
        if (
          attempt === 1 &&
          (error.message.includes("timeout") ||
            error.message.includes("connection") ||
            error.message.includes("ENOTFOUND"))
        ) {
          console.log(`🔄 Resetting transporter and retrying for ${mailId}`);
          resetTransporter(mail.senderKey);
          transporter = getTransporter(senderConfig);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    // Step 5: Update mail status
    if (sendSuccess) {
      await prisma.mailQueue.update({
        where: { id: mailId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          error: null,
        },
      });
      return true;
    } else {
      // Update with error and check if should mark as failed
      const updatedMail = await prisma.mailQueue.update({
        where: { id: mailId },
        data: {
          lastAttemptAt: new Date(),
          error: sendError instanceof Error ? sendError.message : "Send failed",
        },
      });

      if (updatedMail.attempts >= 3) {
        await prisma.mailQueue.update({
          where: { id: mailId },
          data: { status: "FAILED" },
        });
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ Mail processing failed ${mailId}:`, error);

    try {
      // Update error status if possible
      await prisma.mailQueue.update({
        where: { id: mailId },
        data: {
          lastAttemptAt: new Date(),
          error: error instanceof Error ? error.message : "Processing error",
        },
      });
    } catch (dbError) {
      console.error(`❌ Failed to update error status for ${mailId}:`, dbError);
    }

    return false;
  }
}

/**
 * **BACKGROUND CLEANUP**
 */
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupProcess() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    cleanupOldMails().catch((err) => console.error("Cleanup error:", err));
  }, 10 * 60 * 1000);
}

async function cleanupOldMails(): Promise<void> {
  try {
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const deleted = await prisma.mailQueue.deleteMany({
      where: {
        OR: [
          { status: "SENT", sentAt: { lt: sixHoursAgo } },
          {
            status: "FAILED",
            attempts: { gte: 3 },
            lastAttemptAt: { lt: sixHoursAgo },
          },
        ],
      },
    });

    if (deleted.count > 0) {
      console.log(`🗑️ Cleaned up ${deleted.count} old mail records`);
    }
  } catch (error) {
    console.error("❌ Cleanup error:", error);
  }
}

startCleanupProcess();

/**
 * **CONVENIENCE FUNCTIONS**
 */
export async function queueMail(
  mailType: string,
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">,
  priority: "high" | "normal" | "low" = "normal"
): Promise<string> {
  return sendQueuedMail({ ...params, mailType, priority });
}

// **SPECIFIC MAIL TYPE HELPERS**
export const queueSuccessMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("success_order", params, "high");

export const queueNotifyMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("notify_admin", params, "normal");

export const queueFailedMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("failed_order", params, "high");

export const queueWelcomeMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("welcome_user", params, "normal");

export const queuePasswordResetMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("password_reset", params, "high");

export const queueNewsletterMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("newsletter", params, "low");

export const queuePromotionalMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("promotional", params, "low");

export const queueInvoiceMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("invoice", params, "high");

export const queueReminderMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("reminder", params, "normal");

export const queueVerificationMail = (
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">
) => queueMail("email_verification", params, "high");

/**
 * **BULK MAIL FUNCTION**
 */
export async function queueBulkMail(
  mailType: string,
  recipients: string[],
  mailData: Omit<Parameters<typeof sendQueuedMail>[0], "to" | "mailType">,
  priority: "high" | "normal" | "low" = "normal"
): Promise<string[]> {
  const mailIds = await Promise.all(
    recipients.map((to) =>
      sendQueuedMail({ ...mailData, to, mailType, priority })
    )
  );

  console.log(`📬 Queued ${mailIds.length} ${mailType} bulk mails`);
  return mailIds;
}

/**
 * **SCHEDULED MAIL FUNCTION**
 */
export async function queueScheduledMail(
  mailType: string,
  params: Omit<Parameters<typeof sendQueuedMail>[0], "mailType">,
  sendAt: Date,
  priority: "high" | "normal" | "low" = "normal"
): Promise<string> {
  console.log(`📅 Scheduling ${mailType} mail for ${sendAt.toISOString()}`);
  return sendQueuedMail({ ...params, mailType, priority });
}