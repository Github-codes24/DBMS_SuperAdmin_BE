import XLSX from 'xlsx';

/**
 * Reusable Excel / CSV Helper Utilities for LTS-DBMS
 * Supports Excel file buffer parsing, Duplicate Filtering, CSV Export Generation, and Printable PDF/HTML Report Generation
 */

/**
 * Parses uploaded Excel (.xlsx, .xls, .csv, .ods) buffer into an array of JSON objects
 * @param {Buffer} buffer - File buffer from req.file.buffer
 * @returns {Array<Object>} - Array of row objects with clean headers
 */
export const parseExcelOrCsvBuffer = (buffer) => {
  if (!buffer || buffer.length === 0) return [];
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd' });
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) return [];

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to JSON array of objects
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    // Sanitize and trim column header keys for exact matching
    return rawRows.map((row) => {
      const cleanRow = {};
      Object.keys(row).forEach((key) => {
        if (key && key.trim()) {
          cleanRow[key.trim()] = row[key];
        }
      });
      return cleanRow;
    });
  } catch (err) {
    console.error('Error parsing Excel/CSV file buffer:', err.message);
    return [];
  }
};

/**
 * Filters out duplicate records from incoming import payload against existing DB keys and payload duplicates.
 * @param {Array} records - Incoming payload array of objects
 * @param {Set} existingKeysSet - Set of existing composite keys in Database
 * @param {Function} keyExtractorFn - Callback function returning composite key for each record
 * @returns {Object} - { uniqueRecords, skippedDuplicatesCount }
 */
export const filterUniqueRecords = (records = [], existingKeysSet = new Set(), keyExtractorFn) => {
  const uniqueRecords = [];
  let skippedDuplicatesCount = 0;
  const seenInBatchSet = new Set();

  for (const item of records) {
    if (!item) {
      skippedDuplicatesCount++;
      continue;
    }

    const key = keyExtractorFn(item);
    if (!key) {
      skippedDuplicatesCount++;
      continue;
    }

    const normalizedKey = key.toString().toLowerCase().trim();

    if (existingKeysSet.has(normalizedKey) || seenInBatchSet.has(normalizedKey)) {
      skippedDuplicatesCount++;
    } else {
      seenInBatchSet.add(normalizedKey);
      uniqueRecords.push(item);
    }
  }

  return {
    uniqueRecords,
    skippedDuplicatesCount,
  };
};

/**
 * Generates RFC-4180 compliant CSV string from headers and data rows
 * @param {Array<String>} headers - List of CSV column header titles
 * @param {Array<Array>} rowsData - Matrix of row cell values
 * @returns {String} - CSV formatted string
 */
export const generateCSVData = (headers = [], rowsData = []) => {
  const headerLine = headers.map((h) => `"${(h || '').toString().replace(/"/g, '""')}"`).join(',');

  const dataLines = rowsData.map((row) =>
    row.map((cell) => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(',')
  );

  return [headerLine, ...dataLines].join('\n');
};

/**
 * Generates styled HTML document report for PDF printing / export
 * @param {String} title - Report title
 * @param {String} subtitle - Report subtitle description
 * @param {Array<String>} headers - Table column titles
 * @param {String} tableRowsHtml - Pre-formatted HTML table rows
 * @param {Number} totalCount - Total records count
 * @returns {String} - HTML Document string
 */
export const generateHTMLPDFReport = (title, subtitle, headers, tableRowsHtml, totalCount) => {
  const thHeadersHtml = headers.map((h) => `<th>${h}</th>`).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
      h1 { color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 8px; margin-bottom: 5px; }
      .subtitle { color: #666; font-size: 14px; margin-bottom: 15px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
      th, td { border: 1px solid #e5e7eb; padding: 9px 10px; text-align: left; }
      th { background-color: #f9fafb; font-weight: 600; color: #374151; text-transform: uppercase; font-size: 12px; }
      tr:nth-child(even) { background-color: #f8fafc; }
      .footer { margin-top: 25px; font-size: 12px; color: #9ca3af; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="subtitle">${subtitle} | Total Records: ${totalCount}</div>
    <table>
      <thead>
        <tr>
          ${thHeadersHtml}
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
    <div class="footer">Generated on ${new Date().toLocaleString()}</div>
  </body>
  </html>`;
};
