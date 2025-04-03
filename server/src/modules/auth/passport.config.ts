import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findUserByProvider, createUser, findUserById } from './auth.service';
import type { UserProfile } from './auth.types';
import { env } from '@/config/environment'; // Assuming env config is here

// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Ensure this matches the callback route defined in auth.routes.ts
      callbackURL: `${env.API_BASE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if the user already exists
        const existingUser = await findUserByProvider('google', profile.id);

        if (existingUser) {
          return done(null, existingUser);
        }

        // Create a new user if they don't exist
        const newUser = await createUser({
          provider: 'google',
          provider_id: profile.id,
          email: profile.emails ? profile.emails[0].value : null,
          display_name: profile.displayName,
          profile_picture_url: profile.photos ? profile.photos[0].value : null,
        });

        return done(null, newUser);
      } catch (error) {
        console.error('Error during Google OAuth strategy:', error);
        return done(error instanceof Error ? error : new Error('Authentication error'));
      }
    }
  )
);

// Serialize user: Determine what data of the user object should be stored in the session
passport.serializeUser((user: any, done) => {
  // Store only the user ID in the session
  done(null, user.id);
});

// Deserialize user: Retrieve user data from the session using the ID
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await findUserById(id);
    if (user) {
      done(null, user as UserProfile); // Pass the full user profile
    } else {
      done(new Error('User not found during deserialization.'));
    }
  } catch (error) {
    console.error('Error during deserialization:', error);
    done(error);
  }
});

// Export the configured passport instance
export { passport };
