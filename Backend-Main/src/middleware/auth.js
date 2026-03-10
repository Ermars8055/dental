import { verifyToken } from '../utils/jwt.js';
import { query } from '../config/db.js';

/**
 * Authentication middleware - verify JWT token and check user is active
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        statusCode: 401,
      });
    }

    const decoded = verifyToken(token);

    // Verify user is still active in database
    const { rows } = await query('SELECT id, is_active FROM users WHERE id = $1', [decoded.userId]);
    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive or no longer exists',
        statusCode: 403,
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
      statusCode: 403,
      error: error.message,
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
export const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        statusCode: 403,
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware - attach user if token exists
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Token is invalid but request continues
    // This is optional auth, so we don't fail
  }

  next();
};

export default {
  authenticateToken,
  authorize,
  optionalAuth,
};
