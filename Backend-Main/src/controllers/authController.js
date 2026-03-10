import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { validateEmail } from '../utils/sanitize.js';
import { sanitizeInput } from '../utils/xss.js';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';

export const register = async (req, res) => {
  try {
    const { email, password, name, role = 'receptionist', phone } = req.body;
    if (!email || !password || !name) return res.status(400).json({ success: false, message: 'Email, password, and name are required', statusCode: 400 });
    if (!validateEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email format', statusCode: 400 });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters', statusCode: 400 });
    const sanitizedName = sanitizeInput(name, { maxLength: 100 });
    const sanitizedPhone = phone ? sanitizeInput(phone, { maxLength: 20 }) : null;
    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'User with this email already exists', statusCode: 409 });
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { rows } = await query(
      `INSERT INTO users (id,email,password_hash,name,role,phone,is_active,email_verified,verification_token,verification_token_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,true,false,$7,$8)
       RETURNING id,email,name,role,phone`,
      [userId, email, hashedPassword, sanitizedName, role, sanitizedPhone, verificationToken, verificationExpiry]
    );
    sendVerificationEmail(email, sanitizedName, verificationToken).then(r => {
      logger.info('Verification email result', { to: email, result: JSON.stringify(r) });
    }).catch(err => {
      logger.error('Verification email failed', { to: email, error: err.message });
    });
    logger.info('User registered', { userId, email });
    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your address before signing in.',
      statusCode: 201,
      data: { user: rows[0] },
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Registration failed', statusCode: 500, error: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required', statusCode: 400 });
    const { rows } = await query(
      'SELECT id,name,email,verification_token_expires_at,email_verified FROM users WHERE verification_token = $1',
      [token]
    );
    if (rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid verification token', statusCode: 400 });
    const user = rows[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (user.email_verified) return res.redirect(`${frontendUrl}/login?verified=already`);
    if (new Date() > new Date(user.verification_token_expires_at)) {
      return res.status(400).json({ success: false, message: 'Verification link has expired. Contact your admin.', statusCode: 400 });
    }
    await query('UPDATE users SET email_verified=true,verification_token=NULL,verification_token_expires_at=NULL,updated_at=NOW() WHERE id=$1', [user.id]);
    sendWelcomeEmail(user.email, user.name).catch(() => {});
    logger.info('Email verified', { userId: user.id });
    return res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (error) {
    logger.error('Email verification error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Verification failed', statusCode: 500 });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required', statusCode: 400 });
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password', statusCode: 401 });
    const user = rows[0];
    if (!user.is_active) return res.status(401).json({ success: false, message: 'User account is inactive', statusCode: 401 });
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        statusCode: 403,
        data: { requiresVerification: true },
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password', statusCode: 401 });
    const token = generateToken(user.id, user.email, user.role);
    logger.info('User logged in', { userId: user.id });
    return res.status(200).json({
      success: true, message: 'Login successful', statusCode: 200,
      data: { user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, is_active: user.is_active, created_at: user.created_at }, token },
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Login failed', statusCode: 500, error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required', statusCode: 400 });
    const decoded = verifyToken(token);
    const { rows } = await query('SELECT id,email,role FROM users WHERE id=$1', [decoded.userId]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'User not found', statusCode: 401 });
    const newToken = generateToken(rows[0].id, rows[0].email, rows[0].role);
    return res.status(200).json({ success: true, message: 'Token refreshed', statusCode: 200, data: { token: newToken } });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', statusCode: 401 });
  }
};

