import express from 'express';
import { db } from '../db.js';

import adminHeaderAuth from '../middleware/adminHeaderAuth.js';
import resolveUserCompany from '../middleware/resolveUserCompany.js';
import checkCompanySubscription from '../middleware/checkCompanySubscription.js';

const router = express.Router();

/* =====================================================
   GET /admin/users
   List users linked to a company
===================================================== */
router.get(
  '/users',
  adminHeaderAuth,
  resolveUserCompany,
  checkCompanySubscription,
  async (req, res) => {
    try {
      const { company_id } = req;

      const result = await db.query(
        `
        SELECT
          u.user_id,
          u.mobile,
          u.email,
          uc.role
        FROM user_companies uc
        JOIN app_users u ON u.user_id = uc.user_id
        WHERE uc.company_id = $1
        ORDER BY uc.role DESC, u.mobile
        `,
        [company_id]
      );

      res.json(result.rows);
    } catch (err) {
      console.error('GET /admin/users failed', err);
      res.status(500).json({ error: 'FAILED_TO_LOAD_USERS' });
    }
  }
);

/* =====================================================
   POST /admin/users
   Add user to company
===================================================== */
router.post(
  '/users',
  adminHeaderAuth,
  resolveUserCompany,
  checkCompanySubscription,
  async (req, res) => {
    try {
      const { company_id } = req;
      const { mobile, email, role } = req.body;

      // Validate mobile
      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ error: 'INVALID_MOBILE' });
      }

      // 🔒 Locked rule: one company = one admin
      if (role !== 'USER') {
        return res.status(400).json({ error: 'INVALID_ROLE' });
      }

      // Find existing user
      let userId;
      const existingUser = await db.query(
        `SELECT user_id FROM app_users WHERE mobile = $1`,
        [mobile]
      );

      if (existingUser.rowCount > 0) {
        userId = existingUser.rows[0].user_id;
      } else {
        const created = await db.query(
          `
          INSERT INTO app_users (mobile, email, active)
          VALUES ($1, $2, true)
          RETURNING user_id
          `,
          [mobile, email || null]
        );
        userId = created.rows[0].user_id;
      }

      // Check if already linked
      const linked = await db.query(
        `
        SELECT 1
        FROM user_companies
        WHERE user_id = $1 AND company_id = $2
        `,
        [userId, company_id]
      );

      if (linked.rowCount > 0) {
        return res.status(409).json({ error: 'USER_ALREADY_LINKED' });
      }

      // Link user to company
      await db.query(
        `
        INSERT INTO user_companies (user_id, company_id, role)
        VALUES ($1, $2, 'USER')
        `,
        [userId, company_id]
      );

      res.status(201).json({ success: true });
    } catch (err) {
      console.error('POST /admin/users failed', err);
      res.status(500).json({ error: 'FAILED_TO_ADD_USER' });
    }
  }
);

export default router;
