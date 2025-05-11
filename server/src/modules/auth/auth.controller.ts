import type { Request, Response } from "express";
import type { UserProfile } from "./auth.types";
import { env } from "@/config/environment";

/**
 * Handles the request to get the user's profile.
 * Sends the user's display name if authenticated, otherwise sends 401 Unauthorized.
 */

const HOST = env.NODE_ENV === "production" ? env.APP_URL : "http://localhost:5173";

export const getProfile = (req: Request, res: Response) => {
  const user = req.user as UserProfile;
  // Respond with relevant user info (e.g., avoid sending sensitive data like password hashes)
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
  // On successful authentication, redirect to the frontend application.
  // TODO: Consider passing a token or session identifier if needed by the frontend.
  res.redirect(`${HOST}/`); // Adjust redirect URL as needed
};

/**
 * Handles the failed Google OAuth callback.
 * Redirects the user to a frontend login failure page or back to the login page.
 * TODO: Make the redirect URL configurable.
 */
export const googleCallbackFailure = (req: Request, res: Response) => {
  // On authentication failure, redirect to a frontend failure page.
  res.redirect(`${HOST}/login/failure`); // Adjust redirect URL as needed
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
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Session destruction error:", destroyErr);
        // Still send success response as the user is effectively logged out,
        // even if session destruction had a minor issue.
      }
      res.clearCookie("connect.sid"); // 'connect.sid' is the default session cookie name for express-session
      res.status(200).json({ message: "Successfully logged out" });
    });
  });
};
