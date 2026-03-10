import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class Settings {
  /**
   * Get all settings
   */
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) throw error;

      // Convert array to object keyed by setting_key
      const settings = {};
      data.forEach((setting) => {
        settings[setting.setting_key] = setting.setting_value;
      });

      return settings;
    } catch (error) {
      logger.error('Settings.getAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get specific setting
   */
  static async get(key) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.setting_value || null;
    } catch (error) {
      logger.error('Settings.get error', { error: error.message, key });
      throw error;
    }
  }

  /**
   * Update setting
   */
  static async set(key, value) {
    try {
      // Try to update first
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('setting_key', key)
        .single();

      let data, error;

      if (existing) {
        // Update existing
        const result = await supabase
          .from('settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('setting_key', key)
          .select()
          .single();

        data = result.data;
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from('settings')
          .insert([{ setting_key: key, setting_value: value }])
          .select()
          .single();

        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      logger.info('Setting updated', { key, value });
      return data;
    } catch (error) {
      logger.error('Settings.set error', { error: error.message, key });
      throw error;
    }
  }

  /**
   * Delete setting
   */
  static async delete(key) {
    try {
      const { error } = await supabase
        .from('settings')
        .delete()
        .eq('setting_key', key);

      if (error) throw error;
      logger.info('Setting deleted', { key });
      return true;
    } catch (error) {
      logger.error('Settings.delete error', { error: error.message, key });
      throw error;
    }
  }

  /**
   * Get clinic info
   */
  static async getClinicInfo() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'clinic_name',
          'clinic_phone',
          'clinic_email',
          'clinic_address',
          'clinic_city',
          'clinic_state',
          'clinic_pincode',
          'clinic_gst',
        ]);

      if (error) throw error;

      const clinic = {};
      data.forEach((setting) => {
        clinic[setting.setting_key] = setting.setting_value;
      });

      return clinic;
    } catch (error) {
      logger.error('Settings.getClinicInfo error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update clinic info
   */
  static async updateClinicInfo(clinicData) {
    try {
      const updates = Object.entries(clinicData).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }));

      // Upsert each setting
      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert([update], { onConflict: 'setting_key' });

        if (error) throw error;
      }

      logger.info('Clinic info updated');
      return clinicData;
    } catch (error) {
      logger.error('Settings.updateClinicInfo error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get business hours
   */
  static async getBusinessHours() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'business_hours_monday',
          'business_hours_tuesday',
          'business_hours_wednesday',
          'business_hours_thursday',
          'business_hours_friday',
          'business_hours_saturday',
          'business_hours_sunday',
        ]);

      if (error) throw error;

      const hours = {};
      data.forEach((setting) => {
        const day = setting.setting_key.replace('business_hours_', '');
        hours[day] = setting.setting_value;
      });

      return hours;
    } catch (error) {
      logger.error('Settings.getBusinessHours error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update business hours
   */
  static async updateBusinessHours(hoursData) {
    try {
      const updates = Object.entries(hoursData).map(([day, hours]) => ({
        setting_key: `business_hours_${day}`,
        setting_value: hours,
        updated_at: new Date().toISOString(),
      }));

      // Upsert each setting
      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert([update], { onConflict: 'setting_key' });

        if (error) throw error;
      }

      logger.info('Business hours updated');
      return hoursData;
    } catch (error) {
      logger.error('Settings.updateBusinessHours error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get payment methods
   */
  static async getPaymentMethods() {
    try {
      const methods = await this.get('payment_methods');
      return methods ? JSON.parse(methods) : [];
    } catch (error) {
      logger.error('Settings.getPaymentMethods error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update payment methods
   */
  static async updatePaymentMethods(methods) {
    try {
      await this.set('payment_methods', JSON.stringify(methods));
      logger.info('Payment methods updated');
      return methods;
    } catch (error) {
      logger.error('Settings.updatePaymentMethods error', { error: error.message });
      throw error;
    }
  }
}

export default Settings;
