import https from 'https';
import { logger } from '../utils/logger.js';

const CLINIC_NAME = process.env.MAILJET_FROM_NAME || 'Dr. Ramya Dental Clinic';
const FROM_EMAIL  = process.env.MAILJET_FROM_EMAIL || process.env.GMAIL_USER;

// ─── Mailjet HTTPS API ────────────────────────────────────────────────────────
const sendViaMailjet = (to, toName, subject, html) => {
  return new Promise((resolve, reject) => {
    const key    = process.env.MAILJET_API_KEY;
    const secret = process.env.MAILJET_SECRET_KEY;
    if (!key || !secret) return reject(new Error('Mailjet credentials not set'));

    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const body = JSON.stringify({
      Messages: [{ From: { Email: FROM_EMAIL, Name: CLINIC_NAME }, To: [{ Email: to, Name: toName || to }], Subject: subject, HTMLPart: html }],
    });

    const req = https.request({
      hostname: 'api.mailjet.com', path: '/v3.1/send', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`, 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(d));
        else reject(new Error(`Mailjet ${res.statusCode}: ${d}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ─── Resend HTTPS API ─────────────────────────────────────────────────────────
const sendViaResend = (to, toName, subject, html) => {
  return new Promise((resolve, reject) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return reject(new Error('Resend API key not set'));

    const body = JSON.stringify({ from: `${CLINIC_NAME} <${FROM_EMAIL}>`, to: [to], subject, html });

    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(d));
        else reject(new Error(`Resend ${res.statusCode}: ${d}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ─── Gmail SMTP via nodemailer ────────────────────────────────────────────────
const sendViaGmail = async (to, toName, subject, html) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) throw new Error('Gmail credentials not set');

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });
  return transporter.sendMail({ from: `"${CLINIC_NAME}" <${gmailUser}>`, to, subject, html });
};

// ─── Send with automatic fallback ────────────────────────────────────────────
const sendEmail = async (to, toName, subject, html) => {
  // Try Mailjet first
  try {
    const r = await sendViaMailjet(to, toName, subject, html);
    logger.info('Email sent via Mailjet', { to, messageId: r?.Messages?.[0]?.To?.[0]?.MessageID });
    return { success: true, provider: 'mailjet' };
  } catch (mjErr) {
    logger.warn('Mailjet failed, trying Resend', { error: mjErr.message });
  }

  // Try Resend second
  try {
    const r = await sendViaResend(to, toName, subject, html);
    logger.info('Email sent via Resend', { to, id: r?.id });
    return { success: true, provider: 'resend' };
  } catch (rsErr) {
    logger.warn('Resend failed, trying Gmail SMTP', { error: rsErr.message });
  }

  // Try Gmail last
  try {
    await sendViaGmail(to, toName, subject, html);
    logger.info('Email sent via Gmail SMTP', { to });
    return { success: true, provider: 'gmail' };
  } catch (gmErr) {
    logger.error('All email providers failed', { to, error: gmErr.message });
    throw new Error(`All email providers failed. Last error: ${gmErr.message}`);
  }
};

// ─── Public functions ─────────────────────────────────────────────────────────
export const sendVerificationEmail = async (toEmail, toName, verificationToken) => {
  const baseUrl   = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:#0d9488;">${CLINIC_NAME}</h2>
      <p style="font-size:15px;color:#374151;">Hi ${toName},</p>
      <p style="font-size:15px;color:#374151;">Your clinic staff account has been created. Please verify your email address to activate it.</p>
      <a href="${verifyUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#0d9488;color:#fff;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
        Verify Email Address
      </a>
      <p style="font-size:13px;color:#6b7280;">This link expires in <strong>24 hours</strong>. If you did not request this, ignore this email.</p>
      <p style="font-size:11px;color:#9ca3af;">Or copy: ${verifyUrl}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;">${CLINIC_NAME} — Staff Portal</p>
    </div>`;

  try {
    return await sendEmail(toEmail, toName, `Verify your account — ${CLINIC_NAME}`, html);
  } catch (error) {
    logger.error('sendVerificationEmail failed', { to: toEmail, error: error.message });
    return { success: false, error: error.message };
  }
};

export const sendPasswordResetEmail = async (toEmail, toName, resetToken) => {
  const baseUrl   = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const resetUrl  = `${baseUrl}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:#0d9488;">${CLINIC_NAME}</h2>
      <p style="font-size:15px;color:#374151;">Hi ${toName},</p>
      <p style="font-size:15px;color:#374151;">We received a request to reset your password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#0d9488;color:#fff;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
        Reset Password
      </a>
      <p style="font-size:13px;color:#6b7280;">This link expires in <strong>1 hour</strong>. If you did not request this, ignore this email.</p>
      <p style="font-size:11px;color:#9ca3af;">Or copy: ${resetUrl}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;">${CLINIC_NAME} — Staff Portal</p>
    </div>`;

  try {
    return await sendEmail(toEmail, toName, `Reset your password — ${CLINIC_NAME}`, html);
  } catch (error) {
    logger.error('sendPasswordResetEmail failed', { to: toEmail, error: error.message });
    return { success: false, error: error.message };
  }
};

export const sendWelcomeEmail = async (toEmail, toName) => {
  const loginUrl = `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')}/login`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:#0d9488;">Welcome, ${toName}!</h2>
      <p style="font-size:15px;color:#374151;">Your email has been verified. You can now sign in.</p>
      <a href="${loginUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#0d9488;color:#fff;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
        Sign In
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;">${CLINIC_NAME} — Staff Portal</p>
    </div>`;

  try {
    await sendEmail(toEmail, toName, `Welcome to ${CLINIC_NAME}`, html);
  } catch (error) {
    logger.warn('sendWelcomeEmail failed', { to: toEmail, error: error.message });
  }
};
