// import { emailConfigs, prisma } from "../../config";
// import { mail } from "../../lib/mail";

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



// src/workers/mailQueue.ts

import { prisma, emailConfigs } from "../../config";
import { mail } from "../../lib/mail";

// In-memory lock to prevent overlapping processors
let isProcessing = false;

export async function processMailQueueFor(durationMs = 5000) {
  if (isProcessing) return;
  isProcessing = true;

  const stopAt = Date.now() + durationMs;

  try {
    while (Date.now() < stopAt) {
      const queuedMail = await prisma.mailQueue.findFirst({
        where: { status: "PENDING", attempts: { lt: 3 } },
        orderBy: { createdAt: "asc" },
      });

      if (!queuedMail) break;

      const sender =
        emailConfigs[queuedMail.senderKey as keyof typeof emailConfigs];
      if (!sender) {
        console.error("Invalid senderKey:", queuedMail.senderKey);
        await failMail(queuedMail.id);
        continue;
      }

      try {
        const info = await mail(
          queuedMail.to,
          queuedMail.subject,
          queuedMail.html,
          sender,
          queuedMail.replyTo || undefined
        );

        console.log(`✅ Mail sent: ${info.messageId}`);
        await prisma.mailQueue.delete({ where: { id: queuedMail.id } });
      } catch (err) {
        console.error("❌ Failed to send:", err);
        await prisma.mailQueue.update({
          where: { id: queuedMail.id },
          data: {
            attempts: { increment: 1 },
            status: "FAILED",
          },
        });
      }
    }
  } catch (err) {
    console.error("Mail processor error:", err);
  } finally {
    isProcessing = false;
  }
}

async function failMail(id: string) {
  await prisma.mailQueue.update({
    where: { id },
    data: {
      attempts: { increment: 1 },
      status: "FAILED",
    },
  });
}

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
  senderKey: keyof typeof emailConfigs;
  replyTo?: string;
}) {
  await prisma.mailQueue.create({
    data: { to, subject, html, senderKey, replyTo },
  });

  void processMailQueueFor(5000); // run behind-the-scenes
}