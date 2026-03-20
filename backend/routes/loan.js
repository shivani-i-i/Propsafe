import { Router } from 'express';
import { matchLoanOffers } from '../controllers/loanController.js';

const router = Router();

router.post('/match', matchLoanOffers);

export default router;
