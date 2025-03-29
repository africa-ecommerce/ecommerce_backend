import passport from "passport";
import { isValidCallbackUrl } from "../../helper/verifyCallbackUrl";
import { Request, Response, NextFunction } from "express";


export const google = (req: Request, res: Response, next: NextFunction) => {
  const { callbackUrl } = req.query;

  // Validate and pass callback URL via state
  const state =
    callbackUrl &&
    typeof callbackUrl === "string" &&
    isValidCallbackUrl(callbackUrl)
      ? encodeURIComponent(callbackUrl)
      : encodeURIComponent("/dashboard");

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state,
  })(req, res, next);
};

export const googleCallback = (req: Request, res: Response) => {
  // Decode the state to get the original callback URL
  const redirectUrl = req.query.state
    ? decodeURIComponent(req.query.state as string)
    : "/dashboard";

  // Redirect to the original intended URL or dashboard
  res.redirect(redirectUrl);
};

export const facebook = (req: Request, res: Response, next: NextFunction) => {
  const { callbackUrl } = req.query;

  // Validate and pass callback URL via state
  const state =
    callbackUrl &&
    typeof callbackUrl === "string" &&
    isValidCallbackUrl(callbackUrl)
      ? encodeURIComponent(callbackUrl)
      : encodeURIComponent("/dashboard");

  passport.authenticate("facebook", {
    scope: ["email"],
    state,
  })(req, res, next);
};


export const facebookCallback = (req: Request, res: Response) => {
  // Decode the state to get the original callback URL
  const redirectUrl = req.query.state
    ? decodeURIComponent(req.query.state as string)
    : "/dashboard";

  // Redirect to the original intended URL or dashboard
  res.redirect(redirectUrl);
};