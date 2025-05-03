// src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { port,  } from "./config";
import authRoutes from "./routes/auth.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import productRoutes from "./routes/product.routes";
import plugProductRoutes from "./routes/plugProduct.routes";
import { RedisStore } from "connect-redis";
import session from "express-session";
import passport from "./config/passport";
import { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { cookieConfig } from "./helper/token";
import { initializeBuckets } from "./config/minio";
import { initializePriceUpdateScheduler, shutdownPriceUpdateScheduler } from "./helper/workers/priceUpdater";




const app = express();
app.use(cookieParser());

// Then: Body parsers
app.use(express.json()); // For JSON bodies
app.use(express.urlencoded({ extended: true })); // For URL-encoded bodies


// Only allow requests from your frontend URL
const corsOptions = {
  origin: process.env.APP_URL, // Replace with your frontend's URL
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  credentials: true, // Required for cookies
};

app.use(cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", process.env.APP_URL!],
      },
    },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.use(morgan("dev"));



// // Configure session middleware -> passport need this internally
app.use(
  session({
    secret: process.env.SESSION_SECRET! || "yourSecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      ...cookieConfig,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);


// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Initialize MinIO bucket
initializeBuckets()
  .then(() => {
    console.log("MinIO bucket initialized successfully");
  })
  .catch((error) => {
    console.error("Error initializing MinIO bucket:", error);
  });
// // API Routes


// Initialize the smart price update scheduler
initializePriceUpdateScheduler()
  .then(() => {
    console.log("Price update scheduler initialized successfully");
  })
  .catch((error) => {
    console.error("Error initializing price update scheduler:", error);
  });
app.use("/auth", authRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/products", productRoutes);
app.use("/plug/products", plugProductRoutes);

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  // res
  //   .status(500)
  //   .json({ error: "Unexpected error occured!" });
});

const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");

  // First shut down the price update scheduler
  shutdownPriceUpdateScheduler();

  // Then close the server
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");

  // First shut down the price update scheduler
  shutdownPriceUpdateScheduler();

  // Then close the server
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

export default app;