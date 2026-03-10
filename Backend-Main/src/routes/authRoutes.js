import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { rateLimitAuth, resetRateLimit } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role')
      .optional()
      .isIn(['admin', 'doctor', 'receptionist'])
      .withMessage('Invalid role'),
    body('phone').optional().trim(),
  ],
  handleValidationErrors,
  register
);

/**
 * POST /api/auth/login
 * Login user and get JWT token
 */
router.post(
  '/login',
  rateLimitAuth,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  login
);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post(
  '/refresh',
  [body('token').notEmpty().withMessage('Token is required')],
  handleValidationErrors,
  refreshToken
);

/**
 * POST /api/auth/logout
 * Logout user (client-side, mainly for logging purposes)
 */
router.post('/logout', authenticateToken, logout);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  handleValidationErrors,
  changePassword
);

/**
 * GET /api/auth/verify-email
 * Verify email with token (public - no auth required)
 */
router.get('/verify-email', verifyEmail);

/**
 * POST /api/auth/resend-verification
 * Resend email verification link
 */
router.post(
  '/resend-verification',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  handleValidationErrors,
  resendVerification
);

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  handleValidationErrors,
  forgotPassword
);

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  handleValidationErrors,
  resetPassword
);

export default router;
