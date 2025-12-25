const express = require("express");

const authMiddleware = require("./middleware/auth");
const companyContext = require("./middleware/companyContext");
const licenseResolver = require("./middleware/licenseResolver");

const authRoutes = require("./routes/auth.routes");      // admin auth
const userAuthRoutes = require("./routes/auth.user");    // mobile login
const syncRoutes = require("./routes/sync.routes");

const app = express();

app.use(express.json());

/* =====================
   PUBLIC ROUTES
   ===================== */

// Mobile user login (NO JWT, NO CONTEXT)
app.use("/auth/user", userAuthRoutes);

// Admin login (NO JWT)
app.use("/auth", authRoutes);

// Health check (important for Render & sanity)
app.get("/", (req, res) => {
  res.json({ status: "TallyInsight API running" });
});

/* =====================
   PROTECTED ROUTES
   ===================== */

app.use(
  "/sync",
  authMiddleware("user"),   // requires JWT
  companyContext,           // requires req.user.companyId
  licenseResolver,          // requires company context
  syncRoutes
);

module.exports = app;
