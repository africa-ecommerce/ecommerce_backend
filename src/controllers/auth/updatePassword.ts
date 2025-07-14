import { NextFunction, Response } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";
import bcrypt from "bcryptjs";
import { passwordSchema } from "../../lib/zod/schema";
export const updatePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Auth check
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized!" });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) {
      res.status(400).json({ error: "Current password is required!" });
      return;
    }
    if (!newPassword) {
      res.status(400).json({ error: "New password is required!" });
      return;
    }

    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      res.status(400).json({ error: passwordValidation.error.message });
      return;
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found!" });
      return;
    }
    // Verify current password
    
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        res.status(400).json({ error: "Current password is incorrect!" });
        return;
      }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(), // Explicitly update the timestamp
      },
    });
    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    next(error);
  }
};
