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
// import orderRoutes from "./routes/order.routes";
// import paymentRoutes from "./routes/payment.routes";
// import analyticsRoutes from "./routes/analytics.routes";
// import notificationRoutes from "./routes/notification.routes";
// import qrcodeRoutes from "./routes/qrcode.routes";
// import logisticsRoutes from "./routes/logistics.routes";
// import websiteRoutes from "./routes/website.routes";
// import customerRoutes from "./routes/customer.routes";
// import marketplaceRoutes from "./routes/marketplace.routes";
// import searchRoutes from "./routes/search.routes";
// import whatsappRoutes from "./routes/whatsapp.routes"; // Existing WhatsApp-to-Web Store Builder routes
// import whatsappMessageRoutes from "./routes/whatsapp.message.routes"; // New WhatsApp messaging routes
// import affiliateRoutes from "./routes/affiliate.routes";
import { RedisStore } from "connect-redis";
import session from "express-session";
import passport from "./config/passport";
import { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";


const app = express();
app.use(cookieParser());

// Global Middleware
app.use(express.json());
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
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain:
        process.env.NODE_ENV === "development"
          ? "localhost"
          : `${process.env.DOMAIIN}`,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);


// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());
// // API Routes
app.use("/auth", authRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/products", productRoutes);
app.use("/plug/products", plugProductRoutes);

// New current user endpoint - protected route
// app.use("/merchants", merchantRoutes);
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




// Catch-all for subdomain website requests (proxy)
// app.use("*", subscriptionCheck, dynamicHugoProxy);



// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  // res
  //   .status(500)
  //   .json({ error: "Unexpected error occured!" });
});

// app.listen(port, () => {
//   console.log(`Server is listening on port ${port}`);
// });


export default app;