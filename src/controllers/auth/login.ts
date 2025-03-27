// import { Request, Response } from "express";
// import bcrypt from "bcryptjs";
// import { prisma, jwtSecret } from "../../config";
// import { sendVerificationMail } from "../../helper/sendVeriificationMail";
// import { generateJWT } from "../../helper/generateJWT";
// import { v4 as uuidv4 } from "uuid";



// //set up login callback url ---> DEFAULT_LOGIN_REDIRECT, set public route middlewares, oauth, consider for full name 
// const verifyLogin = async (req: Request, res: Response) => {
//   const { email, password, callbackUrl } = req.body; //callback url

//   try {
//     // Check if user exists
//     const user = await prisma.user.findUnique({ where: { email } });

//     if (!user) {
//        res.status(404).json({ message: "Invalid Credentials!" });
//        return;
//     }

//     // Validate password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//        res.status(400).json({ message: "Invalid Credentials!" });
//        return;
//     }

//     if (!user.emailVerified) {
//       // Check if the token is still valid; if not, generate a new one
//       let tokenToSend = user.verificationToken;
//       if (!tokenToSend || (user.tokenExpires && user.tokenExpires < new Date())) {
//         tokenToSend = uuidv4();
//         const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

//         await prisma.user.update({
//           where: { id: user.id },
//           data: {
//             verificationToken: tokenToSend,
//             tokenExpires,
//           },
//         });

//         await sendVerificationMail(email, tokenToSend, "login");
//         res.status(403).json({ message: "Verification email resent!" });
//         return;
//       }
//     }

//     // Generate a JWT for the user
//     generateJWT(user.id, res);

//     // Determine the redirect URL: if provided and valid, use it; otherwise, use a default (e.g., /dashboard or may be onboarding)
//     let redirectUrl = "/dashboard";
//     if (callbackUrl && typeof callbackUrl == "string" && isValidCallbackUrl(callbackUrl)) {
//       redirectUrl = callbackUrl;
//     }

//     // Redirect the user to the dashboard or another authenticated page
//      res.status(200).json({
//       message: "Login successful!",
//       redirectUrl,
//       user: { id: user.id, email: user.email, name: user.name },
//     });
//     return;

//     // current user implementation set up current user  ----------->
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

