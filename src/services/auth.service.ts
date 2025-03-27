// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { prisma, config } from "../config";
// import crypto from "crypto";

// export const _register = async (
//   name: string,
//   email: string,
//   password: string
// ) => {
//     let user;
//     let error;
//   // Check for existing user
//   const existingUser = await prisma.user.findUnique({ where: { email } });
//   if (existingUser) {
//       error = "Email is already in use."
//   }

//   else {
//     // Generate verification token and expiration (24 hours)
//     const verificationToken = crypto.randomBytes(32).toString("hex");
//     const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
//     // Hash the password before storing
//     const hashedPassword = await bcrypt.hash(password, 10);
//       user = await prisma.user.create({
//        data: {
//          name,
//          email,
//          password: hashedPassword,
//          verificationToken,
//          tokenExpires,
//          isVerified: false,
//        },
//      });
//       await sendVerificationEmail(email, verificationToken);
//   }
  
//   return {user, error}
// };

// export const loginMerchant = async (email: string, password: string) => {
//   const merchant = await prisma.merchant.findUnique({ where: { email } });
//   if (!merchant) {
//     throw new Error("Invalid credentials");
//   }
//   const isValid = await bcrypt.compare(password, merchant.password);
//   if (!isValid) {
//     throw new Error("Invalid credentials");
//   }
//   const token = jwt.sign(
//     { id: merchant.id, email: merchant.email },
//     config.jwtSecret,
//     { expiresIn: "1h" }
//   );
//   return { token, merchant };
// };


// export const _verifyEmail = async (token: string) => {
//     let error;
//     let message;
//      const user = await prisma.user.findFirst({
//        where: {
//          verificationToken: token,
//          tokenExpires: {
//            gt: new Date(),
//          },
//        },
//      });

//      if (!user) {
//         error = "Token is invalid or has expired.";
//      }
//      else {
//        // Update user as verified and clear token fields
//        await prisma.user.update({
//          where: { id: user.id },
//          data: {
//            isVerified: true,
//            verificationToken: null,
//            tokenExpires: null,
//          },
//        });
//         message = "Email verified successfully.";

        
//      }
     
     
// }