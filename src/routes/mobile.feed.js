const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const companyContext = require('../middleware/companyContext');
const licenseResolver = require('../middleware/licenseResolver');
const feedService = require('../services/mobileFeed.service');

router.get(
  '/',
  auth,
  companyContext,
  licenseResolver,
  feedService.getFeed
);

module.exports = router;
