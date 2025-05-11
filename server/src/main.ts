import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import { passport } from './modules/auth';
import { routes } from './routes';
import { env } from './config/environment';
import { initializeApp } from './bootstrap'; 
import { redisConnection } from './database/redis/connection';
// @ts-ignore - connect-redis types might not align perfectly with express-session
import { RedisStore } from 'connect-redis';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Trust proxy for session cookie in production
app.set('trust proxy', 1);

app.use(
  session({
    name: 'session',
    // @ts-ignore - RedisStore constructor might have type incompatibilities with session store type
    store: new RedisStore({ client: redisConnection }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/', routes);

initializeApp(app).catch((error) => {
  // Error is already logged in initializeApp, just ensure exit
  console.error("Application failed to initialize.");
  process.exit(1);
});
