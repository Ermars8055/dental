import { v4 as uuidv4 } from 'uuid';
import { query, getClient } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const getAllAppointments = async (req, res) => {
  try {
    const { date, status, date_from, date_to, page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;
    const params = [];
    let where = 'WHERE a.deleted_at IS NULL';
    if (date) { params.push(date); where += ` AND DATE(a.scheduled_time) = $${params.length}`; }
    if (date_from) { params.push(date_from); where += ` AND a.scheduled_time >= $${params.length}`; }
    if (date_to) { params.push(date_to); where += ` AND a.scheduled_time <= $${params.length}`; }
    if (status) { params.push(status); where += ` AND a.status = $${params.length}`; }
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM appointments a ${where}`, params);
    const total = parseInt(countRows[0].count);
    const dataParams = [...params, l, offset];
    const { rows: appointments } = await query(
      `SELECT a.*, pt.name AS patient_name, pt.phone AS patient_phone, t.name AS treatment_name, t.base_cost AS treatment_cost
       FROM appointments a
       LEFT JOIN patients pt ON a.patient_id = pt.id
       LEFT JOIN treatments t ON a.treatment_id = t.id
       ${where} ORDER BY a.scheduled_time ASC
       LIMIT $${params.length+1} OFFSET $${params.length+2}`, dataParams);
    return res.status(200).json({ success: true, message: 'Appointments retrieved', statusCode: 200, data: { appointments, pagination: { page: p, limit: l, total, pages: Math.ceil(total/l) } } });
  } catch (error) {
    logger.error('Get all appointments error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get appointments', statusCode: 500 });
  }
};

export const getTodayAppointments = async (req, res) => {
  try {
    // Use IST offset (+05:30) so "today" is correct regardless of DB/server timezone.
    // DATE(a.scheduled_time AT TIME ZONE 'Asia/Kolkata') ensures an appointment booked
    // for 8pm IST is still treated as today, not tomorrow (UTC).
    const { rows: appointments } = await query(
      `SELECT a.*, pt.name AS patient_name, pt.phone AS patient_phone, t.name AS treatment_name, t.base_cost AS treatment_cost
       FROM appointments a
       LEFT JOIN patients pt ON a.patient_id = pt.id
       LEFT JOIN treatments t ON a.treatment_id = t.id
       WHERE DATE(a.scheduled_time AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'
         AND a.deleted_at IS NULL
       ORDER BY a.scheduled_time ASC`);
    return res.status(200).json({ success: true, message: "Today's appointments retrieved", statusCode: 200, data: { appointments, count: appointments.length } });
  } catch (error) {
    logger.error('Get today appointments error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get today appointments', statusCode: 500 });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT a.*, pt.name AS patient_name, pt.phone AS patient_phone, pt.email AS patient_email, pt.allergies,
              t.name AS treatment_name, t.base_cost AS treatment_cost, t.duration_minutes,
              p.id AS payment_id, p.amount AS payment_amount, p.status AS payment_status, p.payment_method
       FROM appointments a
       LEFT JOIN patients pt ON a.patient_id = pt.id
       LEFT JOIN treatments t ON a.treatment_id = t.id
       LEFT JOIN payments p ON p.appointment_id = a.id
       WHERE a.id = $1 AND a.deleted_at IS NULL`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found', statusCode: 404 });
    return res.status(200).json({ success: true, message: 'Appointment retrieved', statusCode: 200, data: { appointment: rows[0] } });
  } catch (error) {
    logger.error('Get appointment by ID error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get appointment', statusCode: 500 });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const { patient_id, treatment_id, scheduled_time, notes } = req.body;
    if (!patient_id || !scheduled_time) return res.status(400).json({ success: false, message: 'patient_id and scheduled_time are required', statusCode: 400 });
    const { rows: patRows } = await query('SELECT id FROM patients WHERE id=$1 AND deleted_at IS NULL', [patient_id]);
    if (patRows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found', statusCode: 404 });
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO appointments (id,patient_id,treatment_id,scheduled_time,notes,status,created_by)
       VALUES ($1,$2,$3,$4,$5,'scheduled',$6) RETURNING *`,
      [id, patient_id, treatment_id||null, scheduled_time, notes||null, req.user?.userId||null]);
    logger.info('Appointment created', { appointmentId: id });
    return res.status(201).json({ success: true, message: 'Appointment created', statusCode: 201, data: { appointment: rows[0] } });
  } catch (error) {
    logger.error('Create appointment error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to create appointment', statusCode: 500 });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: existing } = await query('SELECT id FROM appointments WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found', statusCode: 404 });
    const d = req.body;
    const fields = []; const vals = [];
    const allowed = ['patient_id','treatment_id','scheduled_time','notes','status','reschedule_reason'];
    allowed.forEach(k => { if (d[k] !== undefined) { fields.push(`${k}=$${vals.length+1}`); vals.push(d[k]); } });
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update', statusCode: 400 });
    vals.push(id);
    const { rows } = await query(`UPDATE appointments SET ${fields.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    return res.status(200).json({ success: true, message: 'Appointment updated', statusCode: 200, data: { appointment: rows[0] } });
  } catch (error) {
    logger.error('Update appointment error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to update appointment', statusCode: 500 });
  }
};

export const completeAppointment = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { actual_cost, payment_method, notes } = req.body;
    const { rows: appt } = await client.query('SELECT * FROM appointments WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (appt.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Appointment not found', statusCode: 404 }); }
    if (appt[0].status === 'completed') { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Appointment already completed', statusCode: 400 }); }
    const { rows: updated } = await client.query(
      `UPDATE appointments SET status='completed',completed_at=NOW(),notes=COALESCE($1,notes),updated_at=NOW() WHERE id=$2 RETURNING *`,
      [notes||null, id]);
    if (actual_cost !== undefined) {
      const { rows: existPay } = await client.query('SELECT id FROM payments WHERE appointment_id=$1', [id]);
      if (existPay.length > 0) {
        await client.query('UPDATE payments SET amount=$1,payment_method=$2,status=$3,paid_date=NOW(),updated_at=NOW() WHERE appointment_id=$4',
          [actual_cost, payment_method||'cash', 'paid', id]);
      } else {
        await client.query('INSERT INTO payments (id,appointment_id,patient_id,amount,payment_method,status,paid_date) VALUES ($1,$2,$3,$4,$5,$6,NOW())',
          [uuidv4(), id, appt[0].patient_id, actual_cost, payment_method||'cash', 'paid']);
      }
    }
    await client.query('COMMIT');
    logger.info('Appointment completed', { appointmentId: id });
    return res.status(200).json({ success: true, message: 'Appointment completed', statusCode: 200, data: { appointment: updated[0] } });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Complete appointment error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to complete appointment', statusCode: 500 });
  } finally { client.release(); }
};

