import type { Request, Response, NextFunction } from 'express';
import type { UserProfile } from './auth.types'; // Assuming UserProfile is defined here
import { TEST_USER_ID } from '@/config/constants'; // Import necessary constants

/**
 * Middleware to ensure the user is authenticated.
 * Attaches a test user profile for development/testing purposes.
 * In a real application, this would verify a session or token.
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Replace with actual authentication logic (session/token verification)
  req.user = {
    id: TEST_USER_ID
  } as UserProfile;

  if (!req.user) {
    // Use void to indicate no return value is expected after sending response
    return void res.status(401).json({ message: 'Unauthorized' });
  }
  // Proceed to the next middleware/handler if authenticated
  next();
};
