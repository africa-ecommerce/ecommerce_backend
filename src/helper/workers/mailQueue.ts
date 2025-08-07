import { emailConfigs, prisma } from "../../config";
import { mail } from "../../lib/mail";

type MailSender = {
  from: string;
  user: string;
  pass: string;
};





// ========================================
// QUEUE MAIL (Updated - but same interface)
// ========================================

export async function queueMail({
  to,
  subject,
  html,
  senderKey,
  replyTo,
  mailType,
  priority,
}: {
  to: string;
  subject: string;
  html: string;
  senderKey: string;
  replyTo?: string;
  mailType: string;
  priority: "low" | "normal" | "high";
}) {
  console.log(`📥 Queueing ${mailType} mail for: ${to}`);

  // Save to database first
  const queuedMail = await prisma.mailQueue.create({
    data: {
      to,
      subject,
      html,
      senderKey,
      replyTo,
      status: "PENDING",
      attempts: 0,
      mailType,
      priority,
      createdAt: new Date(),
    },
  });

  console.log(`✅ Mail queued: ${queuedMail.id}`);

  // Trigger background processing (non-blocking)
  setImmediate(() => {
    triggerBackgroundProcessing().catch(err => 
      console.error("Background trigger failed:", err.message)
    );
  });

  return queuedMail.id;
}

// ========================================
// BACKGROUND PROCESSING (Updated)
// ========================================

async function triggerBackgroundProcessing() {
  try {
    const baseUrl = process.env.BACKEND_URL || process.env.VERCEL_URL;
    if (!baseUrl) {
      console.log("⚠️ No URL found for background processing");
      return;
    }

    fetch(`${baseUrl}/mail/processQueuedMail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(response => {
      if (response.ok) {
        console.log(`🚀 Background processing triggered`);
      }
    }).catch(err => {
      console.log(`⚠️ Background trigger error: ${err.message}`);
    });

  } catch (error: any) {
    console.log(`⚠️ Trigger setup error: ${error.message}`);
  }
}

export function senderKeyToMailSender(key: keyof typeof emailConfigs) {
  const sender = emailConfigs[key];
  if (!sender) throw new Error(`Invalid senderKey: ${key}`);
  return sender;
}

export async function startBackgroundProcessor(
  scope: string,
  priority: "low" | "normal" | "high"
) {
  console.log(`🔄 Processing ${priority} priority mails`);

  const mails = await prisma.mailQueue.findMany({
    where: {
      status: "PENDING",
      priority,
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  if (mails.length === 0) {
    console.log(`📭 No pending ${priority} priority mails`);
    return;
  }

  console.log(`📨 Found ${mails.length} mails to process`);

  for (const mailJob of mails) {
    try {
      const sender = senderKeyToMailSender(mailJob.senderKey as any);

      // Now this uses pre-initialized transporters - super fast!
      await mail(
        mailJob.to,
        mailJob.subject,
        mailJob.html,
        sender,
        mailJob.replyTo || undefined
      );

      // Success: Delete from queue
      await prisma.mailQueue.delete({
        where: { id: mailJob.id },
      });

      console.log(`✅ Sent and deleted: ${mailJob.id}`);

    } catch (error: any) {
      console.error(`❌ Failed: ${mailJob.id} - ${error.message}`);

      const updated = await prisma.mailQueue.update({
        where: { id: mailJob.id },
        data: {
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          error: error.message,
        },
      });

      if (updated.attempts >= 3) {
        await prisma.mailQueue.delete({
          where: { id: mailJob.id },
        });
        console.warn(`🗑️ Deleted after 3 attempts: ${mailJob.id}`);
      }
    }

    // Small delay between sends
    await new Promise(resolve => setTimeout(resolve, 1));
  }
}
