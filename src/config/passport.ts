import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { prisma } from "./prisma";
import { NotFoundError } from "./errors/errors";
import { findOrCreateUser } from "../domains/auth/auth.service";

const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "/auth/google/callback",
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const emailVerified = profile.emails?.[0]?.verified === true;
      if (!email) return done(null, false, { message: "No email from Google" });

      const user = await findOrCreateUser(
        "google",
        profile.id,
        email,
        emailVerified,
        profile.name?.givenName ?? "",
        profile.name?.familyName ?? "",
      );
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  },
);
const jwtStrategy = new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET!,
    algorithms: ["HS256"],
    audience: process.env.CLIENT_URL!,
  },
  async (jwt_payload, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { publicId: jwt_payload.sub },
      });
      if (!user) throw new NotFoundError();
      return done(null, user);
    } catch (err) {
      if (err instanceof NotFoundError) return done(null, false);
      return done(err, false);
    }
  },
);
passport.use(googleStrategy);
passport.use(jwtStrategy);

export default passport;
