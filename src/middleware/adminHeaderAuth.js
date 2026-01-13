// middleware/adminHeaderAuth.js

/**
 * Admin header authentication
 *
 * Rules:
 * - x-user-id is ALWAYS required (admin identity)
 * - x-company-id is OPTIONAL (not selected yet in early flows)
 *
 * This middleware is used for ALL /admin routes,
 * including company listing before company selection.
 */
export default function adminHeaderAuth(req, res, next) {
  console.log('ADMIN HEADERS:', req.headers);

  const userId = req.header('x-user-id');
  const companyId = req.header('x-company-id');

  // Admin identity is mandatory
  if (!userId) {
    return res.status(400).json({
      error: 'Missing x-user-id header'
    });
  }

  // Attach to request for downstream routes
  req.user_id = userId;
  req.company_id = companyId || null;

  next();
}
