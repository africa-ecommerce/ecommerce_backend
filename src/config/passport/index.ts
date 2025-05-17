import passport from "passport";
import { Strategy as JWTStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import {
  backendUrl,
  googleClientId,
  googleClientSecret,
  jwtSecret,
  prisma,
} from "../index";
import bcrypt from "bcryptjs";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // 1. Find user by email

        // Sanitize input
        email = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        // 2. Check user exists
        if (!user)
          return done(null, false, { message: "Invalid credentials!" });

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
        const user = await prisma.user.findUnique({ where: payload.sub });

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
        createdAt: true,
        updatedAt: true,
        refreshToken: true,
        isOnboarded: true,
        userType: true,
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
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: `${backendUrl}/auth/google/callback`,
      passReqToCallback: true,
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
              name: profile.displayName || email.split("@")[0] || "User",
              password: "",
              emailVerified: true,
              isOnboarded: false, // Explicit default
              userType: "UNSET", // Explicit default
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

export default passport;
