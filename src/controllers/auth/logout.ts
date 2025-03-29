import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { addToDenylist } from "../../helper/addToDenyList";

export const logout = async (req: Request, res: Response) => {
  const token = req.cookies.authToken;
  const decoded = jwt.decode(token) as { exp: number };

  await addToDenylist(token, decoded.exp * 1000);

  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json({ message: "Logged out successfully" });
};