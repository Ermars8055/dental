import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const getAllExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, date_from, date_to } = req.query;
    const p = Math.max(1, parseInt(page)), l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;
    const params = []; let where = 'WHERE e.deleted_at IS NULL';
    if (category) { params.push(category); where += ` AND e.category=$${params.length}`; }
    if (date_from) { params.push(date_from); where += ` AND e.date>=$${params.length}`; }
    if (date_to) { params.push(date_to); where += ` AND e.date<=$${params.length}`; }
    const { rows: [{ count }] } = await query(`SELECT COUNT(*) FROM expenses e ${where}`, params);
    const { rows: expenses } = await query(
      `SELECT e.*, u.name AS created_by_name FROM expenses e LEFT JOIN users u ON e.created_by=u.id ${where} ORDER BY e.date DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, l, offset]);
    return res.json({ success: true, statusCode: 200, data: { expenses, pagination: { page: p, limit: l, total: parseInt(count), pages: Math.ceil(parseInt(count)/l) } } });
  } catch (e) { logger.error('getAllExpenses', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get expenses' }); }
};

export const getExpenseById = async (req, res) => {
  try {
    const { rows } = await query(`SELECT e.*, u.name AS created_by_name FROM expenses e LEFT JOIN users u ON e.created_by=u.id WHERE e.id=$1 AND e.deleted_at IS NULL`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    return res.json({ success: true, statusCode: 200, data: { expense: rows[0] } });
  } catch (e) { logger.error('getExpenseById', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get expense' }); }
};

export const createExpense = async (req, res) => {
  try {
    const { category, amount, description, notes, date, receipt_url } = req.body;
    if (!category || !amount) return res.status(400).json({ success: false, message: 'category and amount are required' });
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO expenses (id,category,amount,description,notes,date,receipt_url,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, category, amount, description||null, notes||null, date || new Date().toISOString().split('T')[0], receipt_url||null, req.user?.userId||req.user?.id||null]);
    logger.info('Expense created', { id });
    return res.status(201).json({ success: true, statusCode: 201, data: { expense: rows[0] } });
  } catch (e) { logger.error('createExpense', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to create expense' }); }
};

export const updateExpense = async (req, res) => {
  try {
    const { rows: ex } = await query('SELECT id FROM expenses WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    const d = req.body; const fields = [], vals = [];
    ['category','amount','description','notes','date','receipt_url'].forEach(k => { if (d[k]!==undefined) { fields.push(`${k}=$${vals.length+1}`); vals.push(d[k]); } });
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    vals.push(req.params.id);
    const { rows } = await query(`UPDATE expenses SET ${fields.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    return res.json({ success: true, statusCode: 200, data: { expense: rows[0] } });
  } catch (e) { logger.error('updateExpense', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to update expense' }); }
};

export const deleteExpense = async (req, res) => {
  try {
    const { rows } = await query('UPDATE expenses SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    return res.json({ success: true, statusCode: 200, message: 'Expense deleted' });
  } catch (e) { logger.error('deleteExpense', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to delete expense' }); }
};

export const getDailySummary = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const { rows } = await query(`SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE date=$1 AND deleted_at IS NULL GROUP BY category`, [date]);
    const total = rows.reduce((s, r) => s + parseFloat(r.total), 0);
    return res.json({ success: true, statusCode: 200, data: { date, total, by_category: rows } });
  } catch (e) { logger.error('getDailySummary', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get daily summary' }); }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0,7);
    const { rows } = await query(`SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE TO_CHAR(date,'YYYY-MM')=$1 AND deleted_at IS NULL GROUP BY category ORDER BY total DESC`, [month]);
    const total = rows.reduce((s, r) => s + parseFloat(r.total), 0);
    return res.json({ success: true, statusCode: 200, data: { month, total, by_category: rows } });
  } catch (e) { logger.error('getMonthlySummary', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get monthly summary' }); }
};

export default { getAllExpenses, getExpenseById, createExpense, updateExpense, deleteExpense, getDailySummary, getMonthlySummary };
