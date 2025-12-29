import express from 'express';
import cors from 'cors';

import itemsRoutes from './routes/items.routes.js';
import authRoutes from './routes/auth.routes.js';
import stockRoutes from './routes/stock.routes.js';
import imageRoutes from './routes/image.routes.js';

import { requireAuth } from './middleware/auth.js';
import { licenseGuard } from './middleware/licenseGuard.js';

// NEW admin header middleware
import adminHeaderAuth from './middleware/adminHeaderAuth.js';

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// 🔓 Existing routes — UNCHANGED
app.use('/auth', authRoutes);
app.use('/stock', requireAuth, licenseGuard, stockRoutes);
app.use('/images', requireAuth, licenseGuard, imageRoutes);
app.use('/items', requireAuth, licenseGuard, itemsRoutes);

// 🔐 Admin scope — middleware only (NO routes yet)
app.use('/admin', adminHeaderAuth);

export default app;
