const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const companyContext = require('../middlewares/companyContext');
const licenseResolver = require('../middlewares/licenseResolver');

router.get(
  '/check',
  auth,
  companyContext,
  licenseResolver,
  (req, res) => {
    res.json({
      company_id: req.companyId,
      status: req.licenseStatus
    });
  }
);

module.exports = router;
