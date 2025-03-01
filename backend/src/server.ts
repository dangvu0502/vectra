import express from 'express';
import { createDocumentService } from '@embeddy/document';

const app = express();

// Mount the document service
app.use(createDocumentService({
  prefix: '/api/v1/documents'
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});