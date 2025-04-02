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
        emailVerified: true,
      },
    });

    done(null, user);
  } catch (error) {
    done(error, null);
  }
});


// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "http://localhost:5000/auth/google/callback",
      passReqToCallback: true, // Add this to access request in callback
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) return done(new Error("No email provided by Google!"));

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName,
              password: "",
              emailVerified: true,
              policy: true
            },
          });
        }

        // Return user to be available in req.user
        return done(null, user);
      } catch (error) {
        return done(null, false, { message: "Internal server error!" });
      }
    }
  )
);

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














































