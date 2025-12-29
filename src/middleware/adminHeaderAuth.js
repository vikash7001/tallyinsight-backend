// middleware/adminHeaderAuth.js

export default function adminHeaderAuth(req, res, next) {
  const companyId = req.header('x-company-id');
  const userId = req.header('x-user-id');

  if (!companyId || !userId) {
    return res.status(400).json({
      error: 'Missing required headers'
    });
  }

  req.company_id = companyId;
  req.user_id = userId;

  next();
}
