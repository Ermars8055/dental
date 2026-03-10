import { validationResult } from 'express-validator';

/**
 * Validation result handler middleware
 * Checks for validation errors and returns them if any exist
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      statusCode: 400,
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
};

export default {
  handleValidationErrors,
};
