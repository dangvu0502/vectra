import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import { initializeDatabase } from './database/connection'; // Import the initializer
import { chatRoutes } from './modules/chat';
import { documentRoutes } from './modules/document'; // Updated import paths
import { passport } from './modules/auth';
import type { UserProfile } from './modules/auth';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.json());

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

// Routes using controllers
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/chat', chatRoutes);

// Google authentication routes
app.get(
  '/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get(
  '/api/auth/google/callback',
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

const PORT = process.env.PORT || 3000;

// Initialize DB before starting the server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('🚀 Server Status:');
    console.log(`- Running on port: ${PORT}`);
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- Document API: http://localhost:${PORT}/api/v1/documents`);
  console.log(`- Chat API: http://localhost:${PORT}/api/v1/chat`);
});
}); // Add missing closing parenthesis and brace for .then()
