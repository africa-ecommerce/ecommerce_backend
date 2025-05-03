import { prisma } from "../../config";
import cron from "node-cron";

// Keep track of active scheduled tasks
const scheduledTasks = new Map();

/**
 * Process all pending price updates that have reached their effective date
 */
export const processPendingPrices = async () => {
  try {
    const now = new Date();
    console.log(`Processing pending prices at ${now.toISOString()}`);

    // Find all products with pending price updates that should be active now
    const productsToUpdate = await prisma.plugProduct.findMany({
      where: {
        priceEffectiveAt: {
          lte: now,
        },
        pendingPrice: { not: null },
      },
    });

    if (productsToUpdate.length === 0) {
      console.log("No pending price updates to process");
      return 0;
    }

    console.log(
      `Found ${productsToUpdate.length} products with pending price updates`
    );

    // Process each product update
    for (const product of productsToUpdate) {
      const newPrice = product.pendingPrice as number;

      await prisma.plugProduct.update({
        where: { id: product.id },
        data: {
          price: newPrice,
          pendingPrice: null,
          priceEffectiveAt: null,
          lastPriceUpdateAt: new Date(), // Track when the price was actually updated
        },
      });

      console.log(
        `Updated price for product ${product.id} from ${product.price} to ${newPrice}`
      );

      // Remove scheduled task for this product if it exists
      if (scheduledTasks.has(product.id)) {
        scheduledTasks.get(product.id).stop();
        scheduledTasks.delete(product.id);
        console.log(`Removed scheduled task for product ${product.id}`);
      }
    }

    console.log(`Successfully updated ${productsToUpdate.length} prices`);
    return productsToUpdate.length;
  } catch (error) {
    console.error("Error processing pending prices:", error);
    throw error;
  }
};

/**
 * Schedule the next pending price update check
 * This runs more frequently as the effective date approaches
 */
export const scheduleNextPendingPrices = async () => {
  try {
    // Clear any existing scheduled tasks
    for (const [id, task] of scheduledTasks.entries()) {
      task.stop();
      scheduledTasks.delete(id);
    }

    // Find all products with pending price updates
    const pendingProducts = await prisma.plugProduct.findMany({
      where: {
        pendingPrice: { not: null },
        priceEffectiveAt: { not: null },
      },
      orderBy: {
        priceEffectiveAt: "asc", // Get the earliest ones first
      },
    });

    if (pendingProducts.length === 0) {
      console.log("No pending price updates to schedule");

      // Set up a check every 3 hours to catch any newly added updates
      // This ensures we don't miss updates even if the server restarted
      const periodicTask = cron.schedule("0 */3 * * *", async () => {
        console.log("Running periodic check for new pending updates...");
        await processPendingPrices();
      });

      scheduledTasks.set("periodic", periodicTask);
      console.log("Scheduled periodic check every 3 hours");
      return;
    }

    const now = new Date();

    // Find the earliest effective date
    const earliestUpdate = pendingProducts[0];
    const earliestDate = new Date(earliestUpdate.priceEffectiveAt!);
    const timeDiff = earliestDate.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    // Schedule a master task based on the earliest pending update
    let masterSchedule;

    if (daysDiff <= 0) {
      // Updates are already due - process immediately and set up frequent checks
      console.log("Some updates are already due, processing immediately");
      await processPendingPrices();
      masterSchedule = "*/5 * * * *"; // Check every 5 minutes
    } else if (daysDiff < 1) {
      // Less than 1 day remaining - check every 5 minutes
      masterSchedule = "*/5 * * * *";
    } else if (daysDiff < 2) {
      // Between 1-2 days remaining - check every 30 minutes
      masterSchedule = "*/30 * * * *";
    } else {
      // More than 2 days remaining - check every 3 hours
      masterSchedule = "0 */3 * * *";
    }

    // Set up the master task
    const masterTask = cron.schedule(masterSchedule, async () => {
      await processPendingPrices();

      // After processing, reconfigure the schedule if needed
      const remainingProducts = await prisma.plugProduct.count({
        where: {
          pendingPrice: { not: null },
          priceEffectiveAt: { not: null },
        },
      });

      if (remainingProducts === 0) {
        // No more pending updates, reschedule with a less frequent check
        masterTask.stop();
        await scheduleNextPendingPrices();
      }
    });

    scheduledTasks.set("master", masterTask);
    console.log(`Scheduled master task with pattern: ${masterSchedule}`);

    // Log individual products for visibility
    for (const product of pendingProducts) {
      const effectiveDate = new Date(product.priceEffectiveAt!);
      console.log(
        `Product ${
          product.id
        } scheduled for price update at ${effectiveDate.toISOString()}`
      );
    }
  } catch (error) {
    console.error("Error scheduling pending price updates:", error);
  }
};

/**
 * Schedule an individual product update, called when a new price update is created
 */
export const scheduleProductUpdate = async (
  productId: string,
  effectiveDate: Date
) => {
  try {
    // Instead of creating a new task for each product,
    // simply ensure the master scheduler is configured correctly

    // Check if we already have a master task
    if (!scheduledTasks.has("master")) {
      // No master task, set up the scheduler
      await scheduleNextPendingPrices();
    } else {
      // Already have a master task, but we might need to update its frequency
      // if this new update is happening sooner than current ones
      const now = new Date();
      const timeDiff = effectiveDate.getTime() - now.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      // If this is going to happen soon, reschedule everything
      if (daysDiff < 1) {
        await scheduleNextPendingPrices();
      }
    }

    console.log(
      `Product ${productId} scheduled for price update at ${effectiveDate.toISOString()}`
    );
  } catch (error) {
    console.error(`Error scheduling update for product ${productId}:`, error);
  }
};

// Initialize the scheduler when the application starts
export const initializePriceUpdateScheduler = async () => {
  console.log("Initializing price update scheduler...");

  // First, check if there are any past-due updates that need immediate processing
  await processPendingPrices();

  // Then set up the regular schedule
  await scheduleNextPendingPrices();

  console.log("Price update scheduler initialized");

  // Set up a daily backup check just to be safe
  const dailyBackupTask = cron.schedule("0 0 * * *", async () => {
    console.log("Running daily backup check for price updates...");
    await processPendingPrices();
  });

  scheduledTasks.set("daily-backup", dailyBackupTask);
};

// Add a function to handle a graceful shutdown
export const shutdownPriceUpdateScheduler = () => {
  console.log("Shutting down price update scheduler...");

  // Stop all scheduled tasks
  for (const [id, task] of scheduledTasks.entries()) {
    task.stop();
    scheduledTasks.delete(id);
  }

  console.log("Price update scheduler shut down");
};
