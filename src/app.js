import express from 'express';
import cors from 'cors';

/* =========================
   ROUTE IMPORTS
========================= */
import signupRoutes from './routes/signup.routes.js';
import adminProfileRoutes from './routes/adminProfile.js';
import companyMineRoutes from './routes/company.mine.routes.js';
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
   🔓 PUBLIC / OTP (MUST BE FIRST)
===================================================== */
app.use(agentAdminOtpRequestRoutes);
app.use(agentAdminOtpVerifyRoutes);

/* =====================================================
   🔓 PUBLIC / ONBOARDING
===================================================== */
app.use('/signup', signupRoutes);
app.use('/companies', companyMineRoutes);   // GET /companies/mine
app.use('/companies', companyRoutes);       // create / edit company
app.use('/subscriptions', subscriptionRoutes);

/* =====================================================
   🔓 AUTH / IDENTIFY
===================================================== */
app.use('/auth', authRoutes);
app.use('/agent', agentIdentifyRouter);

/* =====================================================
   🏢 COMPANY-SCOPED USER ROUTES
   (middleware INSIDE route files)
===================================================== */
app.use('/items', itemsRoutes);
app.use('/stock', stockRoutes);
app.use('/stock', activeStockRoutes);
app.use('/images', imageRoutes);
app.use('/sync', syncRoutes);
app.use('/ledger', ledgerRoutes);

/* =====================================================
   🔐 ADMIN ROUTES
   (adminHeaderAuth INSIDE route files)
===================================================== */
app.use('/admin/profile', adminProfileRoutes);
app.use('/admin', adminCompaniesRoutes);
app.use('/admin', adminItemsExcelRoutes);
app.use('/admin', adminDevicesRoutes);
app.use('/admin', adminInstallerCompaniesRoutes);

/* =====================================================
   🤖 AGENT ROUTES (DEVICE AUTH ONLY)
===================================================== */
app.use('/agent', agentAuthRoutes);
app.use('/agent', agentOtpRoutes);
app.use('/agent', agentOtpVerifyRoutes);
app.use('/agent', agentCompaniesRoutes);
app.use('/agent', agentProvisionRoutes);
app.use('/agent', agentStockRoutes);
app.use('/agent', agentLedgerRoutes);

/* =====================================================
   🔐 TDL
===================================================== */
app.use('/tdl', tdlStockRoutes);

export default app;
