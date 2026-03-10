import express from 'express';
import { body, query } from 'express-validator';
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getDailySummary,
  getMonthlySummary,
} from '../controllers/expenseController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/expenses
 * Get all expenses with filters
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('category').optional(),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
  ],
  handleValidationErrors,
  getAllExpenses
);

/**
 * GET /api/expenses/summary/daily
 * Get daily expense summary (must be before :id routes)
 */
router.get(
  '/summary/daily',
  [query('date').optional().isISO8601()],
  handleValidationErrors,
  getDailySummary
);

/**
 * GET /api/expenses/summary/monthly
 * Get monthly expense summary (must be before :id routes)
 */
router.get(
  '/summary/monthly',
  [query('month').optional()],
  handleValidationErrors,
  getMonthlySummary
);

/**
 * POST /api/expenses
 * Create new expense
 */
router.post(
  '/',
  [
    body('category')
      .isIn(['revenue', 'medical_supplies', 'utilities', 'rent', 'staff_salary', 'maintenance', 'equipment', 'marketing', 'other'])
      .withMessage('Invalid category'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    body('description').optional().trim(),
    body('notes').optional().trim(),
    body('date').optional().isISO8601(),
    body('receipt_url').optional().isURL(),
  ],
  handleValidationErrors,
  createExpense
);

/**
 * GET /api/expenses/:id
 * Get expense by ID
 */
router.get('/:id', getExpenseById);

/**
 * PUT /api/expenses/:id
 * Update expense
 */
router.put(
  '/:id',
  [
    body('category')
      .optional()
      .isIn(['revenue', 'medical_supplies', 'utilities', 'rent', 'staff_salary', 'maintenance', 'equipment', 'marketing', 'other']),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('description').optional().trim(),
    body('notes').optional().trim(),
    body('date').optional().isISO8601(),
    body('receipt_url').optional().isURL(),
  ],
  handleValidationErrors,
  updateExpense
);

/**
 * DELETE /api/expenses/:id
 * Delete expense
 */
router.delete('/:id', deleteExpense);

export default router;
