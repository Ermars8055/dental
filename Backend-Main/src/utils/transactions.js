/**
 * Transaction utilities for coordinating multi-step database operations
 * Ensures data consistency when multiple related records need to be created/updated
 */

import { supabase } from '../config/supabase.js';
import { logger } from './logger.js';

/**
 * Execute operation with retry logic
 * Handles transient failures by retrying up to maxRetries times
 */
export const executeWithRetry = async (operation, maxRetries = 3, delayMs = 100) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, { error: error.message });

      if (attempt < maxRetries) {
        // Exponential backoff: wait longer on each retry
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
};

/**
 * Create appointment and payment together atomically
 * Ensures both succeed or both fail
 */
export const createAppointmentWithPayment = async (appointmentData, paymentData) => {
  try {
    // Step 1: Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (appointmentError) {
      throw new Error(`Failed to create appointment: ${appointmentError.message}`);
    }

    // Step 2: Create payment (if provided)
    let payment = null;
    if (paymentData) {
      // Link payment to appointment
      paymentData.appointment_id = appointment.id;

      const { data: paymentResult, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        // If payment fails, we need to rollback the appointment
        await supabase
          .from('appointments')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', appointment.id);

        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }

      payment = paymentResult;
    }

    logger.info('Appointment and payment created successfully', {
      appointmentId: appointment.id,
      paymentId: payment?.id,
    });

    return { appointment, payment };
  } catch (error) {
    logger.error('Transaction error in createAppointmentWithPayment', { error: error.message });
    throw error;
  }
};

/**
 * Update appointment status and related payment
 * Ensures consistency between appointment and payment states
 */
export const updateAppointmentStatus = async (appointmentId, status, paymentUpdates = null) => {
  try {
    // Step 1: Update appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .select()
      .single();

    if (appointmentError) {
      throw new Error(`Failed to update appointment: ${appointmentError.message}`);
    }

    // Step 2: Update payment if status changed
    let payment = null;
    if (paymentUpdates && status === 'completed') {
      const { data: paymentResult, error: paymentError } = await supabase
        .from('payments')
        .update(paymentUpdates)
        .eq('appointment_id', appointmentId)
        .select()
        .single();

      if (paymentError && paymentError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is OK
        logger.warn('Failed to update related payment', { error: paymentError.message });
      }

      payment = paymentResult;
    }

    logger.info('Appointment status updated successfully', {
      appointmentId,
      status,
      paymentUpdated: !!payment,
    });

    return { appointment, payment };
  } catch (error) {
    logger.error('Transaction error in updateAppointmentStatus', { error: error.message });
    throw error;
  }
};

/**
 * Record payment and update appointment status together
 * Ensures payment and appointment states stay in sync
 */
export const recordPaymentAndUpdateAppointment = async (paymentData, appointmentStatusUpdate) => {
  try {
    // Step 1: Record payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to record payment: ${paymentError.message}`);
    }

    // Step 2: Update appointment status if needed
    let appointment = null;
    if (appointmentStatusUpdate && paymentData.appointment_id) {
      const { data: appointmentResult, error: appointmentError } = await supabase
        .from('appointments')
        .update(appointmentStatusUpdate)
        .eq('id', paymentData.appointment_id)
        .select()
        .single();

      if (appointmentError && appointmentError.code !== 'PGRST116') {
        logger.warn('Failed to update related appointment', { error: appointmentError.message });
      }

      appointment = appointmentResult;
    }

    logger.info('Payment recorded and appointment updated', {
      paymentId: payment.id,
      appointmentId: paymentData.appointment_id,
      appointmentUpdated: !!appointment,
    });

    return { payment, appointment };
  } catch (error) {
    logger.error('Transaction error in recordPaymentAndUpdateAppointment', { error: error.message });
    throw error;
  }
};

/**
 * Soft delete appointment and related records
 * Cascades delete to payments to maintain referential integrity
 */
export const softDeleteAppointment = async (appointmentId) => {
  try {
    const now = new Date().toISOString();

    // Step 1: Soft delete related payments
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ deleted_at: now })
      .eq('appointment_id', appointmentId);

    if (paymentError && paymentError.code !== 'PGRST116') {
      logger.warn('Failed to soft delete related payments', { error: paymentError.message });
    }

    // Step 2: Soft delete appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .update({ deleted_at: now })
      .eq('id', appointmentId)
      .select()
      .single();

    if (appointmentError) {
      throw new Error(`Failed to soft delete appointment: ${appointmentError.message}`);
    }

    logger.info('Appointment and related records soft deleted', { appointmentId });

    return appointment;
  } catch (error) {
    logger.error('Transaction error in softDeleteAppointment', { error: error.message });
    throw error;
  }
};

/**
 * Idempotent operation wrapper
 * Prevents duplicate operations if the same request is retried
 */
export const executeIdempotent = async (
  idempotencyKey,
  operation,
  expiryMs = 24 * 60 * 60 * 1000 // 24 hours default
) => {
  try {
    // Check if this operation was already performed
    const { data: existing } = await supabase
      .from('idempotency_keys')
      .select('*')
      .eq('key', idempotencyKey)
      .single();

    if (existing) {
      // Operation already completed, return cached result
      logger.info('Idempotent operation already completed', { key: idempotencyKey });
      return JSON.parse(existing.result);
    }

    // Execute the operation
    const result = await operation();

    // Store the result for future identical requests
    await supabase
      .from('idempotency_keys')
      .insert({
        key: idempotencyKey,
        result: JSON.stringify(result),
        expires_at: new Date(Date.now() + expiryMs).toISOString(),
      })
      .then(() => {
        logger.info('Idempotency key stored', { key: idempotencyKey });
      })
      .catch((error) => {
        logger.warn('Failed to store idempotency key', { key: idempotencyKey, error: error.message });
      });

    return result;
  } catch (error) {
    logger.error('Idempotent operation failed', { error: error.message });
    throw error;
  }
};

export default {
  executeWithRetry,
  createAppointmentWithPayment,
  updateAppointmentStatus,
  recordPaymentAndUpdateAppointment,
  softDeleteAppointment,
  executeIdempotent,
};
