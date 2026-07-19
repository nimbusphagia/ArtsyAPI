import { Router } from "express";
import passport from "passport";
import { requireAuth } from "../../middleware/requireAuth";
import {
  oauthCallback,
  refresh,
  register,
  login,
  editAccount,
} from "./auth.controller";

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
router.post("/register", register);
router.post("/login", login);
router.patch("/account/edit", requireAuth, editAccount);

export default router;
