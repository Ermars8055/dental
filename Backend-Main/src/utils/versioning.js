/**
 * Optimistic locking utilities to prevent concurrent update race conditions
 * Uses version fields to detect and prevent lost updates
 */

import { supabase } from '../config/supabase.js';
import { logger } from './logger.js';

/**
 * Update record with optimistic lock (version checking)
 * Only updates if version matches, returns conflict error if versions don't match
 */
export const updateWithVersion = async (table, id, updateData, expectedVersion) => {
  try {
    // Include version increment in the update
    const dataToUpdate = {
      ...updateData,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    };

    // Only update if version matches (optimistic lock)
    const { data, error } = await supabase
      .from(table)
      .update(dataToUpdate)
      .eq('id', id)
      .eq('version', expectedVersion) // Version must match
      .select()
      .single();

    if (error) {
      logger.error(`Optimistic lock error for ${table}`, { error: error.message, id });
      throw error;
    }

    if (!data) {
      // No rows updated means version mismatch
      logger.warn(`Version mismatch for ${table}`, { id, expectedVersion });
      throw new Error('Concurrent update detected - record has been modified');
    }

    logger.info(`Record updated with version increment`, {
      table,
      id,
      newVersion: expectedVersion + 1,
    });

    return data;
  } catch (error) {
    if (error.message.includes('Concurrent update')) {
      throw error; // Re-throw conflict error
    }
    logger.error(`Update with version failed for ${table}`, { error: error.message });
    throw error;
  }
};

/**
 * Fetch record with current version for safe updates
 */
export const fetchWithVersion = async (table, id) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*, version')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error(`Record not found: ${id}`);
    }

    return {
      record: data,
      version: data.version || 0,
    };
  } catch (error) {
    logger.error(`Failed to fetch record with version from ${table}`, { error: error.message });
    throw error;
  }
};

/**
 * Safe update workflow:
 * 1. Fetch record with version
 * 2. Make updates
 * 3. Try to update with version check
 * 4. Retry if version conflict
 */
export const safeUpdate = async (table, id, updateFn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Fetch current version
      const { record, version } = await fetchWithVersion(table, id);

      // Apply user's update logic
      const updatedData = await updateFn(record);

      // Try to update with version check
      const result = await updateWithVersion(table, id, updatedData, version);

      logger.info('Safe update succeeded', { table, id, attempt });
      return result;
    } catch (error) {
      if (error.message.includes('Concurrent update') && attempt < maxRetries) {
        logger.warn(`Concurrent update detected, retrying (${attempt}/${maxRetries})`, { table, id });
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }

      logger.error('Safe update failed', { table, id, error: error.message });
      throw error;
    }
  }

  throw new Error(`Failed to update ${table}:${id} after ${maxRetries} retries`);
};

/**
 * Batch update with version checking
 * Updates multiple records while ensuring no concurrent modifications
 */
export const batchUpdateWithVersion = async (table, updates) => {
  const results = [];
  const errors = [];

  for (const { id, data, version } of updates) {
    try {
      const result = await updateWithVersion(table, id, data, version);
      results.push(result);
    } catch (error) {
      errors.push({ id, error: error.message });
    }
  }

  if (errors.length > 0) {
    logger.warn('Some batch updates failed', { table, errors });
  }

  return { results, errors, success: errors.length === 0 };
};

/**
 * Increment counter safely (useful for visit counts, etc.)
 */
export const incrementField = async (table, id, field, amount = 1) => {
  try {
    // Get current value
    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select(`${field}, version`)
      .eq('id', id)
      .single();

    if (fetchError || !record) {
      throw new Error('Record not found');
    }

    const currentValue = record[field] || 0;
    const newValue = currentValue + amount;

    // Update with version check
    const { data, error } = await supabase
      .from(table)
      .update({
        [field]: newValue,
        version: (record.version || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('version', record.version || 0)
      .select()
      .single();

    if (error || !data) {
      throw new Error('Concurrent modification detected');
    }

    logger.info('Field incremented safely', {
      table,
      id,
      field,
      newValue,
    });

    return data;
  } catch (error) {
    logger.error(`Failed to increment ${field}`, { error: error.message });
    throw error;
  }
};

/**
 * Add version field to a record if not present
 * Used during initialization for records that don't have version field yet
 */
export const initializeVersion = async (table, id, initialVersion = 0) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .update({ version: initialVersion })
      .eq('id', id)
      .is('version', null) // Only update if version is null
      .select()
      .single();

    if (error) {
      logger.warn(`Could not initialize version for ${table}:${id}`, { error: error.message });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Version initialization failed', { error: error.message });
    throw error;
  }
};

export default {
  updateWithVersion,
  fetchWithVersion,
  safeUpdate,
  batchUpdateWithVersion,
  incrementField,
  initializeVersion,
};
