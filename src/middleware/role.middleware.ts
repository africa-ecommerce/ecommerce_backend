import {Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import jwt from "jsonwebtoken";


// Middleware to check if user is a plug
export const isPlug =  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.userType === "PLUG" && req.user.plug) {
      // Attach direct plug reference
      req.plug = req.user?.plug;
      next();
    } else {
      res.status(403).json({
        error: "Access denied! Plug account required",
      });
      return;
    }
  } catch (error) {
    console.error("Error in isPlug middleware:", error);
    res.status(500).json({
      error: "Internal server error!",
    });
    return;
  }
};

// Middleware to check if user is a supplier
export const isSupplier = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.userType === "SUPPLIER" && req.user.supplier) {
      // Attach direct plug reference
      req.supplier = req.user.supplier;
      next();
    } else {
      res.status(403).json({
        error: "Access denied! Supplier account required",
      });
      return;
    }
  } catch (error) {
    console.error("Error in isSupplier middleware:", error);
    res.status(500).json({
      error: "Internal server error!",
    });
    return;
  }
};


export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.session;

    if (!token) {
       res.status(401).json({ error: "Unauthorized!" });
       return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { admin?: boolean };

    if (!decoded.admin) {
       res.status(403).json({ error: "Forbidden. Admin access required!"});
       return;
    }

    next();
  } catch (err) {
    console.error("Admin auth error:", err);
     res.status(401).json({ error: "Internal server error!", });
     return;
  }
}