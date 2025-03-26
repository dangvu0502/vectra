import { Router } from 'express';
import { chatController } from '@/modules/chat'; // Import the singleton instance

const router = Router();

// Map route directly to the controller method
router.post('/', (req, res) => {
    return chatController.chat(req, res);
});

// Removed GET /history as the method doesn't exist in the controller

export { router as chatRoutes }; // Export the router directly
