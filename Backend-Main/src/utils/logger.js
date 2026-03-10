const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const LOG_LEVEL_NUMBERS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLogLevel = LOG_LEVEL_NUMBERS[process.env.LOG_LEVEL || 'INFO'];

const formatMessage = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const dataStr = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
  return `[${timestamp}] [${level}] ${message} ${dataStr}`;
};

export const logger = {
  error: (message, data) => {
    if (LOG_LEVEL_NUMBERS[LOG_LEVELS.ERROR] <= currentLogLevel) {
      console.error(formatMessage(LOG_LEVELS.ERROR, message, data));
    }
  },

  warn: (message, data) => {
    if (LOG_LEVEL_NUMBERS[LOG_LEVELS.WARN] <= currentLogLevel) {
      console.warn(formatMessage(LOG_LEVELS.WARN, message, data));
    }
  },

  info: (message, data) => {
    if (LOG_LEVEL_NUMBERS[LOG_LEVELS.INFO] <= currentLogLevel) {
      console.log(formatMessage(LOG_LEVELS.INFO, message, data));
    }
  },

  debug: (message, data) => {
    if (LOG_LEVEL_NUMBERS[LOG_LEVELS.DEBUG] <= currentLogLevel) {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, data));
    }
  },
};

export default logger;
