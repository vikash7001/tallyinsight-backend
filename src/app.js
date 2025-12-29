import express from 'express';
import cors from 'cors';
import itemsRoutes from './routes/items.routes.js';

import authRoutes from './routes/auth.routes.js';
import stockRoutes from './routes/stock.routes.js';
import imageRoutes from './routes/image.routes.js';

import { requireAuth } from './middleware/auth.js';
import { licenseGuard } from './middleware/licenseGuard.js';

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Routes
app.use('/auth', authRoutes);
app.use('/stock', requireAuth, licenseGuard, stockRoutes);
app.use('/images', requireAuth, licenseGuard, imageRoutes);
app.use('/items', requireAuth, licenseGuard, itemsRoutes);

export default app;
