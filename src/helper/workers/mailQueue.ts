import { emailConfigs, prisma } from "../../config";
import { mail } from "../../lib/mail";

// Queue a mail to be sent later
 async function queueMail({
  to,
  subject,
  html,
  senderKey,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  senderKey: keyof typeof emailConfigs;
  replyTo?: string;
}) {

  console.log("mail queued")
  await prisma.mailQueue.create({
    data: {
      to,
      subject,
      html,
      senderKey,
      replyTo,
    },
  });

  // Trigger the processor (runs for ~5s max)
  await processMailQueueFor(5000);
}

// Background processor: sends queued mail in batches
export async function processMailQueueFor(durationMs = 5000) {
  const stopAt = Date.now() + durationMs;

  while (Date.now() < stopAt) {
    const next = await prisma.mailQueue.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (!next) break;
    const sender = emailConfigs[next.senderKey as keyof typeof emailConfigs];
    if (!sender) {
      console.error("❌ Invalid senderKey:", next.senderKey);
      await prisma.mailQueue.update({
        where: { id: next.id },
        data: { status: "FAILED", attempts: { increment: 1 } },
      });
      continue;
    }

    try {
      const info = await mail(
        next.to,
        next.subject,
        next.html,
        sender,
        next.replyTo || undefined
      );

      console.log(`📨 Sent from ${sender.user} → ${next.to}`, info.messageId);

      await prisma.mailQueue.delete({ where: { id: next.id } });
    } catch (err) {
      console.error("❌ Failed to send queued mail:", err);
      await prisma.mailQueue.update({
        where: { id: next.id },
        data: {
          attempts: { increment: 1 },
          status: "FAILED",
        },
      });
    }
  }
}


// Simple helper to enqueue a mail and trigger the processor
export async function sendQueuedMail({
  to,
  subject,
  html,
  senderKey,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  senderKey: "orders" | "admin" | "noreply"; // Add other keys if needed
  replyTo?: string;
}) {
  try {
    await queueMail({ to, subject, html, senderKey, replyTo });
  } catch (err) {
    console.error("Failed to queue mail:", err);
  }
}