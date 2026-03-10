import express from 'express';
import { body } from 'express-validator';
import {
  sendAppointmentReminder,
  sendPaymentReminder,
  getPendingReminders,
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/notifications/send-reminder
 * Send appointment reminder
 */
router.post(
  '/send-reminder',
  [
    body('appointment_id').isUUID().withMessage('Valid appointment ID required'),
    body('reminder_type')
      .optional()
      .isIn(['sms', 'email', 'whatsapp'])
      .withMessage('Invalid reminder type'),
  ],
  handleValidationErrors,
  sendAppointmentReminder
);

/**
 * POST /api/notifications/send-payment-alert
 * Send payment reminder
 */
router.post(
  '/send-payment-alert',
  [body('payment_id').isUUID().withMessage('Valid payment ID required')],
  handleValidationErrors,
  sendPaymentReminder
);

/**
 * GET /api/notifications/pending
 * Get pending reminders
 */
router.get('/pending', getPendingReminders);

export default router;
