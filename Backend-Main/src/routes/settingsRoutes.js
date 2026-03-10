import express from 'express';
import { body, query } from 'express-validator';
import {
  getSettings,
  updateSettings,
  getBreaks,
  addBreak,
  deleteBreak,
  getNotificationStatus,
} from '../controllers/settingsController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/settings
 * Get clinic settings
 */
router.get('/', getSettings);

/**
 * PUT /api/settings
 * Update clinic settings (admin only)
 */
router.put(
  '/',
  authorize(['admin']),
  [
    body('clinic_name').optional().trim(),
    body('clinic_phone').optional().trim(),
    body('clinic_email').optional().isEmail(),
    body('clinic_address').optional().trim(),
    body('working_hours_start').optional(),
    body('working_hours_end').optional(),
    body('lunch_start').optional(),
    body('lunch_end').optional(),
    body('default_appointment_duration').optional().isInt({ min: 15, max: 240 }),
    body('currency').optional().trim(),
  ],
  handleValidationErrors,
  updateSettings
);

/**
 * GET /api/breaks?date=
 * Get breaks for a specific date
 */
router.get(
  '/breaks',
  [query('date').notEmpty().isISO8601().withMessage('Valid date required')],
  handleValidationErrors,
  getBreaks
);

/**
 * POST /api/breaks
 * Add break slot
 */
router.post(
  '/breaks',
  authorize(['admin', 'doctor']),
  [
    body('date').isISO8601().withMessage('Valid date required'),
    body('break_type').isIn(['lunch', 'tea', 'custom']).withMessage('Invalid break type'),
    body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required'),
    body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time required'),
    body('reason').optional().trim(),
  ],
  handleValidationErrors,
  addBreak
);

/**
 * DELETE /api/breaks/:id
 * Cancel break
 */
router.delete('/breaks/:id', authorize(['admin', 'doctor']), deleteBreak);

/**
 * GET /api/settings/notifications/status
 * Check notification service configuration status
 */
router.get('/notifications/status', authorize(['admin']), getNotificationStatus);

export default router;
