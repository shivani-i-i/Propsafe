import { Router } from 'express';
import { predictPrice } from '../controllers/priceController.js';

const router = Router();
router.post('/predict', predictPrice);
export default router;
