import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

// Explicitly extend globalThis
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a singleton PrismaClient instance
export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

//Load environmental variables with default
export const jwtSecret = process.env.JWT_SECRET || "JWT_SECRET";
export const sessionSecret = process.env.SESSION_SECRET || "SESSION_SECRET";
export const refreshTokenSecret = process.env.REFRESH_SECRET || "REFRESH_SECRET";
export const port = Number(process.env.PORT) || 5000;
// Define unique bucket names with a prefix to avoid conflicts in play.min.io
export const minioBucketPrefix = process.env.MINIO_BUCKET_PREFIX || "pluggn";
//  minio images bucket
export const minioImagesBucket = process.env.MINIO_IMAGES_BUCKET || "images";
//  minio user store config bucket
export const minioStoreConfigBucket =
  process.env.MINIO_STORE_CONFIG_BUCKET || "storeconfig";
export const minioEndpoint = process.env.MINIO_ENDPOINT || "play.min.io";
export const minioPort = process.env.MINIO_PORT || "443";
export const minioAccessKey =
  process.env.MINIO_ACCESS_KEY || "Q3AM3UQ867SPQQA43P2F";
export const minioSecretKey = process.env.MINIO_SECRET_KEY || "zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG";
export const minioRegion = process.env.MINIO_REGION || "us-east-1";
export const minioBaseUrl = process.env.MINIO_BASE_URL || "https://play.min.io";
export const googleClientId = process.env.GOOGLE_CLIENT_ID || "**************";
export const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "************";
export const databaseUrl = process.env.DATABASE_URL || "************";
export const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
export const frontendUrl = process.env.APP_URL || "http://localhost:3000";
export const logisticsBaseUrl = process.env.LOGISTICS_BASE_URL || "https://65c3-102-216-203-228.ngrok-free.app";
export const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || "sk_test_fbb37fbdd6a0763e535ba9a1f1d8551d42f641da";
export const domain = process.env.DOMAIN || "localhost";
export const adminAccount = process.env.ADMIN_ACCOUNT || "*************";

export const emailConfigs = {
  support: {
    from: "support@pluggn.com.ng",
    user: "support@pluggn.com.ng",
    pass: process.env.SUPPORT_EMAIL_PASSWORD!,
  },
  orders: {
    from: "orders@pluggn.com.ng",
    user: "orders@pluggn.com.ng",
    pass: process.env.ORDERS_EMAIL_PASSWORD!,
  },
  noreply: {
    from: "noreply@pluggn.com.ng",
    user: "noreply@pluggn.com.ng",
    pass: process.env.NOREPLY_EMAIL_PASSWORD!,
  },
  devTeam: {
    from: "devTeam@pluggn.com.ng",
    user: "devTeam@pluggn.com.ng",
    pass: process.env.DEVTEAM_EMAIL_PASSWORD!,
    
  },
  admin: {
    from: "admin@pluggn.com.ng",
    user: "admin@pluggn.com.ng",
    pass: process.env.ADMIN_EMAIL_PASSWORD!,
  },
};

