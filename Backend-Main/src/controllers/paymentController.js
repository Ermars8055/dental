import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';

const BASE_SELECT = `
  SELECT py.*, p.name AS patient_name, t.name AS treatment_name
  FROM payments py
  LEFT JOIN patients p ON py.patient_id = p.id
  LEFT JOIN appointments a ON py.appointment_id = a.id
  LEFT JOIN treatments t ON a.treatment_id = t.id`;

export const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, patient_id, date_from, date_to } = req.query;
    const p = Math.max(1, parseInt(page)), l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;
    const params = []; let where = 'WHERE 1=1';
    if (status) { params.push(status); where += ` AND py.status=$${params.length}`; }
    if (patient_id) { params.push(patient_id); where += ` AND py.patient_id=$${params.length}`; }
    if (date_from) { params.push(date_from); where += ` AND py.paid_date>=$${params.length}`; }
    if (date_to) { params.push(date_to); where += ` AND py.paid_date<=$${params.length}`; }
    const { rows: [{ count }] } = await query(`SELECT COUNT(*) FROM payments py ${where}`, params);
    const { rows: payments } = await query(`${BASE_SELECT} ${where} ORDER BY py.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, l, offset]);
    return res.json({ success: true, statusCode: 200, data: { payments, pagination: { page: p, limit: l, total: parseInt(count), pages: Math.ceil(parseInt(count)/l) } } });
  } catch (e) { logger.error('getAllPayments', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get payments' }); }
};

export const getPaymentById = async (req, res) => {
  try {
    const { rows } = await query(`${BASE_SELECT} WHERE py.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.json({ success: true, statusCode: 200, data: { payment: rows[0] } });
  } catch (e) { logger.error('getPaymentById', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get payment' }); }
};

export const recordPayment = async (req, res) => {
  try {
    const { appointment_id, patient_id, amount, status = 'pending', payment_method, transaction_id, notes, paid_date, due_date } = req.body;
    if (!patient_id || !amount) return res.status(400).json({ success: false, message: 'patient_id and amount required' });
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO payments (id,appointment_id,patient_id,amount,status,payment_method,transaction_id,notes,paid_date,due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, appointment_id||null, patient_id, amount, status, payment_method||null, transaction_id||null, notes||null, paid_date||null, due_date||null]);
    logger.info('Payment recorded', { id });
    return res.status(201).json({ success: true, statusCode: 201, data: { payment: rows[0] } });
  } catch (e) { logger.error('recordPayment', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to record payment' }); }
};

export const updatePayment = async (req, res) => {
  try {
    const { rows: ex } = await query('SELECT id FROM payments WHERE id=$1', [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: 'Payment not found' });
    const d = req.body; const fields = [], vals = [];
    ['amount','status','payment_method','transaction_id','notes','paid_date','due_date'].forEach(k => { if (d[k]!==undefined) { fields.push(`${k}=$${vals.length+1}`); vals.push(d[k]); } });
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    vals.push(req.params.id);
    const { rows } = await query(`UPDATE payments SET ${fields.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    return res.json({ success: true, statusCode: 200, data: { payment: rows[0] } });
  } catch (e) { logger.error('updatePayment', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to update payment' }); }
};

export const getPendingPayments = async (req, res) => {
  try {
    const { rows: payments } = await query(`${BASE_SELECT} WHERE py.status IN ('pending','partial') ORDER BY py.due_date ASC NULLS LAST`);
    return res.json({ success: true, statusCode: 200, data: { payments, count: payments.length } });
  } catch (e) { logger.error('getPendingPayments', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get pending payments' }); }
};

export const getDailySummary = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const { rows } = await query(
      `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count, payment_method FROM payments WHERE DATE(paid_date)=$1 AND status='paid' GROUP BY payment_method`, [date]);
    const total = rows.reduce((s, r) => s + parseFloat(r.total), 0);
    return res.json({ success: true, statusCode: 200, data: { date, total, by_method: rows } });
  } catch (e) { logger.error('getDailySummary', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get daily summary' }); }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0,7);
    const { rows } = await query(
      `SELECT DATE(paid_date) AS day, SUM(amount) AS total, COUNT(*) AS count FROM payments WHERE TO_CHAR(paid_date,'YYYY-MM')=$1 AND status='paid' GROUP BY DATE(paid_date) ORDER BY day ASC`, [month]);
    const total = rows.reduce((s, r) => s + parseFloat(r.total), 0);
    return res.json({ success: true, statusCode: 200, data: { month, total, by_day: rows } });
  } catch (e) { logger.error('getMonthlySummary', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get monthly summary' }); }
};

export const getPatientPaymentHistory = async (req, res) => {
  try {
    const { rows: payments } = await query(
      `SELECT py.*, t.name AS treatment_name FROM payments py LEFT JOIN appointments a ON py.appointment_id=a.id LEFT JOIN treatments t ON a.treatment_id=t.id WHERE py.patient_id=$1 ORDER BY py.created_at DESC`,
      [req.params.patient_id]);
    return res.json({ success: true, statusCode: 200, data: { payments } });
  } catch (e) { logger.error('getPatientPaymentHistory', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get payment history' }); }
};

export default { getAllPayments, getPaymentById, recordPayment, updatePayment, getPendingPayments, getDailySummary, getMonthlySummary, getPatientPaymentHistory };
