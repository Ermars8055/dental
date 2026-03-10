import express from 'express';
import { query } from 'express-validator';
import {
  getDailyReport,
  getMonthlyReport,
  getPatientMetrics,
  getDashboardSummary,
} from '../controllers/reportsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/reports/daily
 * Get daily report
 */
router.get(
  '/daily',
  [query('date').optional().isISO8601()],
  handleValidationErrors,
  getDailyReport
);

/**
 * GET /api/reports/monthly
 * Get monthly report
 */
router.get(
  '/monthly',
  [query('month').optional()],
  handleValidationErrors,
  getMonthlyReport
);

/**
 * GET /api/reports/patient-metrics
 * Get patient metrics
 */
router.get('/patient-metrics', getPatientMetrics);

/**
 * GET /api/reports/dashboard
 * Get dashboard summary
 */
router.get('/dashboard', getDashboardSummary);

export default router;
