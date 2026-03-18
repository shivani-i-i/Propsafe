/**
 * PropSafe Backend — server.js
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import fraudRoutes  from './routes/fraud.js';
import lawyerRoutes from './routes/lawyers.js';
import priceRoutes  from './routes/price.js';
import chatRoutes   from './routes/chat.js';

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─── Middleware ─── */
app.use(cors({ origin: '*' }));
app.use(express.json());

/* ─── Health Check ─── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PropSafe Backend', timestamp: new Date().toISOString() });
});

/* ─── Routes ─── */
app.use('/api/fraud',   fraudRoutes);
app.use('/api/lawyers', lawyerRoutes);
app.use('/api/price',   priceRoutes);
app.use('/api/chat',    chatRoutes);

/* ─── 404 Handler ─── */
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/* ─── Global Error Handler ─── */
app.use((err, _req, res, _next) => {
  console.error('[PropSafe Error]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

/* ─── Start ─── */
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   PropSafe Backend — Running ✅      ║
  ║   http://localhost:${PORT}              ║
  ║   Health: /health                    ║
  ╚══════════════════════════════════════╝
  `);
});
