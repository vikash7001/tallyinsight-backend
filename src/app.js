const express = require("express");

const authMiddleware = require("./middleware/auth");
const companyContext = require("./middleware/companyContext");
const licenseResolver = require("./middleware/licenseResolver");

const authRoutes = require("./routes/auth.routes");      // admin auth
const userAuthRoutes = require("./routes/auth.user");    // mobile login
const syncRoutes = require("./routes/sync.routes");
const mobileFeedRoutes = require("./routes/mobile.feed"); // ✅ MOBILE FEED

const app = express();

app.use(express.json());

/* =====================
   PUBLIC ROUTES
   ===================== */

// Mobile user login (NO JWT, NO CONTEXT)
app.use("/auth/user", userAuthRoutes);

// Admin login (NO JWT)
app.use("/auth", authRoutes);

// Health check (Render + sanity)
app.get("/", (req, res) => {
  res.json({ status: "TallyInsight API running" });
});

/* =====================
   PROTECTED ROUTES
   ===================== */

// Stock sync (existing)
app.use(
  "/sync",
  authMiddleware("user"),
  companyContext,
  licenseResolver,
  syncRoutes
);

// ✅ MOBILE FEED (FINAL FIX)
app.use(
  "/mobile/feed",
  authMiddleware("user"),
  companyContext,
  licenseResolver,
  mobileFeedRoutes
);

module.exports = app;
