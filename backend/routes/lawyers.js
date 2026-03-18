import { Router } from 'express';
import { getLawyers } from '../controllers/lawyerController.js';

const router = Router();
router.get('/', getLawyers);
export default router;
