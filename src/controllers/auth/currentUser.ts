import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    // If user is not attached to request (shouldn't happen with authenticateJWT middleware)
    if (!req.user) {
       res.status(401).json({ error: "Authentication required" });
       return;
    }

    // Return only necessary, non-sensitive user information
    const { id, email, name, role, emailVerified } = req.user;

    res.status(200).json({
      user: {
        id,
        email,
        name,
        role,
        emailVerified
      }
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};