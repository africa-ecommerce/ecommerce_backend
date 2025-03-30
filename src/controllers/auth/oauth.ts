import passport from "passport";
import { isValidCallbackUrl } from "../../helper/verifyCallbackUrl";
import { Request, Response, NextFunction } from "express";
import { generateTokens, setAuthCookies } from "../../helper/generateJWT";


export const google = (req: Request, res: Response, next: NextFunction) => {
  const { callbackUrl } = req.query;

    const url =
      callbackUrl &&
      typeof callbackUrl === "string" &&
      isValidCallbackUrl(callbackUrl)
        ? callbackUrl
        : "/dashboard";

         const decodedCallback = decodeURIComponent(url);



  // Validate and pass callback URL via state
 
   const state = `http://localhost:3000${
     decodedCallback.startsWith("/") ? decodedCallback : `/${decodedCallback}`
   }`;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state,
  })(req, res, next);
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    let redirectUrl;

      const decodedState = req.query.state as string;

      // Validate the decoded URL
      redirectUrl = decodedState;

    if (!req.user) throw new Error("No user found in session");
    const user = req.user as any;

    // ✅ Adjusted: If the user is linking their account for the first time (not onboarded), override redirect URL
    // Here we assume new users have isOnboarded === false (or undefined) and later you'll update it to true after onboarding.
    if (!user.isOnboarded) {
      redirectUrl = "http://localhost:3000/onboarding";
    }

    // Generate tokens and set cookies
    const tokens = await generateTokens(user.id);
    setAuthCookies(res, tokens);

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google callback error:", error);
    const errorRedirect = `http://localhost:3000/auth/error?message=${encodeURIComponent(
      error instanceof Error ? error.message : "Authentication failed"
    )}`;
    res.redirect(errorRedirect);
  }
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