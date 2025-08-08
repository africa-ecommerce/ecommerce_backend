import { emailConfigs, prisma } from "../../config";
import { mail } from "../../lib/mail";




export async function queueMail({
  to,
  subject,
  html,
  senderKey,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  senderKey: string;
  replyTo?: string;
}) {
  

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
      createdAt: new Date(),
    },
  });

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
    const baseUrl = process.env.BACKEND_URL;
    if (!baseUrl) {
      return;
    }

    fetch(`${baseUrl}/mail/processQueuedMail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

  } catch (error: any) {
    console.error(`⚠️ Trigger setup error: ${error.message}`);
  }
}

export function senderKeyToMailSender(key: keyof typeof emailConfigs) {
  const sender = emailConfigs[key];
  if (!sender) throw new Error(`Invalid senderKey: ${key}`);
  return sender;
}

export async function startBackgroundProcessor(
) {


  const mails = await prisma.mailQueue.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  if (mails.length === 0) {
    return;
  }


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
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
