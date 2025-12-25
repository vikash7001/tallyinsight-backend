const express = require('express');
const router = express.Router();
const adminService = require('../services/user.service');

router.post('/login', adminService.adminLogin);

module.exports = router;
