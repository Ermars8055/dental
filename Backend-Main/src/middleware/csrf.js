import crypto from 'crypto';

// Store CSRF tokens in memory (in production, use Redis or database)
const csrfTokens = new Map();

/**
 * Generate CSRF token for client
 */
export const generateCSRFToken = (req, res, next) => {
  // For GET requests, provide a CSRF token
  if (req.method === 'GET') {
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = req.headers['x-session-id'] || crypto.randomBytes(16).toString('hex');

    csrfTokens.set(token, {
      sessionId,
      createdAt: Date.now(),
    });

    res.locals.csrfToken = token;
    res.setHeader('X-CSRF-Token', token);
  }

  next();
};

/**
 * Verify CSRF token for state-changing requests.
 * Since all protected routes already require a valid JWT (Bearer token),
 * CSRF attacks are not possible — the attacker cannot read the JWT from
 * another origin. Therefore we skip CSRF checks for all JWT-authenticated
 * requests and only enforce it for cookie-based sessions (none here).
 */
export const verifyCSRFToken = (req, res, next) => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // If the request carries a JWT Bearer token, it cannot be a CSRF attack
  // (browsers cannot send custom Authorization headers cross-origin without CORS preflight)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // For cookie-based or unauthenticated POST requests, require CSRF token
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/resend-verification', '/api/auth/forgot-password', '/api/auth/reset-password'];
  const requestPath = req.path || req.originalUrl?.split('?')[0];
  if (publicPaths.some(p => requestPath.includes(p))) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  if (!token) {
    return res.status(403).json({ success: false, message: 'CSRF token missing', statusCode: 403 });
  }

  const tokenData = csrfTokens.get(token);
  if (!tokenData) {
    return res.status(403).json({ success: false, message: 'CSRF token invalid or expired', statusCode: 403 });
  }

  const tokenAge = Date.now() - tokenData.createdAt;
  if (tokenAge > 60 * 60 * 1000) {
    csrfTokens.delete(token);
    return res.status(403).json({ success: false, message: 'CSRF token expired', statusCode: 403 });
  }

  next();
};

/**
 * Clean up old tokens periodically
 */
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  for (const [token, data] of csrfTokens.entries()) {
    if (now - data.createdAt > oneHour) {
      csrfTokens.delete(token);
    }
  }
}, 30 * 60 * 1000); // Clean every 30 minutes

export default { generateCSRFToken, verifyCSRFToken };
