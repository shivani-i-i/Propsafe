import { Router } from 'express';
import { getLawyers, bookLawyer } from '../controllers/lawyerController.js';

const router = Router();
router.get('/', getLawyers);
router.post('/book', bookLawyer);
export default router;
