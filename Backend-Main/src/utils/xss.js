/**
 * XSS Protection - Sanitize user inputs
 * Escapes HTML special characters to prevent injection
 */

export const sanitizeHTML = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char]);
};

/**
 * Remove dangerous HTML tags and scripts
 */
export const stripHTML = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove script tags and content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove dangerous HTML tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>/gi, '');

  return sanitized.trim();
};

/**
 * Validate and sanitize text input
 */
export const sanitizeInput = (input, options = {}) => {
  const {
    maxLength = 500,
    allowHTML = false,
    trim = true,
  } = options;

  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  if (trim) {
    sanitized = sanitized.trim();
  }

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  if (!allowHTML) {
    sanitized = stripHTML(sanitized);
  }

  return sanitized;
};

export default {
  sanitizeHTML,
  stripHTML,
  sanitizeInput,
};
