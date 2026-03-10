import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { sanitizeSearchInput, sanitizeNumeric } from '../utils/sanitize.js';
import { sanitizeInput } from '../utils/xss.js';

export const getAllPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const p = sanitizeNumeric(page, 1, 1, 10000);
    const l = sanitizeNumeric(limit, 10, 1, 100);
    const offset = (p - 1) * l;
    let baseQ = 'FROM patients WHERE deleted_at IS NULL';
    const params = [];
    if (search) {
      const s = sanitizeSearchInput(search);
      params.push(`%${s}%`);
      baseQ += ` AND (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`;
    }
    const { rows: countRows } = await query(`SELECT COUNT(*) ${baseQ}`, params);
    const total = parseInt(countRows[0].count);
    const dataParams = [...params, l, offset];
    const { rows: patients } = await query(`SELECT * ${baseQ} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, dataParams);
    return res.status(200).json({ success: true, message: 'Patients retrieved', statusCode: 200, data: { patients, pagination: { page: p, limit: l, total, pages: Math.ceil(total/l) } } });
  } catch (error) {
    logger.error('Get all patients error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get patients', statusCode: 500 });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM patients WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found', statusCode: 404 });
    return res.status(200).json({ success: true, message: 'Patient retrieved', statusCode: 200, data: { patient: rows[0] } });
  } catch (error) {
    logger.error('Get patient by ID error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get patient', statusCode: 500 });
  }
};

export const searchPatients = async (req, res) => {
  try {
    const { query: q, limit = 10 } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters', statusCode: 400 });
    const s = sanitizeSearchInput(q);
    const l = sanitizeNumeric(limit, 10, 1, 100);
    const { rows: patients } = await query(
      `SELECT id,name,phone,email,gender,city FROM patients WHERE (name ILIKE $1 OR phone ILIKE $1) AND deleted_at IS NULL LIMIT $2`,
      [`%${s}%`, l]
    );
    return res.status(200).json({ success: true, message: 'Search results', statusCode: 200, data: { patients, count: patients.length } });
  } catch (error) {
    logger.error('Search patients error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to search patients', statusCode: 500 });
  }
};

export const createPatient = async (req, res) => {
  try {
    const { name, phone, email, dob, gender, address, city, emergency_contact, emergency_phone, allergies = [], notes, preferred_time_slot, preferred_payment_method, preferred_appointment_duration } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone are required', statusCode: 400 });
    const sName = sanitizeInput(name, { maxLength: 100 });
    const sPhone = sanitizeInput(phone, { maxLength: 20 });
    const { rows: existing } = await query('SELECT id FROM patients WHERE phone=$1', [sPhone]);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Patient with this phone number already exists', statusCode: 409 });
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO patients (id,name,phone,email,dob,gender,address,city,emergency_contact,emergency_phone,allergies,notes,preferred_time_slot,preferred_payment_method,preferred_appointment_duration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [id, sName, sPhone, email||null, dob||null, gender||null, address||null, city||null, emergency_contact||null, emergency_phone||null, JSON.stringify(Array.isArray(allergies)?allergies:[]), notes||null, preferred_time_slot||null, preferred_payment_method||null, preferred_appointment_duration||null]
    );
    logger.info('Patient created', { patientId: id });
    return res.status(201).json({ success: true, message: 'Patient created successfully', statusCode: 201, data: { patient: rows[0] } });
  } catch (error) {
    logger.error('Create patient error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to create patient', statusCode: 500 });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: existing } = await query('SELECT id FROM patients WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Patient not found', statusCode: 404 });
    const d = req.body;
    if (d.phone) {
      const { rows: ph } = await query('SELECT id FROM patients WHERE phone=$1 AND id!=$2', [d.phone, id]);
      if (ph.length > 0) return res.status(409).json({ success: false, message: 'Another patient with this phone already exists', statusCode: 409 });
    }
    const fields = []; const vals = [];
    const allowed = ['name','phone','email','dob','gender','address','city','emergency_contact','emergency_phone','notes','preferred_time_slot','preferred_payment_method','preferred_appointment_duration','allergies'];
    allowed.forEach(k => { if (d[k] !== undefined) { fields.push(`${k}=$${vals.length+1}`); vals.push(d[k]); } });
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update', statusCode: 400 });
    vals.push(id);
    const { rows } = await query(`UPDATE patients SET ${fields.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    return res.status(200).json({ success: true, message: 'Patient updated', statusCode: 200, data: { patient: rows[0] } });
  } catch (error) {
    logger.error('Update patient error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to update patient', statusCode: 500 });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query('UPDATE patients SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found', statusCode: 404 });
    return res.status(200).json({ success: true, message: 'Patient deleted', statusCode: 200 });
  } catch (error) {
    logger.error('Delete patient error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to delete patient', statusCode: 500 });
  }
};

export const getPatientHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: pat } = await query('SELECT id FROM patients WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (pat.length === 0) return res.status(404).json({ success: false, message: 'Patient not found', statusCode: 404 });
    const { rows: appointments } = await query(
      `SELECT a.id,a.scheduled_time,a.status,a.notes,a.completed_at,
              t.name as treatment_name,t.description as treatment_description,t.base_cost,
              p.amount as payment_amount,p.status as payment_status,p.payment_method,p.paid_date
       FROM appointments a
       LEFT JOIN treatments t ON a.treatment_id=t.id
       LEFT JOIN payments p ON p.appointment_id=a.id
       WHERE a.patient_id=$1 AND a.deleted_at IS NULL
       ORDER BY a.scheduled_time DESC`, [id]
    );
    return res.status(200).json({ success: true, message: 'Patient history retrieved', statusCode: 200, data: { history: appointments, totalAppointments: appointments.length } });
  } catch (error) {
    logger.error('Get patient history error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get patient history', statusCode: 500 });
  }
};

export const getPatientAppointments = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, limit = 10 } = req.query;
    const { rows: pat } = await query('SELECT id FROM patients WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (pat.length === 0) return res.status(404).json({ success: false, message: 'Patient not found', statusCode: 404 });
    let sql = `SELECT a.id,a.scheduled_time,a.status,a.notes,t.id as treatment_id,t.name as treatment_name,t.base_cost,p.amount,p.status as payment_status,p.payment_method
               FROM appointments a LEFT JOIN treatments t ON a.treatment_id=t.id LEFT JOIN payments p ON p.appointment_id=a.id
               WHERE a.patient_id=$1 AND a.deleted_at IS NULL`;
    const params = [id];
    if (status) { params.push(status); sql += ` AND a.status=$${params.length}`; }
    params.push(parseInt(limit));
    sql += ` ORDER BY a.scheduled_time DESC LIMIT $${params.length}`;
    const { rows: appointments } = await query(sql, params);
    return res.status(200).json({ success: true, message: 'Patient appointments retrieved', statusCode: 200, data: { appointments, count: appointments.length } });
  } catch (error) {
    logger.error('Get patient appointments error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get patient appointments', statusCode: 500 });
  }
};

export default { getAllPatients, getPatientById, searchPatients, createPatient, updatePatient, deletePatient, getPatientHistory, getPatientAppointments };
