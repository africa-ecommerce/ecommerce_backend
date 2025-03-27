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


export const jwtSecret =  process.env.JWT_SECRET || "defaultsecret";
export const refreshTokenSecret = process.env.REFRESH_SECRET || "defaultsecret";


export const  port  = process.env.PORT || 5000;

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.connect().catch(console.error);
