import express from 'express';
import cors from 'cors';

import itemsRoutes from './routes/items.routes.js';
import authRoutes from './routes/auth.routes.js';
import stockRoutes from './routes/stock.routes.js';
import imageRoutes from './routes/image.routes.js';

import { requireAuth } from './middleware/auth.js';
import { licenseGuard } from './middleware/licenseGuard.js';
import adminItemsExcelRoutes from './routes/admin.items.excel.routes.js';

// NEW admin header middleware
import adminHeaderAuth from './middleware/adminHeaderAuth.js';
import tdlStockRoutes from './routes/tdl.stock.routes.js';
import agentStockRoutes from './routes/agent.stock.routes.js';
import agentProvisionRoutes from './routes/agent.provision.routes.js';



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
app.use('/admin', adminItemsExcelRoutes);
// 🔐 TDL routes (no user auth)
app.use('/tdl', tdlStockRoutes);
app.use('/agent', agentStockRoutes);
app.use('/agent', agentProvisionRoutes);

export default app;
