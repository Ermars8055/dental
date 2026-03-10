import { v4 as uuidv4 } from 'uuid';
import { query, getClient } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const getAllItems = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const p = Math.max(1, parseInt(page)), l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;
    const params = []; let where = 'WHERE i.deleted_at IS NULL';
    if (category) { params.push(category); where += ` AND i.category=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND i.name ILIKE $${params.length}`; }
    const { rows: [{ count }] } = await query(`SELECT COUNT(*) FROM inventory_items i ${where}`, params);
    const { rows: items } = await query(
      `SELECT i.*, s.name AS supplier_name FROM inventory_items i LEFT JOIN suppliers s ON i.supplier_id=s.id ${where} ORDER BY i.name ASC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, l, offset]);
    return res.json({ success: true, statusCode: 200, data: { items, pagination: { page: p, limit: l, total: parseInt(count), pages: Math.ceil(parseInt(count)/l) } } });
  } catch (e) { logger.error('getAllItems', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get inventory' }); }
};

export const getItemById = async (req, res) => {
  try {
    const { rows } = await query(`SELECT i.*, s.name AS supplier_name FROM inventory_items i LEFT JOIN suppliers s ON i.supplier_id=s.id WHERE i.id=$1 AND i.deleted_at IS NULL`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Item not found' });
    return res.json({ success: true, statusCode: 200, data: { item: rows[0] } });
  } catch (e) { logger.error('getItemById', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get item' }); }
};

export const createItem = async (req, res) => {
  try {
    const { name, category, current_stock = 0, minimum_stock_threshold = 0, unit_cost, supplier_id } = req.body;
    if (!name || !category) return res.status(400).json({ success: false, message: 'name and category are required' });
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO inventory_items (id,name,category,current_stock,minimum_stock_threshold,unit_cost,supplier_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, name, category, current_stock, minimum_stock_threshold, unit_cost||null, supplier_id||null]);
    logger.info('Inventory item created', { id });
    return res.status(201).json({ success: true, statusCode: 201, data: { item: rows[0] } });
  } catch (e) { logger.error('createItem', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to create item' }); }
};

export const updateItem = async (req, res) => {
  try {
    const { rows: ex } = await query('SELECT id FROM inventory_items WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: 'Item not found' });
    const d = req.body; const fields = [], vals = [];
    ['name','category','current_stock','minimum_stock_threshold','unit_cost','supplier_id'].forEach(k => { if (d[k]!==undefined) { fields.push(`${k}=$${vals.length+1}`); vals.push(d[k]); } });
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    vals.push(req.params.id);
    const { rows } = await query(`UPDATE inventory_items SET ${fields.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    return res.json({ success: true, statusCode: 200, data: { item: rows[0] } });
  } catch (e) { logger.error('updateItem', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to update item' }); }
};

export const deleteItem = async (req, res) => {
  try {
    const { rows } = await query('UPDATE inventory_items SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Item not found' });
    return res.json({ success: true, statusCode: 200, message: 'Item deleted' });
  } catch (e) { logger.error('deleteItem', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to delete item' }); }
};

export const getLowStockItems = async (req, res) => {
  try {
    const { rows: items } = await query(`SELECT * FROM inventory_items WHERE current_stock <= minimum_stock_threshold AND deleted_at IS NULL ORDER BY current_stock ASC`);
    return res.json({ success: true, statusCode: 200, data: { items, count: items.length } });
  } catch (e) { logger.error('getLowStockItems', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get low stock items' }); }
};

export const recordUsage = async (req, res) => {
  try {
    const { quantity_used, notes } = req.body;
    if (!quantity_used || quantity_used <= 0) return res.status(400).json({ success: false, message: 'quantity_used must be positive' });
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const { rows: item } = await client.query('SELECT * FROM inventory_items WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [req.params.id]);
      if (!item.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Item not found' }); }
      if (item[0].current_stock < quantity_used) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Insufficient stock' }); }
      const newQty = item[0].current_stock - parseInt(quantity_used);
      const { rows: updated } = await client.query('UPDATE inventory_items SET current_stock=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [newQty, req.params.id]);
      await client.query(
        `INSERT INTO inventory_transactions (id,item_id,transaction_type,quantity,notes,created_by) VALUES ($1,$2,'usage',$3,$4,$5) ON CONFLICT DO NOTHING`,
        [uuidv4(), req.params.id, quantity_used, notes||null, req.user?.id||null]).catch(() => {});
      await client.query('COMMIT');
      return res.json({ success: true, statusCode: 200, data: { item: updated[0] } });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (e) { logger.error('recordUsage', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to record usage' }); }
};

export const recordRestock = async (req, res) => {
  try {
    const { quantity_added, notes } = req.body;
    if (!quantity_added || quantity_added <= 0) return res.status(400).json({ success: false, message: 'quantity_added must be positive' });
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const { rows: item } = await client.query('SELECT * FROM inventory_items WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [req.params.id]);
      if (!item.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Item not found' }); }
      const newQty = item[0].current_stock + parseInt(quantity_added);
      const { rows: updated } = await client.query('UPDATE inventory_items SET current_stock=$1,last_restocked_at=NOW(),updated_at=NOW() WHERE id=$2 RETURNING *', [newQty, req.params.id]);
      await client.query(
        `INSERT INTO inventory_transactions (id,item_id,transaction_type,quantity,notes,created_by) VALUES ($1,$2,'restock',$3,$4,$5) ON CONFLICT DO NOTHING`,
        [uuidv4(), req.params.id, quantity_added, notes||null, req.user?.id||null]).catch(() => {});
      await client.query('COMMIT');
      return res.json({ success: true, statusCode: 200, data: { item: updated[0] } });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (e) { logger.error('recordRestock', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to record restock' }); }
};

export default { getAllItems, getItemById, createItem, updateItem, deleteItem, getLowStockItems, recordUsage, recordRestock };
