module.exports = (req, res, next) => {
  if (!req.user || !req.user.company_id) {
    return res.status(400).json({ error: 'NO_COMPANY_CONTEXT' });
  }

  req.companyId = req.user.company_id;
  next();
};
