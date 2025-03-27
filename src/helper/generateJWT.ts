import jwt from "jsonwebtoken";
import { jwtSecret, refreshTokenSecret, prisma } from "../config";
import { Response } from "express";



// auth.controller.ts
export const generateJWT = async (
  userId: string,
  res: Response
) => {
  // Access Token (15min)
  const accessToken = jwt.sign({ id: userId }, jwtSecret!, {
    expiresIn: "15m",
  });

  // Refresh Token (7 days)
  const refreshToken = jwt.sign({ id: userId }, refreshTokenSecret, {
    expiresIn: "7d",
  });

  // Store refresh token in database
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken },
  });

  // Set HTTP-only cookies
  res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15min
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
   
};


export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, jwtSecret) as { userId: string };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, refreshTokenSecret) as { userId: string };
}




interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = async (userId: string): Promise<Tokens> => {
  // Access Token (15 minutes)
  const accessToken = jwt.sign({ userId }, jwtSecret, { expiresIn: "15m" });

  // Refresh Token (7 days)
  const refreshToken = jwt.sign({ userId }, refreshTokenSecret, {
    expiresIn: "7d",
  });

  // Store refresh token in database
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken },
  });


  

  return { accessToken, refreshToken };
};

