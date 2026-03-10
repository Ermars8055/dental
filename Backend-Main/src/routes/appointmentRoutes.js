import express from 'express';
import { body, query } from 'express-validator';
import {
  getAllAppointments,
  getTodaysAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  completeAppointment,
  markNoShow,
  rescheduleAppointment,
  getAvailableSlots,
  getOverdueFollowUps,
  deleteAppointment,
} from '../controllers/appointmentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/appointments
 * Get all appointments with filters
 */
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['scheduled', 'in-chair', 'completed', 'no-show', 'rescheduled', 'cancelled']),
    query('patient_id').optional().isUUID(),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
  ],
  handleValidationErrors,
  getAllAppointments
);

/**
 * GET /api/appointments/today
 * Get today's appointments (must be before :id routes to avoid conflicts)
 */
router.get('/today', authenticateToken, getTodaysAppointments);

/**
 * GET /api/appointments/available-slots
 * Get available time slots
 */
router.get(
  '/available-slots',
  authenticateToken,
  [query('date').notEmpty().isISO8601().withMessage('Valid date required')],
  handleValidationErrors,
  getAvailableSlots
);

/**
 * GET /api/appointments/overdue
 * Get overdue follow-ups
 */
router.get('/overdue', authenticateToken, getOverdueFollowUps);

/**
 * POST /api/appointments
 * Create new appointment
 */
router.post(
  '/',
  authenticateToken,
  [
    body('patient_id').isUUID().withMessage('Valid patient ID required'),
    body('treatment_id').optional().isUUID().withMessage('Valid treatment ID required'),
    body('scheduled_time').isISO8601().withMessage('Valid datetime required'),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  createAppointment
);

/**
 * GET /api/appointments/:id
 * Get appointment by ID
 */
router.get('/:id', authenticateToken, getAppointmentById);

/**
 * PUT /api/appointments/:id
 * Update appointment
 */
router.put(
  '/:id',
  authenticateToken,
  [
    body('scheduled_time').optional().isISO8601(),
    body('treatment_id').optional().isUUID(),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  updateAppointment
);

/**
 * POST /api/appointments/:id/complete
 * Mark appointment as completed
 */
router.post(
  '/:id/complete',
  authenticateToken,
  [body('notes').optional().trim()],
  handleValidationErrors,
  completeAppointment
);

/**
 * POST /api/appointments/:id/no-show
 * Mark appointment as no-show
 */
router.post(
  '/:id/no-show',
  authenticateToken,
  [body('reason').optional().trim()],
  handleValidationErrors,
  markNoShow
);

/**
 * POST /api/appointments/:id/reschedule
 * Reschedule appointment
 */
router.post(
  '/:id/reschedule',
  authenticateToken,
  [
    body('scheduled_time').isISO8601().withMessage('Valid datetime required'),
    body('reason').optional().trim(),
  ],
  handleValidationErrors,
  rescheduleAppointment
);

/**
 * DELETE /api/appointments/:id
 * Delete appointment
 */
router.delete('/:id', authenticateToken, deleteAppointment);

export default router;
