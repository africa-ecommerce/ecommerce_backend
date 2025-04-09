
import { Request } from "express";
export type Tokens = {
  accessToken: string;
  refreshToken: string;
};


export interface AuthRequest extends Request {
  user?: any;
}
