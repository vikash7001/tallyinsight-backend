import express from 'express';
import cors from 'cors';

import itemsRoutes from './routes/items.routes.js';
import authRoutes from './routes/auth.routes.js';
import stockRoutes from './routes/stock.routes.js';
import imageRoutes from './routes/image.routes.js';

// existing middleware
import { requireAuth } from './middleware/auth.js';
import { licenseGuard } from './middleware/licenseGuard.js';

// NEW admin header middleware
import adminHeaderAuth from './middleware/adminHeaderAuth.js';

// (admin routes will be added later)
import adminItemsExcelRoutes from './routes/admin.items.excel.routes.js'; // placeholder for next step

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// 🔓 Public / existing routes (UNCHANGED)
app.use('/auth', authRoutes);
app.use('/stock', requireAuth, licenseGuard, stockRoutes);
app.use('/images', requireAuth, licenseGuard, imageRoutes);
app.use('/items', requireAuth, licenseGuard, itemsRoutes);

// 🔐 ADMIN SCOPE (NEW, ISOLATED)
app.use('/admin', adminHeaderAuth);

// admin routes will live here (Excel download/upload)
app.use('/admin', adminItemsExcelRoutes); // safe even if empty for now

export default app;
