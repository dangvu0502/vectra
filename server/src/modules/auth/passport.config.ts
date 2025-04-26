import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findUserByProvider, createUser, findUserById } from './auth.service';
import type { UserProfile } from './auth.types';
import { env } from '@/config/environment'; // Assuming env config is here

const HOST = env.NODE_ENV === "production" ? env.APP_URL : "http://localhost:3000";
// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Ensure this matches the callback route defined in auth.routes.ts
      callbackURL: `${HOST}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔍 Google OAuth callback received:', {
          profileId: profile.id,
          email: profile.emails?.[0]?.value,
          displayName: profile.displayName
        });

        // Check if the user already exists
        const existingUser = await findUserByProvider('google', profile.id);
        console.log('🔍 User lookup result:', existingUser ? 'User exists' : 'User not found');

        if (existingUser) {
          console.log('✅ Returning existing user');
          return done(null, existingUser);
        }

        // Create a new user if they don't exist
        console.log('➕ Creating new user');
        const newUser = await createUser({
          provider: 'google',
          provider_id: profile.id,
          email: profile.emails ? profile.emails[0].value : null,
          display_name: profile.displayName,
          profile_picture_url: profile.photos ? profile.photos[0].value : null,
        });
        console.log('✅ New user created:', { id: newUser.id, email: newUser.email });

        return done(null, newUser);
      } catch (error) {
        console.error('❌ Error during Google OAuth strategy:', error);
        return done(error instanceof Error ? error : new Error('Authentication error'));
      }
    }
  )
);

// Serialize user: Determine what data of the user object should be stored in the session
passport.serializeUser((user: any, done) => {
  console.log('📦 Serializing user:', { id: user.id, email: user.email });
  done(null, user.id);
});

// Deserialize user: Retrieve user data from the session using the ID
passport.deserializeUser(async (id: string, done) => {
  try {
    console.log('📦 Deserializing user:', { id });
    const user = await findUserById(id);
    if (user) {
      console.log('✅ User deserialized successfully');
      done(null, user as UserProfile);
    } else {
      console.error('❌ User not found during deserialization');
      done(new Error('User not found during deserialization.'));
    }
  } catch (error) {
    console.error('❌ Error during deserialization:', error);
    done(error);
  }
});

// Export the configured passport instance
export { passport };
