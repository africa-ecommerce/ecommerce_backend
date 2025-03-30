import passport from "passport";
import { isValidCallbackUrl } from "../../helper/verifyCallbackUrl";
import { Request, Response, NextFunction } from "express";
import { generateTokens, setAuthCookies } from "../../helper/generateJWT";


export const google = (req: Request, res: Response, next: NextFunction) => {
  const { callbackUrl } = req.query;

   let finalRedirect = "http://localhost:3000/dashboard";

  // Validate and pass callback URL via state


   if (
     callbackUrl &&
     typeof callbackUrl === "string" &&
     isValidCallbackUrl(callbackUrl)
   ) {
     const decodedCallback = decodeURIComponent(callbackUrl);

     // Check if it's a relative path
    
       finalRedirect = `http://localhost:3000${
         decodedCallback.startsWith("/")
           ? decodedCallback
           : `/${decodedCallback}`
       }`;
   }
 
   const state = finalRedirect;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state,
  })(req, res, next);
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    let redirectUrl = "http://localhost:3000/dashboard";

    if (req.query.state) {
      const decodedState = decodeURIComponent(req.query.state as string);

      // Validate the decoded URL
        redirectUrl = decodedState;
    }

    if (!req.user) throw new Error("No user found in session");
    const user = req.user as any;

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