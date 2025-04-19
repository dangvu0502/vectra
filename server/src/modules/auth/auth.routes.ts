import express from 'express';
import { passport } from './passport.config'; // Import configured passport
import {
  getProfile,
  googleCallbackSuccess,
  logout,
} from './auth.controller'; // Import controllers

const router = express.Router();

// --- Google Authentication Routes ---

// 1. Initiate Google OAuth flow
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'], // Request access to profile and email
    prompt: 'select_account', // Optional: Always prompt user to select account
  })
);

// 2. Google OAuth Callback
//    Handles both success and failure scenarios based on passport configuration
router.get(
  '/google/callback',
  passport.authenticate('google', {
    // failureRedirect: '/login/failure', // Redirect handled by controller now
    // successRedirect: '/login/success', // Redirect handled by controller now
    failureMessage: true, // Optional: Store failure message in session flash
  }),
  (req, res) => {
    // This middleware runs only on successful authentication
    // req.user is populated by passport
    googleCallbackSuccess(req, res);
  }
  // Note: Passport's default behavior on failure is to call next(err) or redirect.
  // If you need custom failure handling *within the route*, you might need a more complex setup
  // or rely on the failureRedirect/failureMessage options if sufficient.
  // For simplicity, we'll rely on the controller/redirect approach for now.
  // A dedicated failure route could also be added if needed.
);

router.get('/me', getProfile);
router.post('/logout', logout);

export const authRoutes = router;