export const markNoShow = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE appointments SET status='no-show',updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL AND status IN ('scheduled','in-chair') RETURNING *`,
      [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found or cannot be marked no-show', statusCode: 404 });
    return res.status(200).json({ success: true, message: 'Appointment marked as no-show', statusCode: 200, data: { appointment: rows[0] } });
  } catch (error) {
    logger.error('Mark no-show error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to mark no-show', statusCode: 500 });
  }
};

export const rescheduleAppointment = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { scheduled_time, reason } = req.body;
    if (!scheduled_time) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'New scheduled_time required', statusCode: 400 }); }
    const { rows: old } = await client.query('SELECT * FROM appointments WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (old.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Appointment not found', statusCode: 404 }); }
    await client.query(`UPDATE appointments SET status='rescheduled',reschedule_reason=$1,updated_at=NOW() WHERE id=$2`, [reason||null, id]);
    const newId = uuidv4();
    const { rows: newAppt } = await client.query(
      `INSERT INTO appointments (id,patient_id,treatment_id,scheduled_time,notes,status,created_by)
       VALUES ($1,$2,$3,$4,$5,'scheduled',$6) RETURNING *`,
      [newId, old[0].patient_id, old[0].treatment_id, scheduled_time, old[0].notes, req.user?.userId||null]);
    await client.query('COMMIT');
    logger.info('Appointment rescheduled', { oldId: id, newId });
    return res.status(201).json({ success: true, message: 'Appointment rescheduled', statusCode: 201, data: { appointment: newAppt[0] } });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Reschedule appointment error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to reschedule appointment', statusCode: 500 });
  } finally { client.release(); }
};

export const deleteAppointment = async (req, res) => {
  try {
    const { rows } = await query(`UPDATE appointments SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found', statusCode: 404 });
    return res.status(200).json({ success: true, message: 'Appointment deleted', statusCode: 200 });
  } catch (error) {
    logger.error('Delete appointment error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to delete appointment', statusCode: 500 });
  }
};

// Alias for route compatibility
export const getTodaysAppointments = getTodayAppointments;

export const getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'date is required', statusCode: 400 });
    // Return hourly slots from 09:00–17:00 (simplified — no doctor scheduling in DB)
    const slots = [];
    for (let h = 9; h < 18; h++) {
      slots.push({ time: `${String(h).padStart(2,'0')}:00`, available: true });
      slots.push({ time: `${String(h).padStart(2,'0')}:30`, available: true });
    }
    // Mark booked slots
    const { rows: booked } = await query(
      `SELECT scheduled_time FROM appointments WHERE DATE(scheduled_time)=$1 AND deleted_at IS NULL AND status NOT IN ('cancelled','no-show')`,
      [date]);
    booked.forEach(r => {
      const t = new Date(r.scheduled_time);
      const timeStr = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
      const slot = slots.find(s => s.time === timeStr);
      if (slot) slot.available = false;
    });
    return res.status(200).json({ success: true, message: 'Available slots retrieved', statusCode: 200, data: { date, slots } });
  } catch (error) {
    logger.error('Get available slots error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get available slots', statusCode: 500 });
  }
};

export const getOverdueFollowUps = async (req, res) => {
  try {
    // Return appointments that were completed but patient hasn't had a new appointment in 6+ months
    const { rows } = await query(
      `SELECT a.*, p.name AS patient_name, p.phone AS patient_phone, t.name AS treatment_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id=p.id
       LEFT JOIN treatments t ON a.treatment_id=t.id
       WHERE a.status='completed' AND a.deleted_at IS NULL
         AND a.completed_at < NOW() - INTERVAL '6 months'
         AND NOT EXISTS (
           SELECT 1 FROM appointments a2 WHERE a2.patient_id=a.patient_id
             AND a2.scheduled_time > a.completed_at AND a2.deleted_at IS NULL
         )
       ORDER BY a.completed_at ASC LIMIT 50`);
    return res.status(200).json({ success: true, message: 'Overdue follow-ups retrieved', statusCode: 200, data: { appointments: rows, count: rows.length } });
  } catch (error) {
    logger.error('Get overdue follow-ups error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get overdue follow-ups', statusCode: 500 });
  }
};

export default { getAllAppointments, getTodayAppointments, getTodaysAppointments, getAppointmentById, createAppointment, updateAppointment, completeAppointment, markNoShow, rescheduleAppointment, deleteAppointment, getAvailableSlots, getOverdueFollowUps };