export const logout = async (req, res) => {
  logger.info('User logged out', { userId: req.user?.userId });
  return res.status(200).json({ success: true, message: 'Logout successful', statusCode: 200 });
};

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', statusCode: 401 });
    const { rows } = await query('SELECT id,email,name,role,phone,is_active,created_at FROM users WHERE id=$1', [userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
    return res.status(200).json({ success: true, message: 'User profile retrieved', statusCode: 200, data: { user: rows[0] } });
  } catch (error) {
    logger.error('Get current user error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get user profile', statusCode: 500 });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', statusCode: 401 });
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required', statusCode: 400 });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters', statusCode: 400 });
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) return res.status(401).json({ success: false, message: 'Current password is incorrect', statusCode: 401 });
    const hashed = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [hashed, userId]);
    logger.info('Password changed', { userId });
    return res.status(200).json({ success: true, message: 'Password changed successfully', statusCode: 200 });
  } catch (error) {
    logger.error('Change password error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to change password', statusCode: 500 });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required', statusCode: 400 });
    const { rows } = await query('SELECT id,name,email,email_verified FROM users WHERE email=$1', [email]);
    // Always return success to avoid leaking whether an email exists
    if (rows.length === 0) return res.status(200).json({ success: true, message: 'If that email exists and is unverified, a new link has been sent.', statusCode: 200 });
    const user = rows[0];
    if (user.email_verified) return res.status(200).json({ success: true, message: 'If that email exists and is unverified, a new link has been sent.', statusCode: 200 });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query('UPDATE users SET verification_token=$1,verification_token_expires_at=$2,updated_at=NOW() WHERE id=$3', [verificationToken, verificationExpiry, user.id]);
    sendVerificationEmail(user.email, user.name, verificationToken).then(r => {
      logger.info('Resend verification email result', { to: user.email, result: JSON.stringify(r) });
    }).catch(err => {
      logger.error('Resend verification email failed', { to: user.email, error: err.message });
    });
    logger.info('Verification email resent', { userId: user.id });
    return res.status(200).json({ success: true, message: 'Verification email resent. Please check your inbox.', statusCode: 200 });
  } catch (error) {
    logger.error('Resend verification error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to resend verification email', statusCode: 500 });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required', statusCode: 400 });

    const { rows } = await query('SELECT id, name, email FROM users WHERE email = $1 AND is_active = true', [email]);

    // Always return success to avoid leaking whether an email exists
    if (rows.length === 0) {
      return res.status(200).json({ success: true, message: 'If that email is registered, you will receive a reset link shortly.', statusCode: 200 });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'UPDATE users SET reset_token=$1, reset_token_expires_at=$2, updated_at=NOW() WHERE id=$3',
      [resetToken, resetExpiry, user.id]
    );

    sendPasswordResetEmail(user.email, user.name, resetToken).then(r => {
      logger.info('Password reset email sent', { to: user.email, result: JSON.stringify(r) });
    }).catch(err => {
      logger.error('Password reset email failed', { to: user.email, error: err.message });
    });

    logger.info('Password reset requested', { userId: user.id });
    return res.status(200).json({ success: true, message: 'If that email is registered, you will receive a reset link shortly.', statusCode: 200 });
  } catch (error) {
    logger.error('Forgot password error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to process request', statusCode: 500 });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and new password are required', statusCode: 400 });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters', statusCode: 400 });

    const { rows } = await query(
      'SELECT id, name, email, reset_token_expires_at FROM users WHERE reset_token = $1',
      [token]
    );

    if (rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid or expired reset link', statusCode: 400 });

    const user = rows[0];
    if (new Date() > new Date(user.reset_token_expires_at)) {
      return res.status(400).json({ success: false, message: 'Reset link has expired. Please request a new one.', statusCode: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await query(
      'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires_at=NULL, updated_at=NOW() WHERE id=$2',
      [hashed, user.id]
    );

    logger.info('Password reset successfully', { userId: user.id });
    return res.status(200).json({ success: true, message: 'Password reset successfully. You can now sign in.', statusCode: 200 });
  } catch (error) {
    logger.error('Reset password error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to reset password', statusCode: 500 });
  }
};

export default { register, verifyEmail, resendVerification, login, logout, refreshToken, getCurrentUser, changePassword, forgotPassword, resetPassword };
