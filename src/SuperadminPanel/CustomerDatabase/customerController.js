import mongoose from 'mongoose';
import Customer from './customerSchema.js';
import {
  filterUniqueRecords,
  generateCSVData,
  generateHTMLPDFReport,
} from '../../utils/excelCsvHandler.js';

// Helper to generate auto-increment Customer ID (CUST001, CUST002...)
const generateCustomerId = async () => {
  const lastCustomer = await Customer.findOne({ customerId: /^CUST/ })
    .sort({ createdAt: -1 })
    .exec();

  let nextNumber = 1;
  if (lastCustomer && lastCustomer.customerId) {
    const numericPart = parseInt(lastCustomer.customerId.replace('CUST', ''), 10);
    if (!isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }

  return `CUST${nextNumber.toString().padStart(3, '0')}`;
};

// Normalize status string for consistent formatting
const normalizeStatus = (statusStr) => {
  if (!statusStr) return 'Active';
  const str = statusStr.toString().trim().toLowerCase();
  if (str === 'pending') return 'Pending';
  return 'Active';
};


// GET ALL CUSTOMERS DIRECTORY
// @desc    Get All Customers Directory (Search, Filter, Pagination)
// @route   GET /api/v1/superadmin/customers
// @access  Private (SuperAdmin)
export const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, status, state, city } = req.query;

    const query = { isDeleted: false };

    // Search filter across name, companyName, state, city, pincode, customerId
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { companyName: searchRegex },
        { state: searchRegex },
        { city: searchRegex },
        { pincode: searchRegex },
        { customerId: searchRegex },
      ];
    }

    if (status && status.trim()) {
      query.status = normalizeStatus(status);
    }

    if (state && state.trim()) {
      query.state = new RegExp(state.trim(), 'i');
    }

    if (city && city.trim()) {
      query.city = new RegExp(city.trim(), 'i');
    }

    const totalCustomers = await Customer.countDocuments(query);

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.json({
      totalCustomers,
      totalPages: Math.ceil(totalCustomers / limit),
      currentPage: page,
      limit,
      customers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// CREATE SINGLE CUSTOMER RECORD
// @desc    Create Single Customer Record (Manual "+ Add Customer")
// @route   POST /api/v1/superadmin/customers
// @access  Private (SuperAdmin)
export const createCustomer = async (req, res) => {
  const {
    srNo,
    name,
    companyName,
    state,
    city,
    pincode,
    registrationDate,
    status = 'Active',
    assignedTelecaller,
  } = req.body;

  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Customer Name is required' });
    }

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ message: 'Company Name is required' });
    }

    const customerId = await generateCustomerId();

    // Auto srNo if not provided
    let calculatedSrNo = srNo;
    if (!calculatedSrNo) {
      const count = await Customer.countDocuments({ isDeleted: false });
      calculatedSrNo = (count + 1).toString().padStart(2, '0');
    }

    const customer = await Customer.create({
      customerId,
      srNo: calculatedSrNo,
      name: name.trim(),
      companyName: companyName.trim(),
      state: state ? state.trim() : '',
      city: city ? city.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      registrationDate: registrationDate ? new Date(registrationDate) : new Date(),
      status: normalizeStatus(status),
      assignedTelecaller: assignedTelecaller ? assignedTelecaller.trim() : '',
      createdBy: req.superAdmin._id,
    });

    res.status(201).json({
      message: 'Customer record created successfully',
      customer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE CUSTOMER RECORD (STATUS RULES ENFORCED)
// @desc    Update Customer Record & Status Rules
// @route   PATCH /api/v1/superadmin/customers/:id
// @access  Private (SuperAdmin)
export const updateCustomer = async (req, res) => {
  const { id } = req.params;

  try {
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id, isDeleted: false }
      : { customerId: id.trim(), isDeleted: false };

    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    const {
      srNo,
      name,
      companyName,
      state,
      city,
      pincode,
      registrationDate,
      status,
      assignedTelecaller,
    } = req.body;

    // BUSINESS RULE: Status Transition Protection
    // Pending -> Active is ALLOWED. Active -> Pending is STRICTLY PROHIBITED.
    if (status !== undefined) {
      const currentNormalized = normalizeStatus(customer.status);
      const incomingNormalized = normalizeStatus(status);

      if (currentNormalized === 'Active' && incomingNormalized === 'Pending') {
        return res.status(400).json({
          message: 'Status Transition Error: Cannot change status from Active back to Pending',
        });
      }
      customer.status = incomingNormalized;
    }

    if (name) customer.name = name.trim();
    if (companyName) customer.companyName = companyName.trim();
    if (state !== undefined) customer.state = state.trim();
    if (city !== undefined) customer.city = city.trim();
    if (pincode !== undefined) customer.pincode = pincode.trim();
    if (registrationDate) customer.registrationDate = new Date(registrationDate);
    if (assignedTelecaller !== undefined) customer.assignedTelecaller = assignedTelecaller.trim();
    if (srNo !== undefined) customer.srNo = srNo;

    customer.updatedBy = req.superAdmin._id;
    await customer.save();

    res.json({
      message: 'Customer record updated successfully',
      customer,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// BULK IMPORT CUSTOMERS (REUSABLE UTILITY INTEGRATION)
// @desc    Bulk Import Customers from Excel / CSV Data (50MB Limit & Duplicate Check)
// @route   POST /api/v1/superadmin/customers/import
// @access  Private (SuperAdmin)
export const importCustomers = async (req, res) => {
  const { customers } = req.body; // Array of parsed records from Excel/CSV

  try {
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ message: 'Please provide a non-empty array of customer records to import' });
    }

    // Fetch existing customer keys for duplicate checking
    const existingRecords = await Customer.find({ isDeleted: false }).select('customerId name companyName');
    const existingKeysSet = new Set(
      existingRecords.map((r) => `${r.name.toLowerCase().trim()}_${r.companyName.toLowerCase().trim()}`)
    );

    // Use reusable filterUniqueRecords utility
    const { uniqueRecords, skippedDuplicatesCount } = filterUniqueRecords(
      customers,
      existingKeysSet,
      (item) => {
        const name = (item.name || item.CustomerName || '').toString().trim();
        const companyName = (item.companyName || item.CompanyName || '').toString().trim();
        if (!name || !companyName) return null;
        return `${name}_${companyName}`;
      }
    );

    if (uniqueRecords.length === 0) {
      return res.status(400).json({
        message: 'No new unique records found to import. All entries in the file already exist in the database.',
        importedCount: 0,
        skippedDuplicatesCount: customers.length,
      });
    }

    // Determine starting numeric part for custom CUSTxxx ID generation
    const currentLastCustomer = await Customer.findOne({ customerId: /^CUST/ })
      .sort({ createdAt: -1 })
      .exec();

    let startNum = 1;
    if (currentLastCustomer && currentLastCustomer.customerId) {
      const numericPart = parseInt(currentLastCustomer.customerId.replace('CUST', ''), 10);
      if (!isNaN(numericPart)) {
        startNum = numericPart + 1;
      }
    }

    const totalExisting = await Customer.countDocuments({ isDeleted: false });

    const newCustomerEntries = uniqueRecords.map((c, index) => {
      const customerId = `CUST${(startNum + index).toString().padStart(3, '0')}`;
      const srNo = c.srNo || (totalExisting + index + 1).toString().padStart(2, '0');

      return {
        customerId,
        srNo,
        name: (c.name || c.CustomerName || 'Unnamed Customer').toString().trim(),
        companyName: (c.companyName || c.CompanyName || 'Independent').toString().trim(),
        state: (c.state || c.State || '').toString().trim(),
        city: (c.city || c.City || '').toString().trim(),
        pincode: (c.pincode || c.Pincode || '').toString().trim(),
        registrationDate: c.registrationDate || c.RegistrationDate ? new Date(c.registrationDate || c.RegistrationDate) : new Date(),
        status: normalizeStatus(c.status || c.Status),
        assignedTelecaller: (c.assignedTelecaller || c.Telecaller || '').toString().trim(),
        createdBy: req.superAdmin._id,
      };
    });

    const insertedCustomers = await Customer.insertMany(newCustomerEntries);

    res.status(201).json({
      message: `Import completed successfully: ${insertedCustomers.length} unique customer records imported. ${skippedDuplicatesCount} duplicate/invalid records were discarded.`,
      importedCount: insertedCustomers.length,
      skippedDuplicatesCount,
      customers: insertedCustomers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during import', error: error.message });
  }
};

// EXPORT CUSTOMERS TO CSV (.csv)
// @desc    Export Customers to CSV Format (.csv)
// @route   GET /api/v1/superadmin/customers/export/csv
// @access  Private (SuperAdmin)
export const exportCustomersCSV = async (req, res) => {
  try {
    const customers = await Customer.find({ isDeleted: false }).sort({ createdAt: 1 });

    const headers = ['Sr No', 'ID', 'Name', 'Company Name', 'State', 'City', 'Pincode', 'Registration Date', 'Status', 'Telecaller'];

    const rowsData = customers.map((c) => {
      const regDate = c.registrationDate ? new Date(c.registrationDate).toISOString().split('T')[0] : '';
      return [
        c.srNo || '',
        c.customerId || '',
        c.name || '',
        c.companyName || '',
        c.state || '',
        c.city || '',
        c.pincode || '',
        regDate,
        c.status || 'Active',
        c.assignedTelecaller || '',
      ];
    });

    // Use reusable generateCSVData utility
    const csvContent = generateCSVData(headers, rowsData);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Customer_Database.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error during CSV export', error: error.message });
  }
};

// EXPORT CUSTOMERS TO PDF REPORT
// @desc    Export Customers to PDF Format (Report view)
// @route   GET /api/v1/superadmin/customers/export/pdf
// @access  Private (SuperAdmin)
export const exportCustomersPDF = async (req, res) => {
  try {
    const customers = await Customer.find({ isDeleted: false }).sort({ createdAt: 1 });

    const headers = ['SR. NO.', 'ID', 'NAME', 'COMPANY NAME', 'STATE', 'CITY', 'PINCODE', 'REG. DATE', 'STATUS', 'TELECALLER'];

    const tableRowsHtml = customers
      .map((c, i) => {
        const regDate = c.registrationDate ? new Date(c.registrationDate).toISOString().split('T')[0] : '';
        const statusColor = c.status === 'Pending' ? '#d97706' : '#16a34a';
        return `
        <tr>
          <td>${(i + 1).toString().padStart(2, '0')}</td>
          <td><strong>${c.customerId}</strong></td>
          <td>${c.name}</td>
          <td>${c.companyName}</td>
          <td>${c.state}</td>
          <td>${c.city}</td>
          <td>${c.pincode}</td>
          <td>${regDate}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${c.status}</td>
          <td>${c.assignedTelecaller || '-'}</td>
        </tr>`;
      })
      .join('');

    // Use reusable generateHTMLPDFReport utility
    const pdfHtmlReport = generateHTMLPDFReport(
      'Customer Database Report',
      'Super Admin Master Customer Directory',
      headers,
      tableRowsHtml,
      customers.length
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="Customer_Database_Report.pdf"');
    res.status(200).send(pdfHtmlReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error during PDF export', error: error.message });
  }
};
