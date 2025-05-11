import express from "express";
import { passport } from "./passport.config";
import { ensureAuthenticated } from "./auth.middleware";
import { getProfile, googleCallbackSuccess, logout } from "./auth.controller";

const router = express.Router();

// 1. Initiate Google OAuth flow
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"], // Request access to profile and email
    prompt: "select_account", // Prompt user to select account if multiple are available
  })
);

// 2. Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { // Handles success/failure based on passport strategy
    failureMessage: true, // Enables failure messages to be set (e.g., for req.flash)
  }),
  (req, res) => { // This handler is invoked only on successful authentication
    googleCallbackSuccess(req, res); // req.user is populated by Passport
  }
  // Note: Passport's default behavior on failure is to call next(err) or redirect.
  // If you need custom failure handling *within the route*, you might need a more complex setup
  // or rely on the failureRedirect/failureMessage options if sufficient.
  // For simplicity, we'll rely on the controller/redirect approach for now.
  // A dedicated failure route could also be added if needed.
);

router.get("/me", ensureAuthenticated, getProfile);
router.post("/logout", logout);

export const authRoutes = router;
