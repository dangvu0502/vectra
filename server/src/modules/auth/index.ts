import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from '../../db'; // Import the database pool
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
        const existingUser = await pool.query(
          'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
          ['google', profile.id]
        );

        if (existingUser.rows.length > 0) {
          return done(null, existingUser.rows[0]);
        }

        // Create a new user
        const newUser = await pool.query(
          'INSERT INTO users (provider, provider_id, email, display_name, profile_picture_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [
            'google',
            profile.id,
            profile.emails ? profile.emails[0].value : null, // Ensure email is handled
            profile.displayName,
            profile.photos ? profile.photos[0].value : null, // Ensure photo is handled
          ]
        );

        return done(null, newUser.rows[0]);
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
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    // Use the custom interface
    done(null, user.rows[0] as UserProfile);
  } catch (error) {
    done(error);
  }
});

export { passport };
