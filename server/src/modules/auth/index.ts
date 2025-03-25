import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../../db';
import dotenv from 'dotenv';

dotenv.config();

// Define a custom user interface
export interface UserProfile {
  id: string;
  provider: string;
  provider_id: string;
  email: string;
  display_name?: string;
  profile_picture_url?: string;
}

// Passport configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: 'http://localhost:3000/api/auth/google/callback', // Adjust as needed
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if the user already exists
        const existingUser = await db('users')
          .where({ provider: 'google', provider_id: profile.id })
          .first();

        if (existingUser) {
          return done(null, existingUser);
        }

        // Create a new user
        const newUser = await db('users')
          .insert({
            provider: 'google',
            provider_id: profile.id,
            email: profile.emails ? profile.emails[0].value : null, // Ensure email is handled
            display_name: profile.displayName,
            profile_picture_url: profile.photos ? profile.photos[0].value : null, // Ensure photo is handled
          })
          .returning('*');
          
        return done(null, newUser[0]);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await db('users').where({ id }).first();
    // Use the custom interface
    done(null, user as UserProfile);
  } catch (error) {
    done(error);
  }
});
export { passport };
