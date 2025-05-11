import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findUserByProvider, createUser, findUserById } from './auth.service';
import type { UserProfile } from './auth.types';
import { env } from '@/config/environment';

const HOST = env.NODE_ENV === "production" ? env.APP_URL : "http://localhost:3000"; // Base URL for constructing callback

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // This callbackURL must be registered in the Google Cloud Console for your OAuth client
      // and match the route defined in auth.routes.ts (e.g., /api/auth/google/callback).
      callbackURL: `${HOST}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await findUserByProvider('google', profile.id);

        if (existingUser) {
          return done(null, existingUser);
        }

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

// serializeUser determines which data of the user object should be stored in the session.
// Typically, only the user ID is stored to keep the session data small.
passport.serializeUser((user: any, done) => { // user object comes from the strategy's done() callback
  done(null, user.id); // Store user.id in the session
});

// deserializeUser retrieves the full user data from the database using the ID stored in the session.
passport.deserializeUser(async (id: string, done) => { // id is the user.id stored by serializeUser
  try {
    const user = await findUserById(id);
    if (user) {
      done(null, user as UserProfile); // User object is attached to req.user
    } else {
      done(new Error('User not found during deserialization.'));
    }
  } catch (error) {
    console.error('Error during deserialization:', error);
    done(error);
  }
});

export { passport };
