import AuditLog from '../SuperadminPanel/AuditLogs/auditLogSchema.js';

/**
 * Creates a system audit log entry for security tracking
 * @param {Object} params
 * @param {string} params.user - User ID (e.g. 'ADM001', 'SUPER', 'TC014')
 * @param {string} [params.userName] - Full Name of user
 * @param {string} [params.userRole] - Role of user
 * @param {string} params.action - Action description (e.g. 'Updated Customer', 'Exported CSV')
 * @param {string} params.record - Target Record ID (e.g. 'CUST1023', 'VEN0092')
 * @param {string} [params.module] - Module name
 * @param {string} [params.ipAddress] - Client IP
 */
export const createAuditLog = async ({
  user = 'SUPER',
  userName = 'Super Admin',
  userRole = 'SUPER_ADMIN',
  action,
  record,
  module = 'General',
  ipAddress = '',
}) => {
  try {
    if (!action || !record) return null;

    const log = await AuditLog.create({
      user: user ? user.trim() : 'SUPER',
      userName: userName ? userName.trim() : 'Super Admin',
      userRole: userRole ? userRole.trim() : 'SUPER_ADMIN',
      action: action.trim(),
      record: record.trim(),
      module: module.trim(),
      ipAddress: ipAddress ? ipAddress.trim() : '',
      timestamp: new Date(),
    });

    return log;
  } catch (error) {
    console.error('Failed to record audit log entry:', error.message);
    return null;
  }
};
