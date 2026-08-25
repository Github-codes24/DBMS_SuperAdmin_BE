import AuditLog from './auditLogSchema.js';
import { generateCSVData, generateHTMLPDFReport } from '../../utils/excelCsvHandler.js';

// Format Date object to HH:mm (e.g. 10:21, 10:31, 11:05) for UI table
const formatTimeHHMM = (dateObj) => {
  if (!dateObj) return '';
  const date = new Date(dateObj);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// GET ALL AUDIT LOGS DIRECTORY
// @desc    Get All System Audit Logs (Search, Filter, Pagination)
// @route   GET /api/v1/superadmin/audit-logs
// @access  Private (SuperAdmin)
export const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, user, action, module } = req.query;

    const query = {};

    // Search filter across user, action, record, module, userName
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { user: searchRegex },
        { action: searchRegex },
        { record: searchRegex },
        { module: searchRegex },
        { userName: searchRegex },
      ];
    }

    if (user && user.trim()) {
      query.user = new RegExp(user.trim(), 'i');
    }

    if (action && action.trim()) {
      query.action = new RegExp(action.trim(), 'i');
    }

    if (module && module.trim()) {
      query.module = new RegExp(module.trim(), 'i');
    }

    const totalLogs = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Map logs to format UI specific TIME column ('10:21', '10:31'...) along with full date
    const formattedLogs = logs.map((log) => {
      const obj = log.toObject();
      obj.time = formatTimeHHMM(log.timestamp);
      obj.fullDateTime = new Date(log.timestamp).toLocaleString();
      return obj;
    });

    res.json({
      totalLogs,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: page,
      limit,
      logs: formattedLogs,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// EXPORT AUDIT LOGS TO CSV (.csv)
// @desc    Export Audit Logs to CSV Format (.csv)
// @route   GET /api/v1/superadmin/audit-logs/export/csv
// @access  Private (SuperAdmin)
export const exportAuditLogsCSV = async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 });

    const headers = ['Time', 'User', 'Action', 'Record', 'Module', 'Date & Time', 'IP Address'];

    const rowsData = logs.map((log) => [
      formatTimeHHMM(log.timestamp),
      log.user || '',
      log.action || '',
      log.record || '',
      log.module || 'General',
      new Date(log.timestamp).toLocaleString(),
      log.ipAddress || '-',
    ]);

    const csvContent = generateCSVData(headers, rowsData);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Audit_Logs.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error during CSV export', error: error.message });
  }
};

// EXPORT AUDIT LOGS TO PDF REPORT
// @desc    Export Audit Logs to PDF Format (Report view)
// @route   GET /api/v1/superadmin/audit-logs/export/pdf
// @access  Private (SuperAdmin)
export const exportAuditLogsPDF = async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 });

    const headers = ['TIME', 'USER', 'ACTION', 'RECORD', 'MODULE', 'DATE & TIME'];

    const tableRowsHtml = logs
      .map((log) => {
        const timeStr = formatTimeHHMM(log.timestamp);
        const fullDateStr = new Date(log.timestamp).toLocaleString();
        return `
        <tr>
          <td><strong>${timeStr}</strong></td>
          <td><strong style="color: #ea580c;">${log.user}</strong></td>
          <td>${log.action}</td>
          <td><strong>${log.record}</strong></td>
          <td>${log.module || 'General'}</td>
          <td>${fullDateStr}</td>
        </tr>`;
      })
      .join('');

    const pdfHtmlReport = generateHTMLPDFReport(
      'Audit Logs & Security Trail Report',
      'Track important system actions & security trails',
      headers,
      tableRowsHtml,
      logs.length
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="Audit_Logs_Report.pdf"');
    res.status(200).send(pdfHtmlReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error during PDF export', error: error.message });
  }
};
