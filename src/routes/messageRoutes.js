import express from 'express';
import { getChatHistory } from '../controllers/messageController.js';
import { authenticateHTTP } from '../middleware/auth.js';

const router = express.Router();

router.get('/history/:userId', authenticateHTTP, getChatHistory);

export default router;


