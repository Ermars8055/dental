import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class User {
  /**
   * Find user by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, phone, is_active, created_at, updated_at')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('User.findById error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('User.findByEmail error', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Get all users with filters
   */
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      let query = supabase
        .from('users')
        .select('id, email, name, role, phone, is_active, created_at, updated_at', { count: 'exact' });

      if (filters.role) query = query.eq('role', filters.role);
      if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      logger.error('User.findAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get users by role
   */
  static async findByRole(role) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, phone, is_active')
        .eq('role', role)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('User.findByRole error', { error: error.message, role });
      throw error;
    }
  }

  /**
   * Create user
   */
  static async create(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select('id, email, name, role, phone, is_active, created_at')
        .single();

      if (error) throw error;
      logger.info('User created', { userId: data.id, email: data.email, role: data.role });
      return data;
    } catch (error) {
      logger.error('User.create error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(id, updateData) {
    try {
      // Don't allow password update through this method
      const { password_hash, ...safeData } = updateData;

      const { data, error } = await supabase
        .from('users')
        .update({
          ...safeData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, email, name, role, phone, is_active, updated_at')
        .single();

      if (error) throw error;
      logger.info('User updated', { userId: id });
      return data;
    } catch (error) {
      logger.error('User.update error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivate(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('User deactivated', { userId: id });
      return data;
    } catch (error) {
      logger.error('User.deactivate error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Activate user
   */
  static async activate(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('User activated', { userId: id });
      return data;
    } catch (error) {
      logger.error('User.activate error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email) {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('email', email);

      if (error) throw error;
      return count > 0;
    } catch (error) {
      logger.error('User.emailExists error', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Get user count by role
   */
  static async countByRole(role) {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', role)
        .eq('is_active', true);

      if (error) throw error;
      return count;
    } catch (error) {
      logger.error('User.countByRole error', { error: error.message, role });
      throw error;
    }
  }

  /**
   * Get active users
   */
  static async getActive() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, phone')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('User.getActive error', { error: error.message });
      throw error;
    }
  }
}

export default User;
