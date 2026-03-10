import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class Treatment {
  /**
   * Find treatment by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Treatment.findById error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get all treatments with filters
   */
  static async findAll(page = 1, limit = 50, filters = {}) {
    try {
      let query = supabase
        .from('treatments')
        .select('*', { count: 'exact' });

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, count, error } = await query
        .order('category', { ascending: true })
        .order('name', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      logger.error('Treatment.findAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all active treatments (no pagination)
   */
  static async getActive() {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Treatment.getActive error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create treatment
   */
  static async create(treatmentData) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .insert([treatmentData])
        .select()
        .single();

      if (error) throw error;
      logger.info('Treatment created', { treatmentId: data.id, name: data.name });
      return data;
    } catch (error) {
      logger.error('Treatment.create error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update treatment
   */
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Treatment updated', { treatmentId: id });
      return data;
    } catch (error) {
      logger.error('Treatment.update error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Delete treatment
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('treatments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      logger.info('Treatment deleted', { treatmentId: id });
      return true;
    } catch (error) {
      logger.error('Treatment.delete error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get treatments by category
   */
  static async getByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Treatment.getByCategory error', { error: error.message, category });
      throw error;
    }
  }

  /**
   * Get all categories
   */
  static async getCategories() {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('category')
        .eq('is_active', true)
        .distinct();

      if (error) throw error;
      return data.map((item) => item.category).filter((cat) => cat);
    } catch (error) {
      logger.error('Treatment.getCategories error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get treatment statistics
   */
  static async getStats() {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('category, is_active');

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter((t) => t.is_active).length,
        inactive: data.filter((t) => !t.is_active).length,
        byCategory: {},
      };

      data.forEach((treatment) => {
        const category = treatment.category || 'Other';
        if (!stats.byCategory[category]) {
          stats.byCategory[category] = { active: 0, inactive: 0 };
        }
        if (treatment.is_active) {
          stats.byCategory[category].active++;
        } else {
          stats.byCategory[category].inactive++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Treatment.getStats error', { error: error.message });
      throw error;
    }
  }

  /**
   * Deactivate treatment
   */
  static async deactivate(id) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Treatment deactivated', { treatmentId: id });
      return data;
    } catch (error) {
      logger.error('Treatment.deactivate error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Activate treatment
   */
  static async activate(id) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Treatment activated', { treatmentId: id });
      return data;
    } catch (error) {
      logger.error('Treatment.activate error', { error: error.message, id });
      throw error;
    }
  }
}

export default Treatment;
