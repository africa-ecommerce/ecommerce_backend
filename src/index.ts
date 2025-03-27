// src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { port, redisClient } from "./config";
import authRoutes from "./routes/auth.routes";
import merchantRoutes from "./routes/merchant.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import analyticsRoutes from "./routes/analytics.routes";
import notificationRoutes from "./routes/notification.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import qrcodeRoutes from "./routes/qrcode.routes";
import logisticsRoutes from "./routes/logistics.routes";
import websiteRoutes from "./routes/website.routes";
// import customerRoutes from "./routes/customer.routes";
import marketplaceRoutes from "./routes/marketplace.routes";
import searchRoutes from "./routes/search.routes";
import whatsappRoutes from "./routes/whatsapp.routes"; // Existing WhatsApp-to-Web Store Builder routes
// import whatsappMessageRoutes from "./routes/whatsapp.message.routes"; // New WhatsApp messaging routes
// import affiliateRoutes from "./routes/affiliate.routes";
import { subscriptionCheck } from "./middleware/subscription.middleware";
import { dynamicHugoProxy } from "./middleware/hugoProxy.middleware";
import { RedisStore } from "connect-redis";
import session from "express-session";
import { refreshToken } from "./helper/refereshToken";
import { authenticateJWT } from "./middleware/auth.middleware";
import passport from "./config/passport";


const app = express();

// Global Middleware
app.use(express.json());
// Only allow requests from your frontend URL
const corsOptions = {
  origin: process.env.APP_URL, // Replace with your frontend's URL
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
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






// Configure session middleware
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || "yourSecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // use true if using HTTPS
      sameSite: "lax", // or "strict" based on your needs
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);


// // app.ts
// app.use(authenticateJWT); // -----> only on protected routes
// app.use(refreshToken); // After auth middleware



// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());
// // API Routes
app.use("/auth", authRoutes);
// New current user endpoint - protected route
// app.use("/merchants", merchantRoutes);
// app.use("/products", productRoutes);
// app.use("/orders", orderRoutes);
// app.use("/payments", paymentRoutes);
// app.use("/analytics", analyticsRoutes);
// app.use("/notifications", notificationRoutes);
// app.use("/subscriptions", subscriptionRoutes);
// app.use("/qrcodes", qrcodeRoutes);
// app.use("/logistics", logisticsRoutes);
// app.use("/websites", websiteRoutes);
// app.use("/customers", customerRoutes);
// app.use("/marketplace", marketplaceRoutes);
// app.use("/search", searchRoutes);
// app.use("/whatsapp", whatsappRoutes);
// app.use("/whatsapp-messages", whatsappMessageRoutes);
// app.use("/affiliates", affiliateRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.json({ message: "AfriConnect API is running" });
});

// Catch-all for subdomain website requests (proxy)
// app.use("*", subscriptionCheck, dynamicHugoProxy);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
