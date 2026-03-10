import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const getSettings = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM clinic_settings LIMIT 1');
    return res.json({ success: true, statusCode: 200, data: { settings: rows[0] || null } });
  } catch (e) { logger.error('getSettings', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get settings' }); }
};

export const updateSettings = async (req, res) => {
  try {
    const { rows: ex } = await query('SELECT id FROM clinic_settings LIMIT 1');
    const d = req.body; const fields = [], vals = [];
    const allowed = ['clinic_name','clinic_phone','clinic_email','clinic_address','working_hours_start','working_hours_end','lunch_start','lunch_end','default_appointment_duration','currency','settings_json'];
    allowed.forEach(k => { if (d[k]!==undefined) { fields.push(`${k}=$${vals.length+1}`); vals.push(d[k]); } });
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    let result;
    if (!ex.length) {
      const id = uuidv4();
      const cols = ['id', ...allowed.filter(k => d[k]!==undefined)];
      const colVals = [id, ...allowed.filter(k => d[k]!==undefined).map(k => d[k])];
      const { rows } = await query(`INSERT INTO clinic_settings (${cols.join(',')}) VALUES (${colVals.map((_,i)=>`$${i+1}`).join(',')}) RETURNING *`, colVals);
      result = rows[0];
    } else {
      vals.push(ex[0].id);
      const { rows } = await query(`UPDATE clinic_settings SET ${fields.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
      result = rows[0];
    }
    return res.json({ success: true, statusCode: 200, data: { settings: result } });
  } catch (e) { logger.error('updateSettings', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to update settings' }); }
};

export const getBreaks = async (req, res) => {
  try {
    const { rows: breaks } = await query('SELECT * FROM break_schedules ORDER BY start_time ASC');
    return res.json({ success: true, statusCode: 200, data: { breaks } });
  } catch (e) { logger.error('getBreaks', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get breaks' }); }
};

export const addBreak = async (req, res) => {
  try {
    const { start_time, end_time, label, day_of_week } = req.body;
    if (!start_time || !end_time) return res.status(400).json({ success: false, message: 'start_time and end_time are required' });
    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO break_schedules (id,start_time,end_time,label,day_of_week) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, start_time, end_time, label||'Break', day_of_week||null]);
    return res.status(201).json({ success: true, statusCode: 201, data: { break: rows[0] } });
  } catch (e) { logger.error('addBreak', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to add break' }); }
};

export const deleteBreak = async (req, res) => {
  try {
    const { rows } = await query('DELETE FROM break_schedules WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Break not found' });
    return res.json({ success: true, statusCode: 200, message: 'Break deleted' });
  } catch (e) { logger.error('deleteBreak', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to delete break' }); }
};

export const getNotificationStatus = async (req, res) => {
  try {
    const { rows } = await query('SELECT settings_json FROM clinic_settings LIMIT 1');
    const settingsJson = rows[0]?.settings_json || {};
    const notifications = typeof settingsJson === 'string' ? JSON.parse(settingsJson) : settingsJson;
    return res.json({ success: true, statusCode: 200, data: { notifications: notifications.notifications || { email: true, sms: false, whatsapp: false } } });
  } catch (e) { logger.error('getNotificationStatus', { error: e.message }); return res.status(500).json({ success: false, message: 'Failed to get notification status' }); }
};

export default { getSettings, updateSettings, getBreaks, addBreak, deleteBreak, getNotificationStatus };
