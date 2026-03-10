import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const getAllTreatments = async (req, res) => {
  try {
    const { rows: treatments } = await query(
      `SELECT id, name, base_cost, description, duration_minutes
       FROM treatments WHERE is_active = true ORDER BY name`
    );
    return res.status(200).json({ success: true, message: 'Treatments retrieved', statusCode: 200, data: { treatments } });
  } catch (error) {
    logger.error('Get treatments error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to get treatments', statusCode: 500 });
  }
};

export default { getAllTreatments };
