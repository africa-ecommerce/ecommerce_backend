// src/config/index.ts
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

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

export const jwtSecret = process.env.JWT_SECRET || "defaultsecret";
export const refreshTokenSecret = process.env.REFRESH_SECRET || "defaultsecret";
export const port = process.env.PORT || 5000;
export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    connectTimeout: 5000, // 5 seconds timeout
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.log("Too many retries. Connection terminated");
        return new Error("Could not connect after 3 attempts");
      }
      return Math.min(retries * 100, 5000); // Wait up to 5 seconds between retries
    },
  },
});

// Handle connection errors
redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

// Connect with retry logic
async function connectRedis() {
  try {
    await redisClient.connect();
    console.log("Connected to Redis");
  } catch (err) {
    console.error("Redis connection failed:", err);
    // Implement your retry or fallback logic here
  }
}

connectRedis();
