// import { prisma } from "../../config";
// import cron from "node-cron";
// import dotenv from "dotenv";

// dotenv.config();

// // Keep track of active scheduled tasks
// const scheduledPaymentTasks = new Map();

// /**
//  * Process all locked payments that have reached their 3-day unlock date
//  */
// export const processLockedPayments = async () => {
//   try {
//     const now = new Date();
//     const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

//     // Find all orders that were delivered 3+ days ago and have locked payments
//     const ordersToProcess = await prisma.order.findMany({
//       where: {
//         status: "DELIVERED",
//         updatedAt: {
//           lte: threeDaysAgo,
//         },
//       },
//       include: {
//         orderItems: true,
//       },
//     });

//     if (ordersToProcess.length === 0) {
//       return 0;
//     }

//     // Get all plug payments and supplier payments for these orders
//     const orderIds = ordersToProcess.map((order) => order.id);

//     const plugPayments = await prisma.plugPayment.findMany({
//       where: {
//         orderId: { in: orderIds },
//         status: "LOCKED",
//       },
//     });

//     const supplierPayments = await prisma.supplierPayment.findMany({
//       where: {
//         orderId: { in: orderIds },
//         status: "LOCKED",
//       },
//     });

//     console.log(
//       `Processing ${
//         ordersToProcess.length
//       } orders with locked payments at ${now.toISOString()}`
//     );

//     let processedCount = 0;

//     // Process each order
//     for (const order of ordersToProcess) {
      
//         const updates = [];

//         // Find and update plug payment for this order
//         const plugPayment = plugPayments.find((p) => p.orderId === order.id);
//         if (plugPayment) {
//           updates.push(
//             prisma.plugPayment.update({
//               where: { id: plugPayment.id },
//               data: {
//                 status: "OPENED",
//                 updatedAt: new Date(),
//               },
//             })
//           );
//         }

//         // Find and update supplier payments for this order
//         const orderSupplierPayments = supplierPayments.filter(
//           (p) => p.orderId === order.id
//         );
//         for (const supplierPayment of orderSupplierPayments) {
//           updates.push(
//             prisma.supplierPayment.update({
//               where: { id: supplierPayment.id },
//               data: {
//                 status: "OPENED",
//                 updatedAt: new Date(),
//               },
//             })
//           );
//         }

//         // Execute all updates
//         if (updates.length > 0) {
//           await Promise.all(updates);
//           processedCount++;

//           console.log(
//             `Unlocked payments for order ${order.id}`
//           );
//         }
      
//     }

//     console.log(`Successfully processed ${processedCount} payment unlocks`);
//     return processedCount;
//   } catch (error) {
//     console.error("Error processing locked payments:", error);
//     throw error;
//   }
// };

// /**
//  * Calculate appropriate schedule for payment processing based on time remaining
//  * @param deliveryDate The date when the order was delivered
//  * @returns An object with schedule information
//  */
// const calculatePaymentSchedule = (deliveryDate: Date) => {
//   const now = new Date();
//   const unlockDate = new Date(deliveryDate.getTime() + 3 * 24 * 60 * 60 * 1000);
//   const timeDiff = unlockDate.getTime() - now.getTime();
//   const hoursDiff = timeDiff / (1000 * 60 * 60);
//   const daysDiff = hoursDiff / 24;

//   // Define check frequencies based on proximity to unlock date
//   if (timeDiff <= 0) {
//     // Already due or past due - immediate execution
//     return {
//       pattern: "* * * * * *", // every second
//       frequency: "immediate",
//       isImmediate: true,
//     };
//   } else if (hoursDiff < 1) {
//     // Less than 1 hour - check every 15 minutes
//     return {
//       pattern: "*/15 * * * *",
//       frequency: "every 15 minutes",
//       isImmediate: false,
//     };
//   } else if (hoursDiff < 6) {
//     // Less than 6 hours - check every hour
//     return {
//       pattern: "0 * * * *",
//       frequency: "every hour",
//       isImmediate: false,
//     };
//   } else if (hoursDiff < 24) {
//     // Less than 24 hours - check every 6 hours
//     return {
//       pattern: "0 */6 * * *",
//       frequency: "every 6 hours",
//       isImmediate: false,
//     };
//   } else if (daysDiff < 2) {
//     // Less than 2 days - check every 12 hours
//     return {
//       pattern: "0 */12 * * *",
//       frequency: "every 12 hours",
//       isImmediate: false,
//     };
//   } else {
//     // More than 2 days - check once per day
//     return {
//       pattern: "0 0 * * *", // once at midnight
//       frequency: "once per day",
//       isImmediate: false,
//     };
//   }
// };

