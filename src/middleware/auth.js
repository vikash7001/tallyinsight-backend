import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });

  const token = auth.replace('Bearer ', '');
  try {
    req.user = jwt.decode(token);
    if (!req.user?.sub) throw new Error();
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
