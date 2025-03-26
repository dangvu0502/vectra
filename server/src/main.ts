import express from 'express';
import morgan from 'morgan';
import { initializeDatabase } from './database/connection'; // Import the initializer
import { chatRoutes } from './modules/chat';
import { documentRoutes } from './modules/document'; // Updated import paths

const app = express();

app.use(morgan('dev'));
app.use(express.json());

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// Mount routes using controllers
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/chat', chatRoutes);

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
