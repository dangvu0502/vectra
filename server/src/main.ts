import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import { initializeDatabase } from './database/connection'; 
import { passport } from './modules/auth'; 
import { routes } from './routes'; 
import { env } from './config/environment';

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

// Mount the aggregated routes
app.use('/api/', routes);

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
