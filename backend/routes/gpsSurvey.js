import { Router } from 'express';
import { submitGpsSurvey, browseSurveys, getSurveyDetails } from '../controllers/gpsSurveyController.js';

const router = Router();

router.post('/submit', submitGpsSurvey);
router.get('/browse', browseSurveys);
router.get('/:certificateId', getSurveyDetails);

export default router;
