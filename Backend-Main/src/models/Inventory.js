import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class Inventory {
  /**
   * Find inventory item by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Inventory.findById error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get all inventory items with filters
   */
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      let query = supabase
        .from('inventory')
        .select('*', { count: 'exact' });

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id);
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, count, error } = await query
        .order('name', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      logger.error('Inventory.findAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create inventory item
   */
  static async create(itemData) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;
      logger.info('Inventory item created', { itemId: data.id, name: data.name });
      return data;
    } catch (error) {
      logger.error('Inventory.create error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update inventory item
   */
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Inventory item updated', { itemId: id });
      return data;
    } catch (error) {
      logger.error('Inventory.update error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Update stock quantity
   */
  static async updateStock(id, quantity, type = 'set') {
    try {
      const item = await this.findById(id);
      if (!item) throw new Error('Item not found');

      let newQuantity = quantity;
      if (type === 'add') {
        newQuantity = item.quantity + quantity;
      } else if (type === 'subtract') {
        newQuantity = item.quantity - quantity;
        if (newQuantity < 0) throw new Error('Insufficient stock');
      }

      const { data, error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity, last_updated: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('Stock updated', { itemId: id, quantity: newQuantity });
      return data;
    } catch (error) {
      logger.error('Inventory.updateStock error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Delete inventory item
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      logger.info('Inventory item deleted', { itemId: id });
      return true;
    } catch (error) {
      logger.error('Inventory.delete error', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get low stock items
   */
  static async getLowStock(threshold = null) {
    try {
      let query = supabase
        .from('inventory')
        .select('*');

      if (threshold) {
        query = query.lte('quantity', threshold);
      } else {
        // Default: items where quantity <= reorder_level
        query = query.filter('quantity', 'lte', supabase.rpc('get_reorder_level'));
      }

      const { data, error } = await query.order('quantity', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Inventory.getLowStock error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get items by category
   */
  static async getByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('category', category)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Inventory.getByCategory error', { error: error.message, category });
      throw error;
    }
  }

  /**
   * Get inventory value summary
   */
  static async getValueSummary() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('quantity, unit_cost');

      if (error) throw error;

      const totalValue = data.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_cost);
      }, 0);

      const totalItems = data.reduce((sum, item) => sum + item.quantity, 0);

      return {
        totalValue,
        totalItems,
        itemCount: data.length,
      };
    } catch (error) {
      logger.error('Inventory.getValueSummary error', { error: error.message });
      throw error;
    }
  }
}

export default Inventory;
