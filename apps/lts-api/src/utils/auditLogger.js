import AuditLog from '../SuperadminPanel/AuditLogs/auditLogSchema.js';

/**
 * Creates a system audit log entry for security tracking
 * @param {Object} params
 * @param {string} params.user - User ID (e.g. 'ADM001', 'SUPER', 'TC014', 'VEN001')
 * @param {string} [params.userName] - Full Name of user/store
 * @param {string} [params.userRole] - Role of user ('SUPER_ADMIN', 'VENDOR', etc.)
 * @param {string} [params.actorType] - Actor category ('SUPER_ADMIN', 'VENDOR', 'TELECALLER', 'SYSTEM')
 * @param {string} params.action - Action description (e.g. 'Updated Customer', 'Exported CSV', 'Activated Telecaller')
 * @param {string} params.record - Target Record ID (e.g. 'CUST1023', 'VEN0092', 'HEHE2900')
 * @param {string} [params.module] - Module name
 * @param {string} [params.ipAddress] - Client IP
 * @param {string} [params.message] - Detailed message indicating who performed the update
 */
export const createAuditLog = async ({
  user = 'SUPER',
  userName = 'Super Admin',
  userRole = 'SUPER_ADMIN',
  actorType,
  action,
  record,
  module = 'General',
  ipAddress = '',
  message = '',
}) => {
  try {
    if (!action || !record) return null;

    const roleUpper = String(userRole || '').toUpperCase();
    const resolvedActorType =
      actorType ||
      (roleUpper.includes('VENDOR')
        ? 'VENDOR'
        : roleUpper.includes('TELECALLER')
        ? 'TELECALLER'
        : 'SUPER_ADMIN');

    const actorLabel =
      resolvedActorType === 'VENDOR'
        ? `Vendor: ${userName || user}`
        : resolvedActorType === 'TELECALLER'
        ? `Telecaller: ${userName || user}`
        : `Super Admin: ${userName || user}`;

    const autoMessage =
      message && message.trim()
        ? message.trim()
        : `${action} on [${record}] by ${actorLabel}`;

    const log = await AuditLog.create({
      user: user ? String(user).trim() : 'SUPER',
      userName: userName ? String(userName).trim() : 'Super Admin',
      userRole: userRole ? String(userRole).trim() : 'SUPER_ADMIN',
      actorType: resolvedActorType,
      action: String(action).trim(),
      record: String(record).trim(),
      module: String(module).trim(),
      ipAddress: ipAddress ? String(ipAddress).trim() : '',
      message: autoMessage,
      timestamp: new Date(),
    });

    return log;
  } catch (error) {
    console.error('Failed to record audit log entry:', error.message);
    return null;
  }
};
