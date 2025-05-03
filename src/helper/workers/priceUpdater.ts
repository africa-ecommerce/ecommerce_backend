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
 * - Uses midnight for first two days
 * - Uses more frequent checks on the final day
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

      // Set up a daily check at midnight just to catch any newly added updates
      const dailyTask = cron.schedule("0 0 * * *", async () => {
        console.log("Running daily check for new pending updates...");
        await scheduleNextPendingPrices();
      });

      scheduledTasks.set("daily", dailyTask);
      console.log("Scheduled daily check at midnight");
      return;
    }

    const now = new Date();

    // Schedule individual tasks for each product
    for (const product of pendingProducts) {
      const effectiveDate = new Date(product.priceEffectiveAt!);
      const timeDiff = effectiveDate.getTime() - now.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      if (daysDiff <= 0) {
        // Update is already due - process immediately
        console.log(
          `Update for product ${product.id} is already due, processing immediately`
        );
        await processPendingPrices();
      } else if (daysDiff < 1) {
        // Less than 1 day remaining - check every 15 minutes
        console.log(
          `Scheduling product ${product.id} to update every 15 minutes (last day)`
        );
        const task = cron.schedule("*/15 * * * *", async () => {
          await processPendingPrices();
        });
        scheduledTasks.set(product.id, task);
      } else if (daysDiff < 2) {
        // Between 1-2 days remaining - check every hour
        console.log(
          `Scheduling product ${product.id} to update hourly (second day)`
        );
        const task = cron.schedule("0 * * * *", async () => {
          await processPendingPrices();
        });
        scheduledTasks.set(product.id, task);
      } else {
        // More than 2 days remaining - check at midnight
        console.log(
          `Scheduling product ${product.id} to update at midnight (early days)`
        );
        const task = cron.schedule("0 0 * * *", async () => {
          await processPendingPrices();
        });
        scheduledTasks.set(product.id, task);
      }
    }

    console.log(`Scheduled ${pendingProducts.length} pending price updates`);
  } catch (error) {
    console.error("Error scheduling pending price updates:", error);
  }
};

/**
 * Schedule an individual product update, called when a new price update is created
 */
export const scheduleProductUpdate = async (productId: string, effectiveDate: Date) => {
  try {
    const now = new Date();
    const timeDiff = effectiveDate.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    // Stop any existing scheduled task for this product
    if (scheduledTasks.has(productId)) {
      scheduledTasks.get(productId).stop();
      scheduledTasks.delete(productId);
    }

    if (daysDiff <= 0) {
      // Update is already due - process immediately
      console.log(
        `Update for product ${productId} is already due, processing immediately`
      );
      await processPendingPrices();
    } else if (daysDiff < 1) {
      // Less than 1 day remaining - check every 15 minutes
      console.log(
        `Scheduling product ${productId} to update every 15 minutes (last day)`
      );
      const task = cron.schedule("*/15 * * * *", async () => {
        await processPendingPrices();
      });
      scheduledTasks.set(productId, task);
    } else if (daysDiff < 2) {
      // Between 1-2 days remaining - check every hour
      console.log(
        `Scheduling product ${productId} to update hourly (second day)`
      );
      const task = cron.schedule("0 * * * *", async () => {
        await processPendingPrices();
      });
      scheduledTasks.set(productId, task);
    } else {
      // More than 2 days remaining - check at midnight
      console.log(
        `Scheduling product ${productId} to update at midnight (early days)`
      );
      const task = cron.schedule("0 0 * * *", async () => {
        await processPendingPrices();
      });
      scheduledTasks.set(productId, task);
    }

    console.log(
      `Scheduled update for product ${productId} effective at ${effectiveDate}`
    );
  } catch (error) {
    console.error(`Error scheduling update for product ${productId}:`, error);
  }
};

// Initialize the scheduler when the application starts
export const initializePriceUpdateScheduler = async () => {
  console.log("Initializing price update scheduler...");
  await scheduleNextPendingPrices();
  console.log("Price update scheduler initialized");
};
