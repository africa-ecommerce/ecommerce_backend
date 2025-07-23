// import { prisma } from "../../config";
// import cron from "node-cron";
// import dotenv from "dotenv";

// dotenv.config();

// // Keep track of active scheduled tasks
// const scheduledTasks = new Map();

// /**
//  * Process all pending price updates that have reached their effective date
//  */
// export const processPendingPrices = async () => {
//   try {
//     const now = new Date();

//     // Find all products with pending price updates that should be active now
//     const productsToUpdate = await prisma.plugProduct.findMany({
//       where: {
//         priceEffectiveAt: {
//           lte: now,
//         },
//         pendingPrice: { not: null },
//       },
//     });

//     if (productsToUpdate.length === 0) {
//       // Only log when debug is enabled
//       if (process.env.DEBUG === "true") {
//         console.log("No pending price updates to process");
//       }
//       return 0;
//     }

//     console.log(
//       `Processing ${
//         productsToUpdate.length
//       } pending price updates at ${now.toISOString()}`
//     );

//     // Process each product update
//     for (const product of productsToUpdate) {
//       const newPrice = product.pendingPrice as number;
//       const oldPrice = product.price;

//       await prisma.plugProduct.update({
//         where: { id: product.id },
//         data: {
//           price: newPrice,
//           pendingPrice: null,
//           priceEffectiveAt: null,
//           lastPriceUpdateAt: new Date(), // Track when the price was actually updated
//         },
//       });

//       console.log(
//         `Updated price for product ${product.id} from ${oldPrice} to ${newPrice}`
//       );
//     }

//     console.log(`Successfully updated ${productsToUpdate.length} prices`);
//     return productsToUpdate.length;
//   } catch (error) {
//     console.error("Error processing pending prices:", error);
//     throw error;
//   }
// };

// /**
//  * Calculate appropriate schedule for price updates based on time remaining
//  * @param effectiveDate The date when the price should be effective
//  * @returns An object with schedule information
//  */
// const calculateSchedule = (effectiveDate: Date) => {
//   const now = new Date();
//   const timeDiff = effectiveDate.getTime() - now.getTime();
//   const minutesDiff = timeDiff / (1000 * 60);
//   const hoursDiff = minutesDiff / 60;
//   const daysDiff = hoursDiff / 24;

//   // Define check frequencies based on proximity to effective date
//   // Follow the specific timing requirement
//   if (minutesDiff <= 0) {
//     // Already due or past due - immediate execution
//     return {
//       pattern: "* * * * * *", // every second
//       frequency: "immediate",
//       isImmediate: true,
//     };
//   } else if (minutesDiff < 1) {
//     // Less than a minute - check every second
//     return {
//       pattern: "* * * * * *",
//       frequency: "every second",
//       isImmediate: false,
//     };
//   } else if (minutesDiff < 15) {
//     // Less than 15 minutes - check every minute
//     return {
//       pattern: "* * * * *",
//       frequency: "every minute",
//       isImmediate: false,
//     };
//   } else if (hoursDiff < 1) {
//     // Less than 1 hour - check every 15 minutes
//     return {
//       pattern: "*/15 * * * *",
//       frequency: "every 15 minutes",
//       isImmediate: false,
//     };
//   } else if (hoursDiff < 2) {
//     // Less than 2 hours - check every 30 minutes
//     return {
//       pattern: "*/30 * * * *",
//       frequency: "every 30 minutes",
//       isImmediate: false,
//     };
//   } else if (hoursDiff < 6) {
//     // Less than 6 hours - check every hour
//     return {
//       pattern: "0 * * * *",
//       frequency: "every hour",
//       isImmediate: false,
//     };
//   } else if (hoursDiff < 12) {
//     // Less than 12 hours - check every 6 hours
//     return {
//       pattern: "0 */6 * * *",
//       frequency: "every 6 hours",
//       isImmediate: false,
//     };
//   } else if (hoursDiff < 24) {
//     // Less than 24 hours - check every 12 hours
//     return {
//       pattern: "0 */12 * * *",
//       frequency: "every 12 hours",
//       isImmediate: false,
//     };
//   } else {
//     // More than 1 day - check once per day
//     return {
//       pattern: "0 0 * * *", // once at midnight
//       frequency: "once per day",
//       isImmediate: false,
//     };
//   }
// };

