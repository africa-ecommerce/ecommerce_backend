import { Request } from "express";
import { frontendUrl } from "../config";
import rateLimit from "express-rate-limit";

// Helper function to validate the callback URL
export const isValidCallbackUrl = (url: string): boolean => {
  try {
    // If the URL is a relative URL, allow it.
    if (url.startsWith("/")) {
      return true;
    }

    // For an absolute URL, parse it.
    const parsedUrl = new URL(url);
    // Compare its hostname with your allowed hostname.
    const allowedHostname = frontendUrl;
    return parsedUrl.hostname === allowedHostname;
  } catch (error) {
    // If URL parsing fails, it's invalid.
    return false;
  }
};

export const isValidFullName = (fullName: string): boolean => {
  const nameParts = fullName.trim().split(/\s+/);
  return nameParts.length > 1;
};



export function capitalizeName(name: string) {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}






export function getReturnDaysLeft(createdAt: Date): number {
  const unlockAt = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(
    0,
    Math.ceil((unlockAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
}



export const createKeyGenerator = (prefix = "", includeEmail = false) => {
  return (req: Request) => {
    const baseKey = `${prefix}${req.ip}-${req.method}-${req.path}`;
    if (includeEmail && req.body?.email) {
      return `${baseKey}-${req.body.email}`;
    }
    return baseKey;
  };
};

export const createDualLimiter = (
  ipLimit: number,
  emailLimit: number,
  windowMs: number,
  prefix: string,
  skipSuccess = true
) => {
  const ipLimiter = rateLimit({
    windowMs,
    max: ipLimit,
    message: { error: "Too many attempts. Try again later!" },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccess,
    keyGenerator: createKeyGenerator(`${prefix}-ip-`),
  });

  const emailLimiter = rateLimit({
    windowMs,
    max: emailLimit,
    message: { error: "Too many attempts. Try again later!" },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccess,
    keyGenerator: createKeyGenerator(`${prefix}-email-`, true),
    skip: (req) => !req.body?.email,
  });

  return [ipLimiter, emailLimiter];
};
