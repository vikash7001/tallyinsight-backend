import express from 'express';
import cors from 'cors';

import itemsRoutes from './routes/items.routes.js';
import authRoutes from './routes/auth.routes.js';
import stockRoutes from './routes/stock.routes.js';
import imageRoutes from './routes/image.routes.js';

import { requireAuth } from './middleware/auth.js';
import { licenseGuard } from './middleware/licenseGuard.js';

import adminItemsExcelRoutes from './routes/admin.items.excel.routes.js';
import adminDevicesRoutes from './routes/admin.devices.routes.js';

import agentAuthRoutes from './routes/agent.auth.routes.js';
import agentCompaniesRoutes from './routes/agent.companies.routes.js';
import agentProvisionRoutes from './routes/agent.provision.routes.js';
import agentStockRoutes from './routes/agent.stock.routes.js';

import adminHeaderAuth from './middleware/adminHeaderAuth.js';
import tdlStockRoutes from './routes/tdl.stock.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// 🔓 Public auth
app.use('/auth', authRoutes);

// 🔐 User-scoped routes
app.use('/stock', requireAuth, licenseGuard, stockRoutes);
app.use('/images', requireAuth, licenseGuard, imageRoutes);
app.use('/items', requireAuth, licenseGuard, itemsRoutes);

// 🔐 Admin routes (header based)
app.use('/admin', adminHeaderAuth);
app.use('/admin', adminItemsExcelRoutes);
app.use('/admin', adminDevicesRoutes);

// 🔐 TDL routes (no auth)
app.use('/tdl', tdlStockRoutes);

// 🤖 Agent routes
app.use('/agent', agentAuthRoutes);
app.use('/agent', agentCompaniesRoutes);
app.use('/agent', agentProvisionRoutes);
app.use('/agent', agentStockRoutes);

export default app;
