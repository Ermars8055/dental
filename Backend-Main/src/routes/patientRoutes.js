import express from 'express';
import { body, query } from 'express-validator';
import {
  getAllPatients,
  getPatientById,
  searchPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientHistory,
  getPatientAppointments,
} from '../controllers/patientController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/patients
 * Get all patients with pagination
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim(),
  ],
  handleValidationErrors,
  getAllPatients
);

/**
 * GET /api/patients/search?query=
 * Search patients by name or phone
 */
router.get(
  '/search',
  [
    query('query').notEmpty().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  handleValidationErrors,
  searchPatients
);

/**
 * POST /api/patients
 * Create new patient
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').optional().isEmail().normalizeEmail(),
    body('date_of_birth').optional().trim(),
    body('dob').optional().isISO8601().withMessage('Invalid date format'),
    body('gender').optional().isIn(['M', 'F', 'Other']),
    body('city').optional().trim(),
    body('address').optional().trim(),
    body('emergency_contact').optional().trim(),
    body('emergency_phone').optional().trim(),
    body('preferred_time_slot').optional().trim(),
    body('preferred_payment_method').optional().isIn(['cash', 'upi', 'card']),
    body('preferred_appointment_duration').optional().isInt({ min: 15, max: 240 }).toInt(),
  ],
  handleValidationErrors,
  createPatient
);

/**
 * GET /api/patients/:id
 * Get patient by ID
 */
router.get('/:id', getPatientById);

/**
 * PUT /api/patients/:id
 * Update patient
 */
router.put(
  '/:id',
  [
    body('phone').optional().trim().isMobilePhone().withMessage('Invalid phone number'),
    body('email').optional().isEmail().normalizeEmail(),
    body('dob').optional().isISO8601().withMessage('Invalid date format'),
    body('gender').optional().isIn(['M', 'F', 'Other']),
    body('city').optional().trim(),
    body('address').optional().trim(),
    body('emergency_contact').optional().trim(),
    body('emergency_phone').optional().isMobilePhone(),
    body('preferred_payment_method').optional().isIn(['cash', 'upi', 'card']),
    body('preferred_appointment_duration').optional().isInt({ min: 15, max: 240 }).toInt(),
  ],
  handleValidationErrors,
  updatePatient
);

/**
 * DELETE /api/patients/:id
 * Delete patient (soft delete)
 */
router.delete('/:id', deletePatient);

/**
 * GET /api/patients/:id/history
 * Get patient treatment history
 */
router.get('/:id/history', getPatientHistory);

/**
 * GET /api/patients/:id/appointments
 * Get patient appointments
 */
router.get(
  '/:id/appointments',
  [
    query('status').optional().isIn(['scheduled', 'in-chair', 'completed', 'no-show', 'rescheduled', 'cancelled']),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  handleValidationErrors,
  getPatientAppointments
);

export default router;
