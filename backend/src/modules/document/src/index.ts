import { createDocumentRouter } from './routes';
import { createDocumentService } from './services';
import { createDocumentStorage } from './storage';

const storage = createDocumentStorage();
const service = createDocumentService(storage);
const router = createDocumentRouter(service);

export default router;