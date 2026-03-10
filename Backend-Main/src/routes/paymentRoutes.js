import express from 'express';
import { body, query } from 'express-validator';
import {
  getAllPayments,
  getPaymentById,
  recordPayment,
  updatePayment,
  getPendingPayments,
  getDailySummary,
  getMonthlySummary,
  getPatientPaymentHistory,
} from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/payments
 * Get all payments with filters
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'partial', 'paid', 'refunded']),
    query('patient_id').optional().isUUID(),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
  ],
  handleValidationErrors,
  getAllPayments
);

/**
 * GET /api/payments/pending
 * Get pending/overdue payments (must be before :id routes)
 */
router.get('/pending', getPendingPayments);

/**
 * GET /api/payments/summary/daily
 * Get daily payment summary (must be before :id routes)
 */
router.get(
  '/summary/daily',
  [query('date').optional().isISO8601()],
  handleValidationErrors,
  getDailySummary
);

/**
 * GET /api/payments/summary/monthly
 * Get monthly payment summary (must be before :id routes)
 */
router.get(
  '/summary/monthly',
  [query('month').optional()],
  handleValidationErrors,
  getMonthlySummary
);

/**
 * GET /api/payments/patient/:patient_id
 * Get patient payment history (must be before :id route)
 */
router.get('/patient/:patient_id', getPatientPaymentHistory);

/**
 * POST /api/payments
 * Record new payment
 */
router.post(
  '/',
  [
    body('appointment_id').isUUID().withMessage('Valid appointment ID required'),
    body('patient_id').isUUID().withMessage('Valid patient ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    body('status')
      .optional()
      .isIn(['pending', 'partial', 'paid', 'refunded'])
      .withMessage('Invalid status'),
    body('payment_method').optional().isIn(['cash', 'upi', 'card']),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  recordPayment
);

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
router.get('/:id', getPaymentById);

/**
 * PUT /api/payments/:id
 * Update payment
 */
router.put(
  '/:id',
  [
    body('status').optional().isIn(['pending', 'partial', 'paid', 'refunded']),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('payment_method').optional().isIn(['cash', 'upi', 'card']),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  updatePayment
);

export default router;
