import { Router } from 'express';
import { analyzeFraud } from '../controllers/fraudController.js';

const router = Router();
router.post('/analyze', analyzeFraud);
export default router;
