# Auth Module

This module handles user authentication and authorization for the Vectra server.

## Features

- User registration and login (potentially implied, though focus is on OAuth)
- OAuth authentication using Passport.js with Google and GitHub strategies.
- Session management using `express-session`.
- Middleware for protecting routes (`isAuthenticated`).

## Authentication Flow (OAuth)

1.  User initiates login via `/auth/google` or `/auth/github`.
2.  User is redirected to the respective provider (Google/GitHub) for authorization.
3.  Provider redirects back to the server's callback URL (`/auth/google/callback` or `/auth/github/callback`) with an authorization code or user profile.
4.  The Passport strategy verifies the user, finds or creates a corresponding user record in the database (`users` table).
5.  User information is stored in the session, establishing a logged-in state.
6.  User is redirected to the frontend application (e.g., `/`).

## Session Management

- Sessions are managed using `express-session`, storing session data according to the configured session store (defaulting to in-memory, but configurable).
- The `SESSION_SECRET` environment variable is used to sign the session ID cookie.
- The `isAuthenticated` middleware checks for a valid session before allowing access to protected routes.

## Authorization / Roles

*(Details about specific roles or permissions related to file access or other resources should be added here as the system evolves. Currently, authentication primarily confirms user identity.)*

## Key Files

- `auth.controller.ts`: Handles HTTP requests for authentication endpoints.
- `auth.service.ts`: Contains the business logic for user lookup/creation during OAuth flow.
- `auth.queries.ts`: Database queries related to the `users` table.
- `auth.routes.ts`: Defines the API routes for authentication (`/auth/*`).
- `auth.middleware.ts`: Includes the `isAuthenticated` middleware.
- `passport.config.ts`: Configures Passport strategies (Google, GitHub) and serialization/deserialization.
