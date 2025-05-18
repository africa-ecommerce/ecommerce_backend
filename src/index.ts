import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { frontendUrl, minioBaseUrl, port, sessionSecret } from "./config";
import authRoutes from "./routes/auth.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import productRoutes from "./routes/product.routes";
import plugProductRoutes from "./routes/plugProduct.routes";
import publicProductRoutes from "./routes/publicProduct.routes";
import siteRoutes from "./routes/site.routes";
import session from "express-session";
import passport from "./config/passport";
import { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { cookieConfig } from "./helper/token";
import { initializeBuckets } from "./config/minio";
import {
  initializePriceUpdateScheduler,
  shutdownPriceUpdateScheduler,
} from "./helper/workers/priceUpdater";
import marketPlaceRoutes from "./routes/marketplace.routes";
import templateRoutes from "./routes/template.routes";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Only allow requests from your frontend URL
const corsOptions = {
  origin: frontendUrl, // Replace with your frontend's URL
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  credentials: true, // Required for cookies
};

// Ensure Express trusts your TLS terminator or proxy
app.set('trust proxy', true);


app.use(cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", minioBaseUrl],
        connectSrc: ["'self'", frontendUrl],
      },
    },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Then: Body parsers
app.use(express.json()); // For JSON bodies
app.use(express.urlencoded({ extended: true })); // For URL-encoded bodies

app.use(cookieParser());
// Serve static files from the public directory
// This makes files in the public folder directly accessible via their path
app.use(express.static(path.join(__dirname, "../public")));

// Serve templates under the "/template" URL prefix
app.use(
  "/template",
  express.static(path.join(__dirname, "../public/templates"))
);

app.use(morgan("dev"));

// Configure session middleware -> passport need this internally
app.use(
  session({
    secret: sessionSecret,
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

// Initialize the price update scheduler to handle any pending updates from before restart
// This only processes immediately due updates and sets up schedule for future ones
initializePriceUpdateScheduler()
  .then(() => {
    console.log(
      "Price update scheduler initialized to handle any pending updates"
    );
  })
  .catch((error) => {
    console.error("Error initializing price update scheduler:", error);
  });

app.use("/auth", authRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/marketplace", marketPlaceRoutes);
app.use("/products", productRoutes);
app.use("/plug/products", plugProductRoutes);
app.use("/template", templateRoutes);
app.use("/site", siteRoutes);
app.use("/public/products", publicProductRoutes);

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Unexpected error occured!" });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on 0.0.0.0:${port}`);
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
