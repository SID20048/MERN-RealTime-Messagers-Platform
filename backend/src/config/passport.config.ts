import passport from "passport";
import { Strategy as JwtStrategy } from "passport-jwt";
import { Env } from "./env.config";
import { findByIdUserService } from "../services/user.service";

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: (req) => {
        let token = null;
        // Safely extract token without throwing runtime errors inside the extractor
        if (req && req.cookies) {
          token = req.cookies.accessToken;
        }
        return token;
      },
      secretOrKey: Env.JWT_SECRET,
      // If you aren't explicitly signing tokens with an audience block, 
      // it's safer to omit this or ensure it matches your sign options.
    },
    // 1. Destructure "id" instead of "userId" to match your token payload structure
    async ({ id }, done) => {
      try {
        const user = id && (await findByIdUserService(id));
        return done(null, user || false);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

export const passportAuthenticateJwt = passport.authenticate("jwt", {
  session: false,
});
