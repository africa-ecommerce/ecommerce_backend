import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { frontendUrl, backendUrl, minioBaseUrl, port, sessionSecret } from "./config";
import authRoutes from "./routes/auth.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import productRoutes from "./routes/product.routes";
import plugProductRoutes from "./routes/plugProduct.routes";
import publicRoutes from "./routes/public.routes";
import storeRoutes from "./routes/store.routes";
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
import logisticsRoutes from "./routes/logistics.routes";
import orderRoutes from "./routes/order.routes";
import linksRoutes from "./routes/links.routes";
import analyticsRoutes from "./routes/analytics.routes";
import paymentsRoutes from "./routes/payment.routes";
import path from "path";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import {
  initializePaymentProcessingScheduler,
  shutdownPaymentProcessingScheduler,
} from "./helper/workers/paymentProcessor";
import { routeErrorCatcher } from "./middleware/error.middleware";
import { errorMail } from "./helper/mail/dev/errorMail";
import contactSupportRoutes from "./routes/contactSupport.routes";
const router = express.Router();


// Load environment variables
dotenv.config();

const app = express();

// Ensure Express trusts reverse proxy like nginx or rewrites
app.set("trust proxy", true);

// GLOBAL RATE LIMITER (per IP + METHOD + PATH)
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP+method+path to 200 calls per window
  message: {
    error: "Too many attempts, Try again in 15 minutes!",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) =>
    // skip static assets and template files
    req.path.startsWith("/template") ||
    req.path.startsWith("/public") ||
    req.path === "/favicon.ico",
  keyGenerator: (req: Request) => {
    // IP + HTTP method + path as the bucket key
    return `${req.ip}-${req.method}-${req.path}`;
  },
});

// Body parsers
app.use(express.json({ limit: "1mb" })); // For JSON bodies
app.use(express.urlencoded({ limit: "1mb", extended: true })); // For URL-encoded bodies

app.use(globalRateLimiter);


const corsOptions = {
  origin: function (origin:any, callback: any) {
    if (!origin) return callback(null, true); // Allow non-browser clients

    const allowedOrigins = [
      "https://pluggn.store",
      "https://*.pluggn.store",
      frontendUrl, // frontend URL
      backendUrl
    ];

    const subdomainPattern = /^https:\/\/([a-z0-9-]+)\.pluggn\.store$/;

    if (allowedOrigins.includes(origin) || subdomainPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [
          "'self'",
          frontendUrl,
          backendUrl,
          "https://pluggn.store",
          "https://*.pluggn.store",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          frontendUrl,
          "https://pluggn.store",
          "https://*.pluggn.store",
          backendUrl,
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          frontendUrl,
          "https://pluggn.store",
          "https://*.pluggn.store",
          "https://fonts.googleapis.com",
          backendUrl,
        ],
        imgSrc: [
          "'self'",
          "data:",
          minioBaseUrl,
          frontendUrl,
          "https://pluggn.store",
          "https://*.pluggn.store",
          backendUrl,
        ],
        connectSrc: [
          "'self'",
          frontendUrl,
          "https://pluggn.store",
          "https://*.pluggn.store",
          backendUrl,
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://fonts.googleapis.com",
        ],
      },
    },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
  })
);



//cookie parser
app.use(cookieParser());

// Serve static files from the public directory
// This makes files in the public folder directly accessible via their path

app.use(express.static(path.join(__dirname, "../public")));

const corsStaticHeaders = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (origin.endsWith(".pluggn.store") ||
      origin === "https://pluggn.store" ||
      origin === "https://www.pluggn.store" ||
      origin === frontendUrl)
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  next();
};

// CORS Preflight for /template/*
app.options("/template/*", (req, res) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (origin.endsWith(".pluggn.store") ||
      origin === "https://pluggn.store" ||
      origin === "https://www.pluggn.store" ||
      origin === frontendUrl)
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
    res.status(204).send();
  } else {
    res.status(403).send("CORS Forbidden");
  }
});

// Image route with CORS
app.use("/image", corsStaticHeaders);
app.use(
  "/image",
  express.static(path.join(__dirname, "../public/image"), {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  })
);

// Template route with CORS and caching
app.use("/template", corsStaticHeaders);
app.use(
  "/template",
  express.static(path.join(__dirname, "../public/templates"), {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  })
);

app.use(morgan("dev"));

// Configure session middleware -> passport need this internally due to this version or so
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      ...cookieConfig,
      maxAge: 1000, // EXPIRES IMMEDIATELY NOT NEEDED
    },
  })
);

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//initializers

// Initialize MinIO bucket
initializeBuckets()
  .then(() => {
    console.log("MinIO bucket initialized successfully");
  })
  .catch((error) => {
    console.error("Error initializing MinIO bucket:", error);
  });

//schedulers

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

// Initialize the payment processing scheduler to handle any locked payments from before restart
// This processes past-due payments and sets up schedule for future ones
initializePaymentProcessingScheduler()
  .then(() => {
    console.log(
      "Payment processing scheduler initialized to handle locked payments"
    );
  })
  .catch((error) => {
    console.error("Error initializing payment processing scheduler:", error);
  });

//Routes
app.use("/auth", authRoutes, routeErrorCatcher);
app.use("/onboarding", onboardingRoutes, routeErrorCatcher);
app.use("/marketplace", marketPlaceRoutes, routeErrorCatcher);
app.use("/products", productRoutes, routeErrorCatcher);
app.use("/plug/products", plugProductRoutes, routeErrorCatcher);
app.use("/template", templateRoutes, routeErrorCatcher);
app.use("/site", storeRoutes, routeErrorCatcher); // ------------->
app.use("/public", publicRoutes, routeErrorCatcher);
app.use("/logistics", logisticsRoutes, routeErrorCatcher);
app.use("/orders", orderRoutes, routeErrorCatcher);
app.use("/links", linksRoutes, routeErrorCatcher);
app.use("/analytics", analyticsRoutes, routeErrorCatcher);
app.use("/payments", paymentsRoutes, routeErrorCatcher);
app.use("/contact-support", contactSupportRoutes, routeErrorCatcher);

// Global error handling middleware
app.use(async(err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error:", err);


  try {
    await errorMail(req, err);
  } catch (mailErr) {
    console.error("Failed to send global error email:", mailErr);
  }
  // Serve error.html
  res
    .status(500)
    .sendFile(path.join(__dirname, "../public/templates/primary/error.html"));
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on 0.0.0.0:${port}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");

  // First shut down both schedulers
  shutdownPriceUpdateScheduler();
  shutdownPaymentProcessingScheduler();

  // Then close the server
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");

  // First shut down both schedulers
  shutdownPriceUpdateScheduler();
  shutdownPaymentProcessingScheduler();

  // Then close the server
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

export default app;
