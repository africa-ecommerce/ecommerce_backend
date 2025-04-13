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
    const state = `http://localhost:3000${
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
    const errorRedirect = `http://localhost:3000/auth/error`;
    res.redirect(errorRedirect);
  }
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    let redirectUrl;

    const decodedState = req.query.state as string;

    // Validate the decoded URL
    redirectUrl = decodedState;

    if (!req.user) throw new Error("No user found in session");
    const user = req.user;

    // ✅ Adjusted: If the user is linking their account for the first time (not onboarded), override redirect URL
    // Here we assume new users have isOnboarded === false (or undefined) and later you'll update it to true after onboarding.
    if (!user.isOnboarded) {
      redirectUrl = "http://localhost:3000/onboarding";
    }

    // Generate tokens and set cookies
    const tokens = await generateTokens(user.id, user.name, user.isOnboarded, user.userType);
    setAuthCookies(res, tokens);

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google callback error:", error);
    const errorRedirect = `http://localhost:3000/auth/error`;
    res.redirect(errorRedirect);
  }
};


// // controllers/auth/google.ts
// import passport from "passport";
// import { Request, Response, NextFunction } from "express";
// import { generateTokens, setAuthCookies } from "../../helper/token";
// import { isValidCallbackUrl } from "../../helper/verifyCallbackUrl";

// export const google = (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { callbackUrl } = req.query;
//     const url =
//       callbackUrl &&
//       typeof callbackUrl === "string" &&
//       isValidCallbackUrl(callbackUrl)
//         ? callbackUrl
//         : "/dashboard";

//     const decodedCallback = decodeURIComponent(url);
//     const state = `http://localhost:3000${
//       decodedCallback.startsWith("/") ? decodedCallback : `/${decodedCallback}`
//     }`;

//     passport.authenticate("google", {
//       session: false,
//       scope: ["profile", "email"],
//       state,
//     })(req, res, next);
//   } catch (error) {
//     console.error("Google authentication error:", error);
//     res.redirect("http://localhost:3000/auth/error");
//   }
// };

// export const googleCallback = async (req: Request, res: Response) => {
//   passport.authenticate(
//     "google",
//     { session: false },
//     async (error: Error | null, user?: Express.User, info?: any) => {
//       try {
//         const decodedState = req.query.state as string;
//         let redirectUrl = decodedState || "/dashboard";

//         if (error || !user) {
//           console.error("Google auth error:", error || info);
//           return res.redirect("http://localhost:3000/auth/error");
//         }

      

//         if (!user.isOnboarded) {
//           redirectUrl = "http://localhost:3000/onboarding";
//         }

//         // Generate JWT tokens
//         const tokens = await generateTokens(
//           user.id,
//           user.name,
//           user.isOnboarded,
//           user.userType
//         );

//         // Set cookies and redirect
//         setAuthCookies(res, tokens);
//         res.redirect(redirectUrl);
//       } catch (err) {
//         console.error("Google callback error:", err);
//         res.redirect("http://localhost:3000/auth/error");
//       }
//     }
//   )(req, res);
// };


// export const googleCallback = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   passport.authenticate(
//     "google",
//     { session: false },
//     async (err, user, info) => {
//       try {
//         if (err || !user) {
//           console.error("Google auth error:", err || info);
//           return res.redirect("http://localhost:3000/auth/error");
//         }

//         const decodedState = req.query.state as string;
//         let redirectUrl = decodedState || "http://localhost:3000/dashboard";

//         if (!user.isOnboarded) {
//           redirectUrl = "http://localhost:3000/onboarding";
//         }

//         // Generate tokens and set cookies
//         const tokens = await generateTokens(
//           user.id,
//           user.name,
//           user.isOnboarded,
//           user.userType
//         );

//         setAuthCookies(res, tokens);
//         return res.redirect(redirectUrl);
//       } catch (error) {
//         console.error("Google callback error:", error);
//         return res.redirect("http://localhost:3000/auth/error");
//       }
//     }
//   )(req, res, next);
// };

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
    session: false,
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
