import type { Request, Response } from "express";
import type { UserProfile } from "./auth.types";

/**
 * Handles the request to get the user's profile.
 * Sends the user's display name if authenticated, otherwise sends 401 Unauthorized.
 */
export const getProfile = (req: Request, res: Response) => {
  const user = req.user as UserProfile;
  // Respond with relevant user info (avoid sending sensitive data)
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
  // Successful authentication
  // Redirect to the frontend application, potentially passing a token or session info
  // For now, redirecting to a placeholder frontend route
  res.redirect("http://localhost:5173/"); // Adjust this URL to your frontend app
};

/**
 * Handles the failed Google OAuth callback.
 * Redirects the user to a frontend login failure page or back to the login page.
 * TODO: Make the redirect URL configurable.
 */
export const googleCallbackFailure = (req: Request, res: Response) => {
  // Authentication failed
  // Redirect to a frontend failure page or back to the login page
  res.redirect("http://localhost:5173/login/failure"); // Adjust this URL to your frontend app
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
