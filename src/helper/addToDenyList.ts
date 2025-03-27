import { redisClient } from "../config";

export const addToDenylist = async (token: string, expiresAt: number) => {
  const ttl = expiresAt - Date.now();

  // Use Redis SET with PX option in correct format
  await redisClient.set(`denylist:${token}`, "1", {
    PX: ttl > 0 ? ttl : 5000, // Ensure minimum 5s TTL
  });
};
