const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const companyContext = require('../middlewares/companyContext');
const licenseResolver = require('../middlewares/licenseResolver');
const feedService = require('../services/mobileFeed.service');

router.get(
  '/',
  auth,
  companyContext,
  licenseResolver,
  feedService.getFeed
);

module.exports = router;