// /**
//  * Schedule the next payment processing check
//  * This dynamically adjusts frequency as the unlock date approaches
//  */
// export const scheduleNextPaymentProcessing = async () => {
//   try {
//     // Clean up existing tasks before scheduling new ones
//     for (const [id, task] of scheduledPaymentTasks.entries()) {
//       task.stop();
//       scheduledPaymentTasks.delete(id);
//     }

//     // Find all orders with locked payments by checking both payment tables
//     const lockedPlugPayments = await prisma.plugPayment.findMany({
//       where: { status: "LOCKED" },
//       select: { orderId: true },
//     });

//     const lockedSupplierPayments = await prisma.supplierPayment.findMany({
//       where: { status: "LOCKED" },
//       select: { orderId: true },
//     });

//     // Get unique order IDs with locked payments
//     const lockedOrderIds = [
//       ...new Set([
//         ...lockedPlugPayments.map((p) => p.orderId),
//         ...lockedSupplierPayments.map((p) => p.orderId),
//       ]),
//     ];

//     if (lockedOrderIds.length === 0) {
//       console.log("No locked payments. Payment processor will be inactive.");
//       return;
//     }

//     // Find orders with locked payments
//     const lockedPaymentOrders = await prisma.order.findMany({
//       where: {
//         id: { in: lockedOrderIds },
//         status: "DELIVERED",
//       },
//       orderBy: {
//         updatedAt: "asc", // Get the earliest delivered orders first
//       },
//     });

//     if (lockedPaymentOrders.length === 0) {
//       console.log("No delivered orders with locked payments found.");
//       return;
//     }

//     // Find the earliest delivery to determine optimal check frequency
//     const earliestOrder = lockedPaymentOrders[0];
//     const deliveryDate = new Date(earliestOrder.updatedAt);
//     const schedule = calculatePaymentSchedule(deliveryDate);

//     if (schedule.isImmediate) {
//       // Process immediately if already due
//       console.log("Some payments are past due, processing immediately");
//       await processLockedPayments();

//       // Reschedule in case there are more payments
//       await scheduleNextPaymentProcessing();
//       return;
//     }

//     // Set up the dynamic check task
//     const masterPaymentTask = cron.schedule(schedule.pattern, async () => {
//       const processedCount = await processLockedPayments();

//       // After processing payments, recalculate the schedule
//       await scheduleNextPaymentProcessing();
//     });

//     scheduledPaymentTasks.set("master", masterPaymentTask);

//   } catch (error) {
//     console.error("Error scheduling payment processing:", error);
//   }
// };

// /**
//  * Schedule payment processing for a specific order, called when an order is delivered
//  * This is the main entry point that should be called from the deliveredOrder endpoint
//  */
// export const scheduleOrderPaymentProcessing = async (
//   orderId: string,
//   deliveryDate: Date
// ) => {
//   try {
//     //unlock date is 3 days after delivery
//     const unlockDate = new Date(
//       deliveryDate.getTime() + 3 * 24 * 60 * 60 * 1000
//     );

//     console.log(
//       `Scheduling payment processing for order ${orderId}: Delivered ${deliveryDate.toISOString()} → Unlock ${unlockDate.toISOString()}`
//     );

//     // This will start the scheduler or adjust the existing schedule as needed
//     await scheduleNextPaymentProcessing();

//     console.log(`Payment processor started or adjusted for order ${orderId}`);
//     return true;
//   } catch (error) {
//     console.error(
//       `Error scheduling payment processing for order ${orderId}:`,
//       error
//     );
//     return false;
//   }
// };

// /**
//  * Initialize the payment processing scheduler when the application starts
//  * This ensures any pending payments from before server restart are processed
//  */
// export const initializePaymentProcessingScheduler = async () => {
//   console.log("Initializing payment processing scheduler...");

//   // First, check if there are any past-due payments that need immediate processing
//   const processedCount = await processLockedPayments();

//   if (processedCount > 0) {
//     console.log(`Processed ${processedCount} past-due payments on startup`);
//   }

//   // Then set up the regular schedule for any remaining locked payments
//   await scheduleNextPaymentProcessing();

//   console.log("Payment processing scheduler initialized successfully");
// };

// /**
//  * Handle graceful shutdown of the payment processor
//  */
// export const shutdownPaymentProcessingScheduler = () => {
//   console.log("Shutting down payment processing scheduler...");

//   // Stop all scheduled tasks
//   for (const [id, task] of scheduledPaymentTasks.entries()) {
//     task.stop();
//     scheduledPaymentTasks.delete(id);
//   }

//   console.log("Payment processing scheduler shut down successfully");
// };
