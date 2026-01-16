import express from 'express';
import { db } from '../db.js';

import adminHeaderAuth from '../middleware/adminHeaderAuth.js';
import resolveUserCompany from '../middleware/resolveUserCompany.js';

const router = express.Router();

/* =====================================================
   GET /subscriptions/status
   Get effective subscription status for company
===================================================== */
router.get(
  '/status',
  adminHeaderAuth,
  resolveUserCompany,
  async (req, res) => {
    try {
      const { company_id } = req;

      const result = await db.query(
        `
        SELECT
          status,
          trial_start,
          trial_end,
          expiry_date,
          grace_end
        FROM subscriptions
        WHERE company_id = $1
        `,
        [company_id]
      );

      if (result.rowCount === 0) {
        return res.json({ status: 'NO_SUBSCRIPTION' });
      }

      const sub = result.rows[0];
      const today = new Date();

      let effectiveStatus = 'EXPIRED';

      if (sub.expiry_date && new Date(sub.expiry_date) >= today) {
        effectiveStatus = 'ACTIVE';
      } else if (sub.trial_end && new Date(sub.trial_end) >= today) {
        effectiveStatus = 'TRIAL';
      } else if (sub.grace_end && new Date(sub.grace_end) >= today) {
        effectiveStatus = 'GRACE';
      }

      res.json({
        status: effectiveStatus,
        trial_start: sub.trial_start,
        trial_end: sub.trial_end,
        expiry_date: sub.expiry_date,
        grace_end: sub.grace_end
      });
    } catch (err) {
      console.error('GET /subscriptions/status failed', err);
      res.status(500).json({ error: 'FAILED_TO_FETCH_SUBSCRIPTION' });
    }
  }
);

/* =====================================================
   POST /subscriptions/renew
   Renew company subscription
===================================================== */
router.post(
  '/renew',
  adminHeaderAuth,
  resolveUserCompany,
  async (req, res) => {
    try {
      const { company_id } = req;
      const { months } = req.body;

      if (!months || Number(months) <= 0) {
        return res.status(400).json({ error: 'INVALID_DURATION' });
      }

      const result = await db.query(
        `
        SELECT expiry_date
        FROM subscriptions
        WHERE company_id = $1
        `,
        [company_id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'NO_SUBSCRIPTION' });
      }

      const today = new Date();
      const currentExpiry = result.rows[0].expiry_date;

      const baseDate =
        currentExpiry && new Date(currentExpiry) > today
          ? new Date(currentExpiry)
          : today;

      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + Number(months));

      await db.query(
        `
        UPDATE subscriptions
        SET
          expiry_date = $1,
          grace_end = NULL,
          status = 'ACTIVE'
        WHERE company_id = $2
        `,
        [newExpiry, company_id]
      );

      res.json({
        success: true,
        expiry_date: newExpiry
      });
    } catch (err) {
      console.error('POST /subscriptions/renew failed', err);
      res.status(500).json({ error: 'FAILED_TO_RENEW_SUBSCRIPTION' });
    }
  }
);

export default router;
