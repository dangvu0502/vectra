import express from 'express';
import morgan from 'morgan';
import { createDocumentService } from '@embeddy/document';

const app = express();

// Request logging middleware
app.use(morgan('dev'));

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

// Mount the document service
app.use(createDocumentService({
  prefix: '/api/v1/documents'
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Server Status:');
  console.log(`- Running on port: ${PORT}`);
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- Document API: http://localhost:${PORT}/api/v1/documents`);
});