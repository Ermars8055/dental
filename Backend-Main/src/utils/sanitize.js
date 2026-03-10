/**
 * Sanitize search input to prevent SQL injection
 * Escapes special characters used in SQL and Supabase queries
 */
export const sanitizeSearchInput = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove leading/trailing whitespace
  let sanitized = input.trim();

  // Limit length to prevent performance issues
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  // Escape special characters that could be used in SQL injection
  // In Supabase ilike queries, we need to escape %, _, and \
  sanitized = sanitized
    .replace(/\\/g, '\\\\') // Escape backslash first
    .replace(/%/g, '\\%') // Escape percent
    .replace(/_/g, '\\_'); // Escape underscore

  return sanitized;
};

/**
 * Validate and sanitize numeric parameters
 */
export const sanitizeNumeric = (value, defaultValue = 1, min = 1, max = 1000) => {
  const num = parseInt(value, 10);

  // Check if parsed value is valid number
  if (isNaN(num) || !Number.isInteger(num)) {
    return defaultValue;
  }

  // Apply bounds
  if (num < min) return min;
  if (num > max) return max;

  return num;
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format (international)
 */
export const validatePhone = (phone) => {
  // Must start with + and contain 7+ digits
  const phoneRegex = /^\+\d{7,}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDate = (date) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
};

/**
 * Validate ISO datetime format and ensure it's in the future
 */
export const validateAppointmentDateTime = (dateString, minMinutesInFuture = 30) => {
  try {
    const appointmentDate = new Date(dateString);
    const now = new Date();

    // Check valid date
    if (isNaN(appointmentDate.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    // Check if appointment is in the future
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const minutesInFuture = timeDiff / (1000 * 60);

    if (minutesInFuture < minMinutesInFuture) {
      return {
        valid: false,
        error: `Appointment must be at least ${minMinutesInFuture} minutes in the future`,
      };
    }

    // Check if appointment is not too far in the future (e.g., not more than 1 year)
    const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (appointmentDate > maxDate) {
      return { valid: false, error: 'Appointment cannot be more than 1 year in the future' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid date format' };
  }
};

/**
 * Validate and sanitize UUID format
 */
export const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate positive amount for payments/expenses
 */
export const validateAmount = (amount) => {
  const num = parseFloat(amount);

  if (isNaN(num)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  if (num > 1000000) {
    // Prevent absurdly large amounts
    return { valid: false, error: 'Amount exceeds maximum allowed value' };
  }

  return { valid: true, value: num };
};

/**
 * Validate appointment status value
 */
export const validateAppointmentStatus = (status) => {
  const validStatuses = ['scheduled', 'in-chair', 'completed', 'no-show', 'cancelled'];
  return validStatuses.includes(status);
};

/**
 * Validate payment status value
 */
export const validatePaymentStatus = (status) => {
  const validStatuses = ['pending', 'partial', 'paid', 'overdue', 'cancelled'];
  return validStatuses.includes(status);
};

/**
 * Validate and sanitize enum values
 */
export const validateEnum = (value, allowedValues) => {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid value. Must be one of: ${allowedValues.join(', ')}`,
    };
  }
  return { valid: true };
};

export default {
  sanitizeSearchInput,
  sanitizeNumeric,
  validateEmail,
  validatePhone,
  validateDate,
  validateAppointmentDateTime,
  validateUUID,
  validateAmount,
  validateAppointmentStatus,
  validatePaymentStatus,
  validateEnum,
};
