import { Router } from 'express';
import { submitGpsSurvey } from '../controllers/gpsSurveyController.js';

const router = Router();

router.post('/submit', submitGpsSurvey);

export default router;
