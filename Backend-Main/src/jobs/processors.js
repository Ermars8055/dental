import { logger } from '../utils/logger.js';
import { Appointment } from '../models/Appointment.js';
import { Payment } from '../models/Payment.js';
import { Inventory } from '../models/Inventory.js';
import { notificationService } from '../services/notificationService.js';

/**
 * Process appointment reminder job
 * Sends SMS/Email/WhatsApp reminder to patient
 */
export const processAppointmentReminder = async (job) => {
  try {
    const { appointmentId, type } = job.data;
    logger.info(`Processing appointment reminder (${type})`, { appointmentId });

    // Fetch appointment with related data
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      logger.warn('Appointment not found for reminder', { appointmentId });
      return { success: false, error: 'Appointment not found' };
    }

    // Don't send reminder if appointment is cancelled or completed
    if (['cancelled', 'completed', 'no-show'].includes(appointment.status)) {
      logger.info('Skipping reminder for non-pending appointment', {
        appointmentId,
        status: appointment.status,
      });
      return { success: true, skipped: true };
    }

    // Prepare reminder message
    const appointmentTime = new Date(appointment.scheduled_time).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const reminderType = type === '24h' ? '24-hour' : '1-hour';
    const message = `Reminder: You have a dental appointment ${reminderType} from now on ${appointmentTime}. Please confirm or reschedule if needed.`;

    // Send notification
    const results = {
      sms: null,
      email: null,
      whatsapp: null,
    };

    try {
      results.sms = await notificationService.sendSMS(
        appointment.patient_phone,
        message
      );
      logger.info('SMS reminder sent', { appointmentId });
    } catch (error) {
      logger.error('SMS reminder failed', { appointmentId, error: error.message });
    }

    try {
      results.email = await notificationService.sendEmail(
        appointment.patient_email,
        'Appointment Reminder',
        `<p>${message}</p>`
      );
      logger.info('Email reminder sent', { appointmentId });
    } catch (error) {
      logger.error('Email reminder failed', { appointmentId, error: error.message });
    }

    try {
      results.whatsapp = await notificationService.sendWhatsApp(
        appointment.patient_phone,
        message
      );
      logger.info('WhatsApp reminder sent', { appointmentId });
    } catch (error) {
      logger.error('WhatsApp reminder failed', { appointmentId, error: error.message });
    }

    return { success: true, results };
  } catch (error) {
    logger.error('processAppointmentReminder error', {
      error: error.message,
      appointmentId: job.data.appointmentId,
    });
    throw error;
  }
};

/**
 * Process payment reminder job
 * Sends payment reminder to patient for pending/partial payments
 */
export const processPaymentReminder = async (job) => {
  try {
    const { paymentId, type } = job.data;
    logger.info(`Processing payment reminder (${type})`, { paymentId });

    // Fetch payment details
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      logger.warn('Payment not found for reminder', { paymentId });
      return { success: false, error: 'Payment not found' };
    }

    // Only send reminder for pending/partial payments
    if (!['pending', 'partial'].includes(payment.status)) {
      logger.info('Skipping reminder for paid payment', { paymentId });
      return { success: true, skipped: true };
    }

    const dueDate = new Date(payment.due_date).toLocaleDateString('en-IN');
    const amount = payment.amount.toFixed(2);
    const message = `Payment reminder: Amount ₹${amount} due on ${dueDate}. Please settle at your earliest convenience.`;

    const results = {
      sms: null,
      email: null,
      whatsapp: null,
    };

    try {
      results.sms = await notificationService.sendSMS(payment.patient_phone, message);
      logger.info('Payment SMS sent', { paymentId });
    } catch (error) {
      logger.error('Payment SMS failed', { paymentId, error: error.message });
    }

    try {
      results.email = await notificationService.sendEmail(
        payment.patient_email,
        'Payment Due Reminder',
        `<p>${message}</p>`
      );
      logger.info('Payment email sent', { paymentId });
    } catch (error) {
      logger.error('Payment email failed', { paymentId, error: error.message });
    }

    try {
      results.whatsapp = await notificationService.sendWhatsApp(payment.patient_phone, message);
      logger.info('Payment WhatsApp sent', { paymentId });
    } catch (error) {
      logger.error('Payment WhatsApp failed', { paymentId, error: error.message });
    }

    return { success: true, results };
  } catch (error) {
    logger.error('processPaymentReminder error', {
      error: error.message,
      paymentId: job.data.paymentId,
    });
    throw error;
  }
};

/**
 * Process low stock alert job
 * Checks inventory and alerts staff of low stock items
 */
export const processLowStockAlert = async (job) => {
  try {
    logger.info('Processing low stock alert');

    // Get low stock items
    const lowStockItems = await Inventory.getLowStock();

    if (lowStockItems.length === 0) {
      logger.info('No low stock items found');
      return { success: true, itemsFound: 0 };
    }

    // Format alert message
    const itemsList = lowStockItems
      .map(
        (item) =>
          `${item.name}: ${item.quantity} units (Min: ${item.reorder_level})`
      )
      .join('\n');

    const alertMessage = `Low Stock Alert:\n${itemsList}\n\nPlease reorder soon.`;

    logger.info('Low stock alert generated', {
      itemsCount: lowStockItems.length,
      items: lowStockItems.map((i) => i.name),
    });

    // In a real system, you would send this to clinic admin/manager
    // For now, just log it
    return {
      success: true,
      itemsFound: lowStockItems.length,
      items: lowStockItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        reorderLevel: item.reorder_level,
      })),
    };
  } catch (error) {
    logger.error('processLowStockAlert error', { error: error.message });
    throw error;
  }
};

/**
 * Process scheduled report job
 * Generates and sends daily/weekly/monthly reports
 */
export const processScheduledReport = async (job) => {
  try {
    const { type } = job.data;
    logger.info(`Processing scheduled report (${type})`);

    // This would generate reports based on type
    // For now, just log that it ran
    const reportData = {
      type,
      generatedAt: new Date().toISOString(),
      status: 'generated',
    };

    logger.info(`${type} report generated`, reportData);

    // In a real system, you would:
    // 1. Generate PDF/Excel report
    // 2. Email to clinic owner/manager
    // 3. Store in database or cloud storage

    return { success: true, ...reportData };
  } catch (error) {
    logger.error('processScheduledReport error', {
      error: error.message,
      type: job.data.type,
    });
    throw error;
  }
};

export default {
  processAppointmentReminder,
  processPaymentReminder,
  processLowStockAlert,
  processScheduledReport,
};
