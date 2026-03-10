import Queue from 'bull';
import { logger } from '../utils/logger.js';
import {
  processAppointmentReminder,
  processPaymentReminder,
  processLowStockAlert,
  processScheduledReport,
} from './processors.js';

// Redis queue (Bull manages the queue, you can use Redis or in-memory)
// For production, use actual Redis
const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
};

// Create job queues
export const appointmentReminderQueue = new Queue('appointment-reminders', getRedisConfig());
export const paymentReminderQueue = new Queue('payment-reminders', getRedisConfig());
export const lowStockAlertQueue = new Queue('low-stock-alerts', getRedisConfig());
export const reportQueue = new Queue('scheduled-reports', getRedisConfig());

// Queue error handlers
const setupQueueErrorHandlers = (queue, queueName) => {
  queue.on('error', (error) => {
    logger.error(`${queueName} queue error`, { error: error.message });
  });

  queue.on('failed', (job, error) => {
    logger.error(`${queueName} job failed`, {
      jobId: job.id,
      jobName: job.name,
      error: error.message,
      data: job.data,
    });
  });

  queue.on('completed', (job) => {
    logger.info(`${queueName} job completed`, {
      jobId: job.id,
      jobName: job.name,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`${queueName} job stalled`, {
      jobId: job.id,
      jobName: job.name,
    });
  });
};

// Setup all queue error handlers
setupQueueErrorHandlers(appointmentReminderQueue, 'Appointment Reminder');
setupQueueErrorHandlers(paymentReminderQueue, 'Payment Reminder');
setupQueueErrorHandlers(lowStockAlertQueue, 'Low Stock Alert');
setupQueueErrorHandlers(reportQueue, 'Scheduled Report');

// Process jobs
appointmentReminderQueue.process(processAppointmentReminder);
paymentReminderQueue.process(processPaymentReminder);
lowStockAlertQueue.process(processLowStockAlert);
reportQueue.process(processScheduledReport);

/**
 * Schedule appointment reminders
 * Sends reminder 24 hours and 1 hour before appointment
 */
export const scheduleAppointmentReminders = async (appointmentId, scheduledTime) => {
  try {
    const appointmentDate = new Date(scheduledTime);
    const now = new Date();

    // Schedule 24-hour reminder
    const oneDay = 24 * 60 * 60 * 1000;
    const dayBeforeTime = appointmentDate.getTime() - oneDay;

    if (dayBeforeTime > now.getTime()) {
      const delay = dayBeforeTime - now.getTime();
      await appointmentReminderQueue.add(
        { appointmentId, type: '24h' },
        { delay, jobId: `appointment-${appointmentId}-24h`, removeOnComplete: true }
      );
      logger.info('24-hour reminder scheduled', { appointmentId });
    }

    // Schedule 1-hour reminder
    const oneHour = 60 * 60 * 1000;
    const hourBeforeTime = appointmentDate.getTime() - oneHour;

    if (hourBeforeTime > now.getTime()) {
      const delay = hourBeforeTime - now.getTime();
      await appointmentReminderQueue.add(
        { appointmentId, type: '1h' },
        { delay, jobId: `appointment-${appointmentId}-1h`, removeOnComplete: true }
      );
      logger.info('1-hour reminder scheduled', { appointmentId });
    }
  } catch (error) {
    logger.error('scheduleAppointmentReminders error', { error: error.message, appointmentId });
    throw error;
  }
};

/**
 * Schedule payment reminders for overdue payments
 * Sends reminders on specific intervals
 */
export const schedulePaymentReminder = async (paymentId, dueDate) => {
  try {
    const due = new Date(dueDate);
    const now = new Date();

    // Send reminder on due date
    if (due > now) {
      const delay = due.getTime() - now.getTime();
      await paymentReminderQueue.add(
        { paymentId, type: 'due-date' },
        { delay, jobId: `payment-${paymentId}-due`, removeOnComplete: true }
      );
      logger.info('Payment due reminder scheduled', { paymentId });
    }

    // Send reminder 3 days before due date
    const threeDaysBefore = due.getTime() - 3 * 24 * 60 * 60 * 1000;
    if (threeDaysBefore > now.getTime()) {
      const delay = threeDaysBefore - now.getTime();
      await paymentReminderQueue.add(
        { paymentId, type: '3days' },
        { delay, jobId: `payment-${paymentId}-3days`, removeOnComplete: true }
      );
      logger.info('Payment 3-day reminder scheduled', { paymentId });
    }
  } catch (error) {
    logger.error('schedulePaymentReminder error', { error: error.message, paymentId });
    throw error;
  }
};

/**
 * Schedule low stock alerts
 * Runs daily to check inventory
 */
export const scheduleDailyStockCheck = async () => {
  try {
    // Run every day at 8 AM
    await lowStockAlertQueue.add(
      { type: 'daily-check' },
      {
        repeat: {
          cron: '0 8 * * *', // 8 AM every day
        },
        jobId: 'daily-stock-check',
      }
    );
    logger.info('Daily stock check scheduled');
  } catch (error) {
    logger.error('scheduleDailyStockCheck error', { error: error.message });
    throw error;
  }
};

/**
 * Schedule weekly reports
 * Generates reports on Sunday at 6 PM
 */
export const scheduleWeeklyReport = async () => {
  try {
    await reportQueue.add(
      { type: 'weekly-summary' },
      {
        repeat: {
          cron: '0 18 * * 0', // 6 PM every Sunday
        },
        jobId: 'weekly-report',
      }
    );
    logger.info('Weekly report scheduled');
  } catch (error) {
    logger.error('scheduleWeeklyReport error', { error: error.message });
    throw error;
  }
};

/**
 * Schedule monthly reports
 * Generates reports on 1st of month at 7 PM
 */
export const scheduleMonthlyReport = async () => {
  try {
    await reportQueue.add(
      { type: 'monthly-summary' },
      {
        repeat: {
          cron: '0 19 1 * *', // 7 PM on 1st of month
        },
        jobId: 'monthly-report',
      }
    );
    logger.info('Monthly report scheduled');
  } catch (error) {
    logger.error('scheduleMonthlyReport error', { error: error.message });
    throw error;
  }
};

/**
 * Initialize all scheduled jobs
 */
export const initializeScheduledJobs = async () => {
  try {
    logger.info('Initializing scheduled jobs...');
    await scheduleDailyStockCheck();
    await scheduleWeeklyReport();
    await scheduleMonthlyReport();
    logger.info('All scheduled jobs initialized');
  } catch (error) {
    logger.error('initializeScheduledJobs error', { error: error.message });
    throw error;
  }
};

/**
 * Close all queues (for graceful shutdown)
 */
export const closeQueues = async () => {
  try {
    await appointmentReminderQueue.close();
    await paymentReminderQueue.close();
    await lowStockAlertQueue.close();
    await reportQueue.close();
    logger.info('All job queues closed');
  } catch (error) {
    logger.error('closeQueues error', { error: error.message });
    throw error;
  }
};

export default {
  appointmentReminderQueue,
  paymentReminderQueue,
  lowStockAlertQueue,
  reportQueue,
  scheduleAppointmentReminders,
  schedulePaymentReminder,
  scheduleDailyStockCheck,
  scheduleWeeklyReport,
  scheduleMonthlyReport,
  initializeScheduledJobs,
  closeQueues,
};
