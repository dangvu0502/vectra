import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import { documentRoutes } from '@/modules/document';

import { passport } from './modules/auth';
import type { UserProfile } from './modules/auth';
import { pool } from './db'; // Import the database pool

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_session_secret', // Use environment variable
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }, // Use secure cookies in production
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/v1/documents', documentRoutes);

// Google authentication routes
app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }), // Redirect to home on failure
  (req, res) => {
    // Successful authentication, redirect or send response
    res.redirect('/profile'); // Or send a success response: res.send('Logged in!');
  }
);

// Example protected route
app.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user as UserProfile;
    res.send(`Welcome, ${user.display_name}!`);
  } else {
    res.status(401).send('Unauthorized');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Mount routes
app.use('/api/v1/documents', documentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Server Status:');
  console.log(`- Running on port: ${PORT}`);
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- Document API: http://localhost:${PORT}/api/v1/documents`);
});
