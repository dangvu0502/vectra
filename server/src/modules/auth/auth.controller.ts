import type { Request, Response } from "express";
import type { UserProfile } from "./auth.types";
import { env } from "@/config/environment";

/**
 * Handles the request to get the user's profile.
 * Sends the user's display name if authenticated, otherwise sends 401 Unauthorized.
 */

const HOST = env.NODE_ENV === "production" ? env.APP_URL : "http://localhost:5173";

export const getProfile = (req: Request, res: Response) => {
  console.log('👤 Profile request received');
  console.log('Session:', req.session ? 'Present' : 'Missing');
  console.log('User:', req.user ? 'Present' : 'Missing');
  
  const user = req.user as UserProfile;
  if (!user) {
    console.log('❌ No user found in request');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  console.log('✅ Sending user profile:', {
    id: user.id,
    email: user.email,
    displayName: user.display_name
  });

  res.json({
    id: user.id,
    displayName: user.display_name,
    email: user.email,
    profilePictureUrl: user.profile_picture_url,
  });
};

/**
 * Handles the successful Google OAuth callback.
 * Redirects the user to the frontend application upon successful login.
 * TODO: Make the redirect URL configurable.
 */
export const googleCallbackSuccess = (req: Request, res: Response) => {
  console.log('🔄 Google callback success handler');
  console.log('👤 User in request:', req.user ? 'Present' : 'Missing');
  console.log('🍪 Session:', req.session ? 'Present' : 'Missing');
  console.log('🔗 Redirecting to:', `${HOST}/`);
  res.redirect(`${HOST}/`);
};

/**
 * Handles the failed Google OAuth callback.
 * Redirects the user to a frontend login failure page or back to the login page.
 * TODO: Make the redirect URL configurable.
 */
export const googleCallbackFailure = (req: Request, res: Response) => {
  // Authentication failed
  // Redirect to a frontend failure page or back to the login page
  res.redirect(`${HOST}/login/failure`); // Adjust this URL to your frontend app
};

/**
 * Handles user logout by destroying the session and clearing cookies.
 * Sends a success message upon successful logout.
 */
export const logout = (req: Request, res: Response, next: Function) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    // Clear session cookie and perform cleanup
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Session destruction error:", destroyErr);
        // Still send success response as the user is effectively logged out
      }
      res.clearCookie("connect.sid"); // Default session cookie name
      res.status(200).json({ message: "Successfully logged out" });
    });
  });
};
