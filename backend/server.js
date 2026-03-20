import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import fraudRoutes from './routes/fraud.js';
import lawyerRoutes from './routes/lawyers.js';
import priceRoutes from './routes/price.js';
import chatRoutes from './routes/chat.js';
import ocrRoutes from './routes/ocr.js';
import municipalRoutes from './routes/municipal.js';
import loanRoutes from './routes/loan.js';
import dashboardRoutes from './routes/dashboard.js';
import { connectDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });
await connectDB();

const app = express();
const PORT = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/fraud', fraudRoutes);
app.use('/api/lawyers', lawyerRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/municipal', municipalRoutes);
app.use('/api/loan', loanRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log('Server running on port 3000');
});
