/**
 * Simple in-memory rate limiter for auth endpoints
 * Prevents brute force attacks
 */

const requestCounts = new Map();
const lockouts = new Map();

// Configuration
const MAX_ATTEMPTS = 5; // Max login attempts
const LOCKOUT_TIME = 2 * 60 * 1000; // 2 minutes lockout (development/testing)
const RESET_TIME = 60 * 60 * 1000; // Reset count after 1 hour

/**
 * Rate limiting middleware for authentication endpoints
 * Tracks attempts per IP address
 */
export const rateLimitAuth = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  // Check if IP is currently locked out
  if (lockouts.has(ip)) {
    const lockoutUntil = lockouts.get(ip);
    if (now < lockoutUntil) {
      const remainingTime = Math.ceil((lockoutUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many login attempts. Please try again in ${remainingTime} seconds`,
        statusCode: 429,
      });
    } else {
      // Lockout expired, remove it
      lockouts.delete(ip);
      requestCounts.delete(ip);
    }
  }

  // Track request count
  const countData = requestCounts.get(ip) || { count: 0, lastReset: now };

  // Reset count if time has passed
  if (now - countData.lastReset > RESET_TIME) {
    countData.count = 0;
    countData.lastReset = now;
  }

  // Increment count
  countData.count++;
  requestCounts.set(ip, countData);

  // Check if exceeds max attempts
  if (countData.count > MAX_ATTEMPTS) {
    const lockoutUntil = now + LOCKOUT_TIME;
    lockouts.set(ip, lockoutUntil);
    return res.status(429).json({
      success: false,
      message: `Too many login attempts. Account locked for 2 minutes`,
      statusCode: 429,
    });
  }

  next();
};

/**
 * Reset rate limit for an IP (called on successful login)
 */
export const resetRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  requestCounts.delete(ip);
  lockouts.delete(ip);
  next();
};

export default { rateLimitAuth, resetRateLimit };
