import passport from "passport";
import { isValidCallbackUrl } from "../../helper/verifyCallbackUrl";
import { Request, Response, NextFunction } from "express";
import { generateTokens, setAuthCookies } from "../../helper/token";

export const google = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callbackUrl } = req.query;
    const url =
      callbackUrl &&
      typeof callbackUrl === "string" &&
      isValidCallbackUrl(callbackUrl)
        ? callbackUrl
        : "/dashboard";

    const decodedCallback = decodeURIComponent(url);

    // Validate and pass callback URL via state
    const state = `${process.env.APP_URL}${
      decodedCallback.startsWith("/") ? decodedCallback : `/${decodedCallback}`
    }`;

    // Execute passport.authenticate wrapped in try/catch
    passport.authenticate("google", {
      session: false, 
      scope: ["profile", "email"],
      state,
    })(req, res, next);
  } catch (error) {
    console.error("Google authentication error:", error);
    const errorRedirect = `${process.env.APP_URL}/auth/error`;
    res.redirect(errorRedirect);
  }
};

// export const googleCallback = async (req: Request, res: Response) => {
//   try {
//     let redirectUrl;

//     const decodedState = req.query.state as string;

//     // Validate the decoded URL
//     redirectUrl = decodedState;

//     if (!req.user) throw new Error("No user found in session");
//     const user = req.user;

//     // Check if the user is onboarded
//     if (!user.isOnboarded) {
//       redirectUrl = `${process.env.APP_URL}/onboarding`;
//     }

//     // Generate tokens and set cookies
//     const tokens = await generateTokens(user.id, user.isOnboarded, user.userType);
//     setAuthCookies(res, tokens);

//     res.redirect(redirectUrl);
//   } catch (error) {
//     console.error("Google callback error:", error);
//     const errorRedirect = `${process.env.APP_URL}/auth/error`;
//     res.redirect(errorRedirect);
//   }
// };




export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use passport.authenticate to handle the callback and get the user
  passport.authenticate(
    "google",
    { session: false },
    async (err, user) => {
      try {
        if (err || !user) {
          console.error(
            "Google authentication error:",
            err || "No user returned"
          );
          return res.redirect(`${process.env.APP_URL}/auth/error`);
        }

        let redirectUrl;
        const decodedState = req.query.state as string;

        // Validate the decoded URL
        redirectUrl = decodedState;

        // Check if the user is onboarded
        if (!user.isOnboarded) {
          redirectUrl = `${process.env.APP_URL}/onboarding`;
        }

        // Generate tokens and set cookies
        const tokens = await generateTokens(
          user.id,
          user.isOnboarded,
          user.userType
        );
        setAuthCookies(res, tokens);

        res.redirect(redirectUrl);
      } catch (error) {
        console.error("Google callback error:", error);
        const errorRedirect = `${process.env.APP_URL}/auth/error`;
        res.redirect(errorRedirect);
      }
    }
  )(req, res, next);
};
