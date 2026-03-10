import express from 'express';
import { getAllTreatments } from '../controllers/treatmentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/treatments
 * Get all active treatments (used to populate treatment dropdowns)
 */
router.get('/', authenticateToken, getAllTreatments);

export default router;
