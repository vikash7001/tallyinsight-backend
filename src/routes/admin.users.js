const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const companyContext = require('../middlewares/companyContext');
const licenseResolver = require('../middlewares/licenseResolver');
const userService = require('../services/user.service');

router.post(
  '/',
  auth,
  companyContext,
  licenseResolver,
  userService.createUser
);

module.exports = router;
