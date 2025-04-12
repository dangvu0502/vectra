import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
// Removed initializeDatabase import, handled by bootstrap
import { passport } from './modules/auth';
import { routes } from './routes';
import { env } from './config/environment';
import { initializeApp } from './core/bootstrap'; // Import the new bootstrap function
// Removed fileURLToPath and resolve imports, no longer needed here

export const app = express(); // Export app for bootstrap and potential tests

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

// Mount the aggregated routes
app.use('/api/', routes);

  initializeApp().catch((error) => {
    // Error is already logged in initializeApp, just ensure exit
    console.error("Application failed to initialize.");
    process.exit(1);
  });
// No need to export app again, already exported at the top
