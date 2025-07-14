import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config";
import {
  refreshSession,
  setAuthCookies,
  verifyAccessToken,
} from "../helper/token";
import { AuthRequest } from "../types";
import passport from "passport";


const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip middleware for auth routes
    if (req.path.startsWith("/auth")) return next();

    // 1. Check access token first
    const accessToken = req.cookies.accessToken;
    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        req.user = await validateUser(decoded.userId);
        return next();
      } catch (accessError) {
        if ((accessError as jwt.JsonWebTokenError).name !== "TokenExpiredError")
          throw accessError;
      }
    }

    //  Check for Bearer token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      // Use passport JWT strategy to validate token
      return passport.authenticate("jwt", { session: false }, (err:any, user:any) => {
        if (err) {
          return res.status(401).json({ error: "Invalid token" });
        }

        if (!user) {
          return res.status(401).json({ error: "Authentication failed" });
        }

        req.user = user;
        return next();
      })(req, res, next);
    }

    // Attempt refresh token flow
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      // Clear invalid credentials
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.status(401).json({
        error: "No authentication tokens found!",
      });
      return; //
    }

    // Get result from refresh session
    const result = await refreshSession(refreshToken);

    // Handle failed refresh
    if (!result.success) {
      res.status(401).json({
        error: "Refresh token failed!",
      });

      // Clear invalid credentials
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return; //
    }

    // At this point we have a successful refresh
    req.user = result.user;

    // Set new tokens in cookies
    setAuthCookies(res, result.newTokens!);

    next();
  } catch (error) {
    // Clear invalid credentials first
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    // More specific error handling
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token expired!" });
      return;
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token!" });
      return;
    } else {
      console.error("Authentication error:", error);
      res.status(500).json({ error: "Authentication error!" });
      return;
    }
  }
};

async function validateUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      plug: true,
      supplier: true,
    },
  });

  if (!user) throw new Error("User not found");
  return {
    ...user,
    plug: user.plug || undefined,
    supplier: user.supplier || undefined,
    password: undefined, // Ensure password is removed
  };
}

export default authenticateJWT;
