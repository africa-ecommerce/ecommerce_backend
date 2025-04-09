
import { Request, Response } from "express";
import { refreshSession, setAuthCookies } from "../../helper/token";
import jwt from "jsonwebtoken";
 export const refreshToken = async (req: Request, res: Response) => {
   try {
     const refreshToken = req.cookies.refreshToken;

     if (!refreshToken) {
        res.status(401).json({
         error: "No refresh token provided",
         code: "REFRESH_TOKEN_MISSING",
       });
       return;
     }

     // This will throw an error if refresh fails
     const { user, newTokens } = await refreshSession(refreshToken);

     // Set new tokens in cookies
     setAuthCookies(res, newTokens);

     res.status(200).json({ success: true });
   } catch (error) {
     // More specific error handling
     if (error instanceof jwt.TokenExpiredError) {
       res
         .status(401)
         .json({ error: "Refresh token expired", code: "TOKEN_EXPIRED" });
     } else if (error instanceof jwt.JsonWebTokenError) {
       res
         .status(401)
         .json({ error: "Invalid refresh token", code: "INVALID_TOKEN" });
     } else {
       console.error("Refresh failed:", error);
       res.status(401).json({
         error: "Authentication refresh failed",
         code: "REFRESH_FAILED",
       });
     }

     // Clear invalid credentials
     res.clearCookie("accessToken");
     res.clearCookie("refreshToken");
   }
 };
