import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class Expense {
  /**
   * Find expense by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Expense.findById error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get all expenses with filters and pagination
   */
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      let query = supabase
        .from('expenses')
        .select('*', { count: 'exact' });

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.date_from) query = query.gte('date', filters.date_from);
      if (filters.date_to) query = query.lte('date', filters.date_to);
      if (filters.min_amount) query = query.gte('amount', filters.min_amount);
      if (filters.max_amount) query = query.lte('amount', filters.max_amount);

      const { data, count, error } = await query
        .order('date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      logger.error('Expense.findAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create expense
   */
  static async create(expenseData) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) throw error;
      logger.info('Expense created', { expenseId: data.id, amount: data.amount });
      return data;
    } catch (error) {
      logger.error('Expense.create error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update expense
   */
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Expense updated', { expenseId: id });
      return data;
    } catch (error) {
      logger.error('Expense.update error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Delete expense
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      logger.info('Expense deleted', { expenseId: id });
      return true;
    } catch (error) {
      logger.error('Expense.delete error', { error: error.message, id });
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
        .from('expenses')
        .select('amount, category')
        .gte('date', date + 'T00:00:00')
        .lt('date', nextDate + 'T00:00:00');

      if (error) throw error;

      const byCategory = {};
      let total = 0;

      data.forEach((expense) => {
        const category = expense.category || 'other';
        byCategory[category] = (byCategory[category] || 0) + expense.amount;
        total += expense.amount;
      });

      return { total, byCategory, count: data.length };
    } catch (error) {
      logger.error('Expense.getDailySummary error', { error: error.message });
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
        .from('expenses')
        .select('amount, category')
        .gte('date', startDate + 'T00:00:00')
        .lt('date', endDate + 'T00:00:00');

      if (error) throw error;

      const byCategory = {};
      let total = 0;

      data.forEach((expense) => {
        const category = expense.category || 'other';
        byCategory[category] = (byCategory[category] || 0) + expense.amount;
        total += expense.amount;
      });

      return { total, byCategory, count: data.length };
    } catch (error) {
      logger.error('Expense.getMonthlySummary error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get expenses by category
   */
  static async getByCategory(category, page = 1, limit = 10) {
    try {
      const { data, count, error } = await supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('category', category)
        .order('date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      logger.error('Expense.getByCategory error', { error: error.message, category });
      throw error;
    }
  }
}

export default Expense;
