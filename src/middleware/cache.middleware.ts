// src/middleware/cache.middleware.ts
import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config";

export const cache =
  (keyPrefix: string, duration: number) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.originalUrl}`;
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        redisClient.setEx(key, duration, JSON.stringify(data));
        return originalJson(data);
      };
      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next();
    }
  };
