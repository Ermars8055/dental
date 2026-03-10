import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

/**
 * Initialize Twilio client
 * Safely handles missing credentials
 */
const getTwilioClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logger.warn('Twilio credentials not configured');
    return null;
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

/**
 * Initialize Email transporter
 * Safely handles missing credentials
 */
const getEmailTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    logger.warn('SMTP credentials not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

const twilioClient = getTwilioClient();
const emailTransporter = getEmailTransporter();

/**
 * Send SMS message
 * @param {string} phoneNumber - Patient phone number (with country code, e.g., +919876543210)
 * @param {string} message - SMS message content
 * @returns {Promise<object>} Result with success flag and message ID
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    if (!twilioClient) {
      logger.warn('Twilio not configured, SMS skipped (simulated)', { phone: phoneNumber });
      return {
        success: true,
        simulated: true,
        message: 'SMS service not configured',
      };
    }

    if (!phoneNumber || !message) {
      throw new Error('Phone number and message are required');
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    logger.info('SMS sent successfully', {
      messageId: result.sid,
      phone: phoneNumber,
      status: result.status,
    });

    return {
      success: true,
      messageId: result.sid,
      status: result.status,
    };
  } catch (error) {
    logger.error('SMS sending failed', {
      error: error.message,
      phone: phoneNumber,
    });
    throw error;
  }
};

/**
 * Send Email
 * @param {string} recipientEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @returns {Promise<object>} Result with success flag and message ID
 */
export const sendEmail = async (recipientEmail, subject, htmlContent) => {
  try {
    if (!emailTransporter) {
      logger.warn('Email service not configured, email skipped (simulated)', { email: recipientEmail });
      return {
        success: true,
        simulated: true,
        message: 'Email service not configured',
      };
    }

    if (!recipientEmail || !subject || !htmlContent) {
      throw new Error('Email, subject, and content are required');
    }

    const result = await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@dentalclinic.com',
      to: recipientEmail,
      subject,
      html: htmlContent,
    });

    logger.info('Email sent successfully', {
      messageId: result.messageId,
      email: recipientEmail,
      subject,
    });

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    };
  } catch (error) {
    logger.error('Email sending failed', {
      error: error.message,
      email: recipientEmail,
    });
    throw error;
  }
};

/**
 * Send WhatsApp message
 * @param {string} phoneNumber - Patient phone number (with country code)
 * @param {string} message - WhatsApp message content
 * @returns {Promise<object>} Result with success flag and message ID
 */
export const sendWhatsApp = async (phoneNumber, message) => {
  try {
    if (!twilioClient) {
      logger.warn('Twilio not configured, WhatsApp skipped (simulated)', { phone: phoneNumber });
      return {
        success: true,
        simulated: true,
        message: 'WhatsApp service not configured',
      };
    }

    if (!phoneNumber || !message) {
      throw new Error('Phone number and message are required');
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${phoneNumber}`,
    });

    logger.info('WhatsApp message sent successfully', {
      messageId: result.sid,
      phone: phoneNumber,
      status: result.status,
    });

    return {
      success: true,
      messageId: result.sid,
      status: result.status,
    };
  } catch (error) {
    logger.error('WhatsApp sending failed', {
      error: error.message,
      phone: phoneNumber,
    });
    throw error;
  }
};

/**
 * Legacy: Send SMS reminder with appointment details
 * @param {string} phoneNumber - Patient phone number
 * @param {object} appointment - Appointment details
 * @returns {Promise<object>} Result with success flag
 */
export const sendSmsReminder = async (phoneNumber, appointment) => {
  const message = appointment.message ||
    `Reminder: You have a dental appointment on ${new Date(appointment.scheduled_time).toLocaleDateString()} at ${new Date(appointment.scheduled_time).toLocaleTimeString()}. Please call if you need to reschedule.`;

  return sendSMS(phoneNumber, message);
};

/**
 * Legacy: Send Email reminder with appointment details
 * @param {string} email - Patient email
 * @param {object} appointment - Appointment details
 * @returns {Promise<object>} Result with success flag
 */
export const sendEmailReminder = async (email, appointment) => {
  const appointmentDate = new Date(appointment.scheduled_time);
  const emailBody = `
    <h2>Appointment Reminder</h2>
    <p>Dear ${appointment.patient_name || 'Patient'},</p>
    <p>This is a reminder about your upcoming dental appointment.</p>
    <p><strong>Date & Time:</strong> ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString()}</p>
    <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
    <p>Best regards,<br/>Dr. Sharma Dental Clinic</p>
  `;

  return sendEmail(email, 'Appointment Reminder - Dr. Sharma Dental Clinic', emailBody);
};

/**
 * Legacy: Send WhatsApp reminder with appointment details
 * @param {string} phoneNumber - Patient phone number
 * @param {object} appointment - Appointment details
 * @returns {Promise<object>} Result with success flag
 */
export const sendWhatsAppReminder = async (phoneNumber, appointment) => {
  const message = appointment.message ||
    `Reminder: You have a dental appointment on ${new Date(appointment.scheduled_time).toLocaleDateString()} at ${new Date(appointment.scheduled_time).toLocaleTimeString()}. Reply or call if you need to reschedule.`;

  return sendWhatsApp(phoneNumber, message);
};

/**
 * Send bulk reminders (for scheduled jobs)
 * @param {array} appointments - Array of appointments
 * @param {string} reminderType - Type of reminder: 'sms', 'email', or 'whatsapp'
 * @returns {Promise<object>} Result summary
 */
export const sendBulkReminders = async (appointments, reminderType = 'sms') => {
  try {
    const results = {
      total: appointments.length,
      successful: 0,
      failed: 0,
      simulated: 0,
      errors: [],
    };

    for (const appointment of appointments) {
      try {
        let result;
        const patient = appointment.patients;

        switch (reminderType) {
          case 'sms':
            result = await sendSmsReminder(patient.phone, appointment);
            break;
          case 'email':
            result = await sendEmailReminder(patient.email, appointment);
            break;
          case 'whatsapp':
            result = await sendWhatsAppReminder(patient.phone, appointment);
            break;
          default:
            throw new Error('Unknown reminder type');
        }

        if (result.simulated) {
          results.simulated++;
        } else if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            appointmentId: appointment.id,
            error: result.error,
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          appointmentId: appointment.id,
          error: error.message,
        });
      }
    }

    logger.info('Bulk reminders sent', results);
    return results;
  } catch (error) {
    logger.error('Bulk reminder sending failed', { error: error.message });
    throw error;
  }
};

/**
 * Verify notification service configuration
 * @returns {object} Status of each notification channel
 */
export const getServiceStatus = () => {
  return {
    sms: {
      configured: !!twilioClient,
      provider: 'Twilio',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not configured',
    },
    email: {
      configured: !!emailTransporter,
      provider: 'SMTP',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      user: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}***` : 'Not configured',
    },
    whatsapp: {
      configured: !!twilioClient,
      provider: 'Twilio WhatsApp',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not configured',
    },
  };
};

export const notificationService = {
  sendSMS,
  sendEmail,
  sendWhatsApp,
  sendSmsReminder,
  sendEmailReminder,
  sendWhatsAppReminder,
  sendBulkReminders,
  getServiceStatus,
};

export default notificationService;
