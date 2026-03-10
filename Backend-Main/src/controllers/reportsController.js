import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const getDailyReport = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const [appts, payments, expenses] = await Promise.all([
      query(`SELECT a.*, p.name AS patient_name, t.name AS treatment_name FROM appointments a LEFT JOIN patients p ON a.patient_id=p.id LEFT JOIN treatments t ON a.treatment_id=t.id WHERE DATE(a.scheduled_time)=$1 AND a.deleted_at IS NULL ORDER BY a.scheduled_time ASC`, [date]),
      query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM payments WHERE DATE(paid_date)=$1 AND status='paid'`, [date]),
      query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM expenses WHERE date=$1 AND deleted_at IS NULL`, [date]),
    ]);
    return res.json({ success: true, statusCode: 200, data: { date, appointments: appts.rows, appointments_count: appts.rows.length, revenue: parseFloat(payments.rows[0].total), revenue_count: parseInt(payments.rows[0].count), expenses: parseFloat(expenses.rows[0].total), expenses_count: parseInt(expenses.rows[0].count) } });
  } catch (e) { logger.error('getDailyReport', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get daily report' }); }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0,7);
    const [revenue, expensesData, apptStatus, topTreatments, lowStock] = await Promise.all([
      query(`SELECT DATE(paid_date) AS day, SUM(amount) AS total FROM payments WHERE TO_CHAR(paid_date,'YYYY-MM')=$1 AND status='paid' GROUP BY DATE(paid_date) ORDER BY day ASC`, [month]),
      query(`SELECT category, SUM(amount) AS total FROM expenses WHERE TO_CHAR(date,'YYYY-MM')=$1 AND deleted_at IS NULL GROUP BY category ORDER BY total DESC`, [month]),
      query(`SELECT status, COUNT(*) AS count FROM appointments WHERE TO_CHAR(scheduled_time,'YYYY-MM')=$1 AND deleted_at IS NULL GROUP BY status`, [month]),
      query(`SELECT t.name, COUNT(*) AS count FROM appointments a LEFT JOIN treatments t ON a.treatment_id=t.id WHERE TO_CHAR(a.scheduled_time,'YYYY-MM')=$1 AND a.deleted_at IS NULL GROUP BY t.name ORDER BY count DESC LIMIT 5`, [month]),
      query(`SELECT * FROM inventory_items WHERE current_stock <= minimum_stock_threshold AND deleted_at IS NULL ORDER BY current_stock ASC`),
    ]);
    const totalRevenue = revenue.rows.reduce((s,r)=>s+parseFloat(r.total),0);
    const totalExpenses = expensesData.rows.reduce((s,r)=>s+parseFloat(r.total),0);
    return res.json({ success: true, statusCode: 200, data: { month, revenue_by_day: revenue.rows, total_revenue: totalRevenue, expenses_by_category: expensesData.rows, total_expenses: totalExpenses, net_profit: totalRevenue - totalExpenses, appointments_by_status: apptStatus.rows, top_treatments: topTreatments.rows, low_stock_items: lowStock.rows } });
  } catch (e) { logger.error('getMonthlyReport', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get monthly report' }); }
};

export const getPatientMetrics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params = []; let where = 'WHERE a.deleted_at IS NULL';
    if (start_date) { params.push(start_date); where += ` AND DATE(a.scheduled_time)>=$${params.length}`; }
    if (end_date) { params.push(end_date); where += ` AND DATE(a.scheduled_time)<=$${params.length}`; }
    const [newPatients, returning, topPatients] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM patients WHERE deleted_at IS NULL${start_date ? ` AND created_at>=$1` : ''}${end_date ? ` AND created_at<=$${start_date?2:1}` : ''}`, [...(start_date?[start_date]:[]), ...(end_date?[end_date]:[])]),
      query(`SELECT COUNT(DISTINCT a.patient_id) AS count FROM appointments a ${where}`, params),
      query(`SELECT p.name, p.phone, COUNT(a.id) AS visit_count FROM appointments a LEFT JOIN patients p ON a.patient_id=p.id ${where} GROUP BY p.id, p.name, p.phone ORDER BY visit_count DESC LIMIT 10`, params),
    ]);
    return res.json({ success: true, statusCode: 200, data: { new_patients: parseInt(newPatients.rows[0].count), returning_patients: parseInt(returning.rows[0].count), top_patients: topPatients.rows } });
  } catch (e) { logger.error('getPatientMetrics', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get patient metrics' }); }
};

export const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [apptToday, apptTotal, patientTotal, revenueToday, revenueMonth, expenseMonth, lowStock] = await Promise.all([
      query(`SELECT COUNT(*) FROM appointments WHERE DATE(scheduled_time)=$1 AND deleted_at IS NULL`, [today]),
      query(`SELECT COUNT(*) FROM appointments WHERE deleted_at IS NULL`),
      query(`SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL`),
      query(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE DATE(paid_date)=$1 AND status='paid'`, [today]),
      query(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE DATE_TRUNC('month',paid_date)=DATE_TRUNC('month',NOW()) AND status='paid'`),
      query(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE DATE_TRUNC('month',date)=DATE_TRUNC('month',NOW()) AND deleted_at IS NULL`),
      query(`SELECT COUNT(*) FROM inventory_items WHERE current_stock <= minimum_stock_threshold AND deleted_at IS NULL`),
    ]);
    return res.json({ success: true, statusCode: 200, data: { appointments_today: parseInt(apptToday.rows[0].count), appointments_total: parseInt(apptTotal.rows[0].count), patients_total: parseInt(patientTotal.rows[0].count), revenue_today: parseFloat(revenueToday.rows[0].total), revenue_month: parseFloat(revenueMonth.rows[0].total), expense_month: parseFloat(expenseMonth.rows[0].total), low_stock_count: parseInt(lowStock.rows[0].count) } });
  } catch (e) { logger.error('getDashboardSummary', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get dashboard summary' }); }
};

export default { getDailyReport, getMonthlyReport, getPatientMetrics, getDashboardSummary };
