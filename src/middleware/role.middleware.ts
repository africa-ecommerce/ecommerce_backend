import {Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";

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