// /**
//  * Schedule the next pending price update check
//  * This dynamically adjusts frequency as the effective date approaches
//  */
// export const scheduleNextPendingPrices = async () => {
//   try {
//     // Clean up existing tasks before scheduling new ones
//     for (const [id, task] of scheduledTasks.entries()) {
//       task.stop();
//       scheduledTasks.delete(id);
//     }

//     // Find all products with pending price updates
//     const pendingProducts = await prisma.plugProduct.findMany({
//       where: {
//         pendingPrice: { not: null },
//         priceEffectiveAt: { not: null },
//       },
//       orderBy: {
//         priceEffectiveAt: "asc", // Get the earliest ones first
//       },
//     });

//     if (pendingProducts.length === 0) {
//       console.log("No pending price updates. Scheduler will be inactive.");
//       return;
//     }

//     // Find the earliest update to determine optimal check frequency
//     const earliestUpdate = pendingProducts[0];
//     const earliestDate = new Date(earliestUpdate.priceEffectiveAt!);
//     const schedule = calculateSchedule(earliestDate);

//     if (schedule.isImmediate) {
//       // Process immediately if already due
//       console.log("Some updates are past due, processing immediately");
//       await processPendingPrices();

//       // Reschedule in case there are more updates
//       await scheduleNextPendingPrices();
//       return;
//     }

//     // Set up the dynamic check task
//     const masterTask = cron.schedule(schedule.pattern, async () => {
//       const updatedCount = await processPendingPrices();

//       // After processing updates, recalculate the schedule
//       await scheduleNextPendingPrices();
//     });

//     scheduledTasks.set("master", masterTask);
//     console.log(
//       `Scheduled price update checks ${
//         schedule.frequency
//       } (next update at ${earliestDate.toISOString()})`
//     );

//     // Log summary of upcoming updates (limited to first 5)
//     const displayLimit = Math.min(pendingProducts.length, 5);
//     console.log(
//       `Next ${displayLimit} of ${pendingProducts.length} pending price updates:`
//     );

//     for (let i = 0; i < displayLimit; i++) {
//       const product = pendingProducts[i];
//       const effectiveDate = new Date(product.priceEffectiveAt!);
//       console.log(
//         `- Product ${product.id}: ${product.price} → ${
//           product.pendingPrice
//         } at ${effectiveDate.toISOString()}`
//       );
//     }
//   } catch (error) {
//     console.error("Error scheduling pending price updates:", error);
//   }
// };

// /**
//  * Schedule an individual product update, called when a new price update is created
//  * This is the main entry point that should be called from the endpoint
//  */
// export const scheduleProductUpdate = async (
//   productId: string,
//   effectiveDate: Date
// ) => {
//   try {
//     // Get the current product to include in log
//     const product = await prisma.plugProduct.findUnique({
//       where: { id: productId },
//     });

//     if (!product) {
//       console.error(
//         `Cannot schedule update for non-existent product ${productId}`
//       );
//       return;
//     }

//     console.log(
//       `Scheduling price update for product ${productId}: ${product.price} → ${
//         product.pendingPrice
//       } at ${effectiveDate.toISOString()}`
//     );

//     // This will start the scheduler or adjust the existing schedule as needed
//     await scheduleNextPendingPrices();

//     console.log(
//       `Price update scheduler started or adjusted for product ${productId}`
//     );
//     return true;
//   } catch (error) {
//     console.error(`Error scheduling update for product ${productId}:`, error);
//     return false;
//   }
// };

// /**
//  * Initialize the price update scheduler when the application starts
//  * This ensures any pending updates from before server restart are processed
//  */
// export const initializePriceUpdateScheduler = async () => {
//   console.log("Initializing price update scheduler...");

//   // First, check if there are any past-due updates that need immediate processing
//   const processedCount = await processPendingPrices();

//   if (processedCount > 0) {
//     console.log(`Processed ${processedCount} past-due updates on startup`);
//   }

//   // Then set up the regular schedule for any remaining pending updates
//   await scheduleNextPendingPrices();

//   console.log("Price update scheduler initialized successfully");
// };

// /**
//  * Handle graceful shutdown of the scheduler
//  */
// export const shutdownPriceUpdateScheduler = () => {
//   console.log("Shutting down price update scheduler...");

//   // Stop all scheduled tasks
//   for (const [id, task] of scheduledTasks.entries()) {
//     task.stop();
//     scheduledTasks.delete(id);
//   }

//   console.log("Price update scheduler shut down successfully");
// };
