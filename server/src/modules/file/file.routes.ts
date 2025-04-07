import { fileController } from '@/modules/file';
import { DEFAULT_CONFIG } from '@/shared/config';
import { Router } from 'express';
import multer from 'multer';
import { ensureAuthenticated } from '@/modules/auth/auth.middleware'; // Corrected import path for auth middleware

const router = Router();
const upload = multer({
    dest: DEFAULT_CONFIG.uploadDir,
    limits: { fileSize: DEFAULT_CONFIG.maxFileSize },
});


// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Pass next to controller methods
router.post('/upload', upload.single('file'), (req, res, next) => {
    return fileController.upload(req, res, next);
});

// Removed /ingest-url route

router.get('/', (req, res, next) => {
    return fileController.query(req, res, next);
});

router.get('/:id', (req, res, next) => {
    return fileController.findById(req, res, next);
});

router.delete('/:id', ensureAuthenticated, (req, res, next) => { // Added ensureAuthenticated and next
    // Pass next to the controller for error handling
    return fileController.delete(req, res, (err) => { if (err) console.error(err); }); // Basic error logging
});

// GET /api/files/:id/collections - Get collections for a specific file
router.get('/:id/collections', ensureAuthenticated, (req, res, next) => {
    // Pass next to the controller for error handling
    return fileController.getCollectionsForFile(req, res, next);
});


export { router as fileRoutes };
