// src/config/passport.ts - Passport JWT Strategy Setup
import passport from "passport";
import { Strategy as JWTStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { jwtSecret, prisma } from "../index";
import bcrypt from "bcryptjs";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";



passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // 1. Find user by email
        const user = await prisma.user.findUnique({ where: { email } });

        // 2. Check user exists
        if (!user) return done(null, false, { message: "Invalid credentials!" });

        // 3. Validate password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid)
          return done(null, false, { message: "Invalid credentials!" });

        // 4. Return user without email check (we'll handle verification in route)
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);


// JWT Strategy for protected routes
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    },
    async (payload, done) => {
      try {
        // 1. Find user by ID from JWT payload
        const user = await prisma.user.findUnique({where: payload.sub});

        // 2. Check user exists and email is verified
        if (!user) return done(null, false);
        if (!user.emailVerified) return done(null, false);

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);




// Serialize and deserialize user for session support
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});


passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        // Select only necessary, non-sensitive fields
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
      },
    });

    done(null, user);
  } catch (error) {
    done(error, null);
  }
});


// Google OAuth Strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract verified email from Google profile
      const email = profile.emails?.[0].value;
      if (!email) {
        return done(new Error("No email provided by Google"));
      }
      // Try to find an existing user
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Create a new user with email verified set to true
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName,
            password: "", // Password can be empty or set to null for OAuth users
            emailVerified: true,
            // Other fields as needed…
          },
        });
      }
      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy(
  {
    clientID: process.env.FACEBOOK_CLIENT_ID!,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    callbackURL: "/auth/facebook/callback",
    profileFields: ["id", "displayName", "emails"],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract email; note: Facebook may not always return an email!
      const email = profile.emails?.[0].value;
      if (!email) {
        return done(new Error("No email provided by Facebook"), null);
      }
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName,
            password: "",
            emailVerified: true,
          },
        });
      }
      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
));

export default passport;



















































// // src/config/passport.ts
// import passport from "passport";
// import { Strategy as JWTStrategy, ExtractJwt } from "passport-jwt";
// import { Strategy as LocalStrategy } from "passport-local";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// import bcrypt from "bcryptjs";
// import { prisma } from "../config/database";
// import { 
//   jwtSecret, 
//   refreshTokenSecret, 
//   googleClientId, 
//   googleClientSecret 
// } from "../config/environment";

// // Extend User type to include additional properties
// interface ExtendedUser {
//   id: string;
//   email: string;
//   password: string;
//   emailVerified: boolean;
//   tokenVersion: number;
//   twoFactorEnabled: boolean;
// }

// // Local Strategy for email/password login
// passport.use(
//   new LocalStrategy(
//     {
//       usernameField: "email",
//       passwordField: "password",
//     },
//     async (email, password, done) => {
//       try {
//         // 1. Find user by email
//         const user = await prisma.user.findUnique({ 
//           where: { email } 
//         }) as ExtendedUser;

//         // 2. Check user exists
//         if (!user) {
//           return done(null, false, { message: "Invalid credentials!" });
//         }

//         // 3. Validate password
//         const isValid = await bcrypt.compare(password, user.password);
//         if (!isValid) {
//           return done(null, false, { message: "Invalid credentials!" });
//         }

//         // 4. Check email verification
//         if (!user.emailVerified) {
//           return done(null, false, { message: "Please verify your email!" });
//         }

//         // 5. Return user
//         return done(null, user);
//       } catch (error) {
//         return done(error);
//       }
//     }
//   )
// );

// // JWT Strategy for protected routes
// passport.use(
//   new JWTStrategy(
//     {
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       secretOrKey: jwtSecret,
//     },
//     async (payload, done) => {
//       try {
//         // 1. Find user by ID from JWT payload
//         const user = await prisma.user.findUnique({
//           where: { 
//             id: payload.sub,
//             tokenVersion: payload.tokenVersion
//           }
//         }) as ExtendedUser;

//         // 2. Check user exists and is verified
//         if (!user) return done(null, false);
//         if (!user.emailVerified) return done(null, false);

//         return done(null, user);
//       } catch (error) {
//         return done(error);
//       }
//     }
//   )
// );








// // Google OAuth Strategy
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: googleClientId,
//       clientSecret: googleClientSecret,
//       callbackURL: "/auth/google/callback",
//       passReqToCallback: true
//     },
//     async (req, accessToken, refreshToken, profile, done) => {
//       try {
//         // Find or create user with Google profile
//         const email = profile.emails?.[0]?.value;
//         if (!email) {
//           return done(new Error("No email found"));
//         }

//         let user = await prisma.user.findUnique({ 
//           where: { email } 
//         });

//         if (!user) {
//           // Create new user if not exists
//           user = await prisma.user.create({
//             data: {
//               email,
//               name: profile.displayName || '',
//               emailVerified: true,
//               password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
//               authProvider: 'GOOGLE'
//             }
//           });
//         }

//         return done(null, user);
//       } catch (error) {
//         return done(error);
//       }
//     }
//   )
// );

// // Serialization and Deserialization
// passport.serializeUser((user: any, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser(async (id: string, done) => {
//   try {
//     const user = await prisma.user.findUnique({ 
//       where: { id },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         emailVerified: true
//       }
//     });
//     done(null, user);
//   } catch (error) {
//     done(error);
//   }
// });

// export default passport;
