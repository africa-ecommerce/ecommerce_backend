import { Plug, Supplier, User as PrismaUser } from "@prisma/client";
import { Request } from "express";

declare global {
  namespace Express {
    interface User extends Omit<PrismaUser, "password"> {
      plug?: Plug | null;
      supplier?: Supplier | null;
      
    }
  }
}

export interface AuthRequest extends Request {
  user?: Express.User;
  plug?: Plug;
  supplier?: Supplier;
}


export type Tokens = {
  accessToken: string;
  refreshToken: string;
};