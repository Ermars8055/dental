import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class Payment {
  /**
   * Find payment by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*,patients(name,phone,email),appointments(id,scheduled_time,treatments(name))')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Payment.findById error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get all payments with filters
   */
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      let query = supabase
        .from('payments')
        .select('*,patients(name,phone),appointments(scheduled_time,treatments(name))', { count: 'exact' });

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      logger.error('Payment.findAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create payment
   */
  static async create(paymentData) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;
      logger.info('Payment created', { paymentId: data.id });
      return data;
    } catch (error) {
      logger.error('Payment.create error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update payment
   */
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Payment updated', { paymentId: id });
      return data;
    } catch (error) {
      logger.error('Payment.update error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get pending payments
   */
  static async getPending() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id,amount,status,due_date,patients(name,phone),appointments(scheduled_time,treatments(name))')
        .in('status', ['pending', 'partial'])
        .order('due_date', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const overdue = data.filter((p) => new Date(p.due_date) < now);
      const upcoming = data.filter((p) => new Date(p.due_date) >= now);

      return { overdue, upcoming, all: data };
    } catch (error) {
      logger.error('Payment.getPending error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get daily summary
   */
  static async getDailySummary(date) {
    try {
      const nextDate = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_method')
        .gte('paid_date', date + 'T00:00:00')
        .lt('paid_date', nextDate + 'T00:00:00')
        .eq('status', 'paid');

      if (error) throw error;

      const byMethod = {};
      let total = 0;

      data.forEach((payment) => {
        const method = payment.payment_method || 'unknown';
        byMethod[method] = (byMethod[method] || 0) + payment.amount;
        total += payment.amount;
      });

      return { total, byMethod, count: data.length };
    } catch (error) {
      logger.error('Payment.getDailySummary error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get monthly summary
   */
  static async getMonthlySummary(year, month) {
    try {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 1).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_method')
        .gte('paid_date', startDate + 'T00:00:00')
        .lt('paid_date', endDate + 'T00:00:00')
        .eq('status', 'paid');

      if (error) throw error;

      const byMethod = {};
      let total = 0;

      data.forEach((payment) => {
        const method = payment.payment_method || 'unknown';
        byMethod[method] = (byMethod[method] || 0) + payment.amount;
        total += payment.amount;
      });

      return { total, byMethod, count: data.length };
    } catch (error) {
      logger.error('Payment.getMonthlySummary error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get patient payment history
   */
  static async getPatientHistory(patientId) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*,appointments(scheduled_time,treatments(name))')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = data.reduce((sum, p) => sum + p.amount, 0);
      const paid = data.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const pending = data.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

      return { payments: data, summary: { total, paid, pending } };
    } catch (error) {
      logger.error('Payment.getPatientHistory error', { error: error.message });
      throw error;
    }
  }
}

export default Payment;
