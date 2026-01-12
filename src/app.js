import express from 'express';
import cors from 'cors';

/* =========================
   ROUTE IMPORTS
========================= */
import signupRoutes from './routes/signup.routes.js';
import adminProfileRoutes from './routes/adminProfile.js';
import companyRoutes from './routes/company.routes.js';
import subscriptionRoutes from './routes/subscriptions.js';

import authRoutes from './routes/auth.routes.js';
import itemsRoutes from './routes/items.routes.js';
import stockRoutes from './routes/stock.routes.js';
import activeStockRoutes from './routes/stock.active.routes.js';
import imageRoutes from './routes/image.routes.js';
import syncRoutes from './routes/sync.routes.js';

import adminCompaniesRoutes from './routes/admin.companies.routes.js';
import adminItemsExcelRoutes from './routes/admin.items.excel.routes.js';
import adminDevicesRoutes from './routes/admin.devices.routes.js';
import adminInstallerCompaniesRoutes from './routes/admin.installer.companies.routes.js';

import agentIdentifyRouter from './routes/agentIdentify.js';
import agentAuthRoutes from './routes/agent.auth.routes.js';
import agentOtpRoutes from './routes/agent.otp.routes.js';
import agentOtpVerifyRoutes from './routes/agent.otp.verify.routes.js';
import agentAdminOtpRequestRoutes from './routes/agent.admin.otp.routes.js';
import agentAdminOtpVerifyRoutes from './routes/agent.admin.otp.verify.routes.js';
import agentCompaniesRoutes from './routes/agent.companies.routes.js';
import agentProvisionRoutes from './routes/agent.provision.routes.js';
import agentStockRoutes from './routes/agent.stock.routes.js';
import agentLedgerRoutes from './routes/agent.ledger.routes.js';

import tdlStockRoutes from './routes/tdl.stock.routes.js';
import ledgerRoutes from './routes/ledger.route.js';

/* =========================
   MIDDLEWARE
========================= */
import { requireAuth } from './middleware/auth.js';
import { licenseGuard } from './middleware/licenseGuard.js';
import adminHeaderAuth from './middleware/adminHeaderAuth.js';

/* =========================
   APP INIT
========================= */
const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   HEALTH
========================= */
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

/* =====================================================
   🔓 PUBLIC / ONBOARDING ROUTES (NO ADMIN GUARDS)
===================================================== */
app.use('/signup', signupRoutes);
app.use('/admin/profile', adminProfileRoutes);   // 👈 IMPORTANT
app.use('/companies', companyRoutes);
app.use('/subscriptions', subscriptionRoutes);

/* =====================================================
   🔓 AUTH / AGENT IDENTIFY
===================================================== */
app.use('/auth', authRoutes);
app.use('/agent', agentIdentifyRouter);

/* =====================================================
   🔐 USER-SCOPED ROUTES (APP USERS)
===================================================== */
app.use('/stock', requireAuth, licenseGuard, stockRoutes);
app.use('/stock', requireAuth, licenseGuard, activeStockRoutes);
app.use('/images', requireAuth, licenseGuard, imageRoutes);
app.use('/items', requireAuth, licenseGuard, itemsRoutes);
app.use('/sync', requireAuth, licenseGuard, syncRoutes);

/* =====================================================
   🔐 ADMIN ROUTES (HEADER-BASED — AFTER ONBOARDING)
===================================================== */
app.use('/admin', adminHeaderAuth);           // 🔐 guard starts
app.use('/admin', adminCompaniesRoutes);
app.use('/admin', adminItemsExcelRoutes);
app.use('/admin', adminDevicesRoutes);
app.use('/admin', adminInstallerCompaniesRoutes);

/* =====================================================
   🤖 AGENT ROUTES
===================================================== */
app.use('/agent', agentAuthRoutes);
app.use('/agent', agentOtpRoutes);
app.use('/agent', agentOtpVerifyRoutes);
app.use('/agent', agentAdminOtpRequestRoutes);
app.use('/agent', agentAdminOtpVerifyRoutes);
app.use('/agent', agentCompaniesRoutes);
app.use('/agent', agentProvisionRoutes);
app.use('/agent', agentStockRoutes);
app.use('/agent', agentLedgerRoutes);

/* =====================================================
   🔐 TDL / LEDGER
===================================================== */
app.use('/tdl', tdlStockRoutes);
app.use('/ledger', ledgerRoutes);

export default app;
