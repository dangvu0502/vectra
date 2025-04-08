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
// Endpoint for single or bulk file uploads (using upload.array)
router.post('/upload', upload.array('files', 10), (req, res, next) => { // Changed path to /upload, uses upload.array
    return fileController.uploadBulk(req, res, next); // Calls the bulk handler
});


// Middleware is now applied globally above
router.get('/', (req, res, next) => { // Removed ensureAuthenticated here
    return fileController.query(req, res, next);
});

router.get('/:id', (req, res, next) => { // Removed ensureAuthenticated here
    return fileController.findById(req, res, next);
});

router.delete('/:id', (req, res, next) => { // Removed ensureAuthenticated here
    // Pass next to the controller for error handling
    return fileController.delete(req, res, (err) => { if (err) console.error(err); }); // Basic error logging
});

// GET /api/files/:id/collections - Get collections for a specific file
router.get('/:id/collections', (req, res, next) => { // Removed ensureAuthenticated here
    // Pass next to the controller for error handling
    return fileController.getCollectionsForFile(req, res, next);
});


export { router as fileRoutes };
