import { authRoutes } from './auth.routes';
import { passport } from './passport.config'; // Export passport for app initialization

export { authRoutes, passport };

// Optionally re-export types if they are commonly needed outside the module
export * from './auth.types';
