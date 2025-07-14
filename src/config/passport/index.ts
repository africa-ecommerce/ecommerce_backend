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
import { isValidFullName } from "../../helper/helperFunc";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
       

        // Sanitize input
        email = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        
        if (!user)
          return done(null, false, { message: "Invalid credentials!" });

        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid)
          return done(null, false, { message: "Invalid credentials!" });

        
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
       
        const user = await prisma.user.findUnique({ where: payload.sub });

        
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
        let email = profile.emails?.[0].value;
        if (!email) return done(new Error("No email provided by Google!"));

        // Sanitize input
        email = email.trim().toLowerCase();

        let user = await prisma.user.findUnique({ where: { email } });

        // ⛏️ Extract and sanitize name
        const displayName = profile.displayName?.trim();
        const name = isValidFullName(displayName)
          ? displayName
          : email.split("@")[0]; // fallback to email prefix

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name,
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
