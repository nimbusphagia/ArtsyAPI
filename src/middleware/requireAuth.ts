import passport from "../config/passport";

export const requireAuth = passport.authenticate("jwt", { session: false });
