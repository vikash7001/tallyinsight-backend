const express = require('express');
const auth = require('./middleware/auth');
const companyContext = require('./middleware/companyContext');
const licenseResolver = require('./middleware/licenseResolver');

const authRoutes = require('./routes/auth.routes');
const userAuthRoutes = require('./routes/auth.user');
const syncRoutes = require('./routes/sync.routes');

const app = express();
app.use(express.json());

// 🔓 PUBLIC user login
app.use('/auth/user', userAuthRoutes);

// admin auth (if any)
app.use('/auth', authRoutes);

// 🔒 protected middleware (GLOBAL)
app.use(auth);
app.use(companyContext);
app.use(licenseResolver);

// protected routes
app.use('/sync', syncRoutes);

module.exports = app;
