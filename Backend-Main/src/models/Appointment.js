import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class Appointment {
  /**
   * Find appointment by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*,patients(name,phone,email),treatments(name,base_cost,duration_minutes)')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Appointment.findById error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get today's appointments
   */
  static async getTodayAppointments() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Calculate next day correctly (avoid setDate mutation)
      const nextDayDate = new Date();
      nextDayDate.setDate(nextDayDate.getDate() + 1);
      const nextDay = nextDayDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select('*,patients(name,phone),treatments(name,base_cost,duration_minutes)')
        .gte('scheduled_time', `${today}T00:00:00Z`)
        .lt('scheduled_time', `${nextDay}T00:00:00Z`)
        .is('deleted_at', null)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Appointment.getTodayAppointments error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all appointments with filters
   */
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      let query = supabase
        .from('appointments')
        .select('*,patients(name,phone),treatments(name,base_cost)', { count: 'exact' })
        .is('deleted_at', null);

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
      if (filters.date_from) query = query.gte('scheduled_time', filters.date_from);
      if (filters.date_to) query = query.lte('scheduled_time', filters.date_to);

      const { data, count, error } = await query
        .order('scheduled_time', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      logger.error('Appointment.findAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create appointment
   */
  static async create(appointmentData) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select('*,patients(name,phone),treatments(name,base_cost)')
        .single();

      if (error) throw error;
      logger.info('Appointment created', { appointmentId: data.id });
      return data;
    } catch (error) {
      logger.error('Appointment.create error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update appointment
   */
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select('*,patients(name,phone),treatments(name,base_cost)')
        .single();

      if (error) throw error;
      logger.info('Appointment updated', { appointmentId: id });
      return data;
    } catch (error) {
      logger.error('Appointment.update error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Check for scheduling conflicts
   */
  static async hasConflict(startTime, endTime, excludeId = null) {
    try {
      let query = supabase
        .from('appointments')
        .select('id')
        .gte('scheduled_time', startTime)
        .lt('scheduled_time', endTime)
        .in('status', ['scheduled', 'in-chair'])
        .is('deleted_at', null);

      if (excludeId) query = query.neq('id', excludeId);

      const { data, error } = await query;
      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      logger.error('Appointment.hasConflict error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get overdue follow-ups
   */
  static async getOverdueFollowUps() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id,scheduled_time,patients(name,phone),treatments(name)')
        .eq('status', 'completed')
        .lt('completed_at', new Date().toISOString())
        .is('deleted_at', null)
        .order('completed_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Appointment.getOverdueFollowUps error', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete appointment (soft delete)
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      logger.info('Appointment deleted', { appointmentId: id });
      return true;
    } catch (error) {
      logger.error('Appointment.delete error', { error: error.message, id });
      throw error;
    }
  }
}

export default Appointment;
