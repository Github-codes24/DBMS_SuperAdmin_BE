/**
 * Telecaller CRM — Response Helper
 * Provides consistent success/error response formats across all controllers.
 */
/**
 * Send a standardised success response.
 * @param {object} res - Express response object
 * @param {string} message - Human-readable success message
 * @param {object|array} data - Payload to return
 * @param {number} [statusCode=200] - HTTP status code
 */
export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Send a standardised error response.
 * @param {object} res - Express response object
 * @param {string} message - Human-readable error message
 * @param {number} [statusCode=400] - HTTP status code
 */
export const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};
