// middleware/adminHeaderAuth.js

export default function adminHeaderAuth(req, res, next) {
  console.log('ADMIN HEADERS:', req.headers);

  // Accept either header name
  const userId =
    req.header('x-user-id') ||
    req.header('x-admin-id');

  const companyId = req.header('x-company-id') || null;

  if (!userId) {
    return res.status(400).json({
      error: 'Missing admin identity header'
    });
  }

  req.user_id = userId;
  req.company_id = companyId;

  next();
}
