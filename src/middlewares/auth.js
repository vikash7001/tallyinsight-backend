const { verifyToken } = require('../utils/jwt');

module.exports = (requiredRole = null) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader)
      return res.status(401).json({ error: 'NO_TOKEN' });

    const token = authHeader.split(' ')[1];
    if (!token)
      return res.status(401).json({ error: 'NO_TOKEN' });

    try {
      const decoded = verifyToken(token);

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'ACCESS_DENIED' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
  };
};
