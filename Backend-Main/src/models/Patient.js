import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class Patient {
  /**
   * Find patient by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Patient.findById error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Find patient by phone
   */
  static async findByPhone(phone) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('phone', phone)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Patient.findByPhone error', { error: error.message, phone });
      throw error;
    }
  }

  /**
   * Get all patients with pagination
   */
  static async findAll(page = 1, limit = 10, search = '') {
    try {
      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      logger.error('Patient.findAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create new patient
   */
  static async create(patientData) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();

      if (error) throw error;
      logger.info('Patient created', { patientId: data.id });
      return data;
    } catch (error) {
      logger.error('Patient.create error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update patient
   */
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Patient updated', { patientId: id });
      return data;
    } catch (error) {
      logger.error('Patient.update error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Soft delete patient
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('patients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      logger.info('Patient deleted', { patientId: id });
      return true;
    } catch (error) {
      logger.error('Patient.delete error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get patient with appointments
   */
  static async getWithAppointments(patientId) {
    try {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .is('deleted_at', null)
        .single();

      if (patientError) throw patientError;

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*,treatments(name,base_cost)')
        .eq('patient_id', patientId)
        .is('deleted_at', null)
        .order('scheduled_time', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      return { ...patient, appointments };
    } catch (error) {
      logger.error('Patient.getWithAppointments error', { error: error.message });
      throw error;
    }
  }
}

export default Patient;
