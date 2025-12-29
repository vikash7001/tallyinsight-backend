// middleware/adminHeaderAuth.js

export default function adminHeaderAuth(req, res, next) {
  console.log('ADMIN HEADERS:', req.headers);

  const companyId = req.header('x-company-id');
  const userId = req.header('x-user-id');

  console.log('PARSED:', companyId, userId);

  if (!companyId || !userId) {
    return res.status(400).json({
      error: 'Missing required headers'
    });
  }

  req.company_id = companyId;
  req.user_id = userId;

  next();
}
