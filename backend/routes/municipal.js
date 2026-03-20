import { Router } from 'express';
import { verifyMunicipal } from '../controllers/municipalController.js';

const router = Router();

router.post('/verify', verifyMunicipal);

export default router;
