import { Router } from "express";
import passport from "passport";
import { oauthCallback, refresh } from "./auth.controller";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth`,
  }),
  oauthCallback,
);

router.post("/refresh", refresh);
router.post("/register", refresh);
router.post("/login", refresh);

export default router;
