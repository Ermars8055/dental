import { logger } from '../utils/logger.js';

// Notifications table does not exist — stubs return safe empty responses

export const sendAppointmentReminder = async (req, res) => {
  try {
    const { appointment_id } = req.body;
    logger.info('Appointment reminder stub called', { appointment_id });
    return res.json({ success: true, statusCode: 200, message: 'Reminder queued (stub)' });
  } catch (e) { logger.error('sendAppointmentReminder', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to send reminder' }); }
};

export const sendPaymentReminder = async (req, res) => {
  try {
    const { patient_id } = req.body;
    logger.info('Payment reminder stub called', { patient_id });
    return res.json({ success: true, statusCode: 200, message: 'Payment reminder queued (stub)' });
  } catch (e) { logger.error('sendPaymentReminder', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to send payment reminder' }); }
};

export const getPendingReminders = async (req, res) => {
  try {
    return res.json({ success: true, statusCode: 200, data: { reminders: [], count: 0 } });
  } catch (e) { logger.error('getPendingReminders', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get reminders' }); }
};

export default { sendAppointmentReminder, sendPaymentReminder, getPendingReminders };
