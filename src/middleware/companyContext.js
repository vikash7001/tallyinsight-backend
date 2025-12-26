module.exports = (req, res, next) => {
  if (!req.user || !req.user.companyId) {
    return res.status(400).json({ error: 'NO_COMPANY_CONTEXT' });
  }

  req.companyId = req.user.companyId;
  next();
};
