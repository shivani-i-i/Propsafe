import { Router } from 'express';
import multer from 'multer';
import { extractDocumentText } from '../controllers/ocrController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/extract', upload.single('document'), extractDocumentText);

export default router;
