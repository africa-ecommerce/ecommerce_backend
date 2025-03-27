// // src/controllers/auth.controller.ts
// import { Request, Response } from "express";
// import { _register, loginMerchant } from "../services/auth.service";
// import isEmail from "validator/lib/isEmail"; // Using validator library for email validation

// export const register = async (req: Request, res: Response) => {
//   try {
//     // Destructure and validate required fields
//     let { name, email, password } = req.body;

//     if (!name || !email || !password) {
//       return res
//         .status(400)
//         .json({ error: "Name, email, and password are required." });
//     }

//     // Sanitize input
//     email = email.trim().toLowerCase();

//     // Validate email format and password length
//     if (!isEmail(email)) {
//       return res.status(400).json({ error: "Invalid email format." });
//     }

//     // password length validation
//     if (password.length < 8) {
//       return res
//         .status(400)
//         .json({ error: "Password must be at least 8 characters long." });
//     }

//     // Create new user
//     const { user, error } = await _register(name, email, password);
//     if (error) {
//       return res.status(409).json({ error });
//     }

    
//     return res.status(201).json({ user });
//   } catch (error: any) {
//     // Log the error for internal debugging
//     console.error("Registration error:", error);
//     return res.status(500).json({ error: "Internal server error." });
//   }
// };


// // make sure user verifies email before login, set call back url and a redirect url if user was redirected here
// export const login = async (req: Request, res: Response) => {
//   try {
//     const { email, password } = req.body;
//     const { token, merchant } = await loginMerchant(email, password);
//     res.json({ token, merchant });
//   } catch (error: any) {
//     res.status(400).json({ error: error.message });
//   }
// };






// //implement retry and rate limiting for retries use the previous token again
// export const verifyEmail = async (req: Request, res: Response) => {
//   try {
//     const { token } = req.query;
//     if (!token || typeof token !== "string") {
//       return res.status(400).json({ error: "Invalid or missing token." });
//     }

//     const user = await prisma.user.findFirst({
//       where: {
//         verificationToken: token,
//         tokenExpires: {
//           gt: new Date(),
//         },
//       },
//     });

//     if (!user) {
//       return res
//         .status(400)
//         .json({ error: "Token is invalid or has expired." });
//     }

//     // Update user as verified and clear token fields
//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         isVerified: true,
//         verificationToken: null,
//         tokenExpires: null,
//       },
//     });

//     return res.status(200).json({ message: "Email verified successfully." });
//   } catch (error: any) {
//     console.error("Email verification error:", error);
//     return res.status(500).json({ error: "Internal server error." });
//   }
// };

