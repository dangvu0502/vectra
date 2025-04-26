import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
// @ts-ignore
import {RedisStore} from "connect-redis"
import { passport } from './modules/auth';
import { routes } from './routes';
import { env } from './config/environment';
import { initializeApp } from './core/bootstrap'; // Import the new bootstrap function
import { redisConnection } from './core/queue/connection';
// Removed fileURLToPath and resolve imports, no longer needed here

export const app = express(); // Export app for bootstrap and potential tests

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.json());

// Trust proxy for session cookie in production
app.set('trust proxy', 1);

// Session middleware
app.use(
  session({
    name: 'session',
    // @ts-ignore
    store: new RedisStore({ client: redisConnection }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
  })
);

// Add logging for session initialization
app.use((req, res, next) => {
  console.log('🌐 Request received:', {
    path: req.path,
    method: req.method,
    sessionId: req.sessionID,
    hasSession: !!req.session,
    hasUser: !!req.user
  });

  // Add response cookie logging
  res.on('finish', () => {
    console.log('🍪 Response cookies for', req.method, req.originalUrl, ':', res.getHeaders()['set-cookie']);
  });

  next();
});

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
