import { Router } from 'express';
import { runPropertyAgent } from '../controllers/agentController.js';

const router = Router();

router.post('/evaluate', runPropertyAgent);

export default router;