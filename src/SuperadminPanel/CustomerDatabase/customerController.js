import mongoose from 'mongoose';
import Customer from './customerSchema.js';
import {
  parseExcelOrCsvBuffer,
  filterUniqueRecords,
  generateCSVData,
  generateHTMLPDFReport,
} from '../../utils/excelCsvHandler.js';
import { createAuditLog } from '../../utils/auditLogger.js';

// Helper to generate auto-increment Customer ID (CUST001, CUST002...) safely
const generateCustomerId = async () => {
  const existingCustomers = await Customer.find({ customerId: /^CUST/i }).select('customerId');

  let maxNum = 0;
  existingCustomers.forEach((c) => {
    if (c.customerId) {
      const num = parseInt(c.customerId.replace(/^CUST/i, ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNumber = maxNum + 1;
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
    // Disable browser/proxy caching for latest customer data
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      state,
      city,
    } = req.query;

    const query = {
      isDeleted: false,
    };

    // Search across customer fields
    if (search && search.trim()) {
      const searchRegex = new RegExp(
        search.trim(),
        'i'
      );

      query.$or = [
        { mobileNumber: searchRegex },
        { companyName: searchRegex },
        { email: searchRegex },
        { state: searchRegex },
        { city: searchRegex },
        { customerId: searchRegex },
      ];
    }

    if (status && status.trim()) {
      query.status = normalizeStatus(status);
    }

    if (state && state.trim()) {
      query.state = new RegExp(
        state.trim(),
        'i'
      );
    }

    if (city && city.trim()) {
      query.city = new RegExp(
        city.trim(),
        'i'
      );
    }

    const totalCustomers =
      await Customer.countDocuments(query);

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return res.json({
      totalCustomers,
      totalPages: Math.ceil(
        totalCustomers / limit
      ),
      currentPage: page,
      limit,
      customers,
    });
  } catch (error) {
    console.error('Get Customers Error:', error);

    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};
// CREATE SINGLE CUSTOMER RECORD
// @desc    Create Single Customer Record (Manual "+ Add Customer")
// @route   POST /api/v1/superadmin/customers
// @access  Private (SuperAdmin)
export const createCustomer = async (req, res) => {
  const {
    mobileNumber,
    companyName,
    email,
    state,
    city,
    registrationDate,
    status = 'Active',
    assignedTelecaller,
  } = req.body;

  try {
    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({
        message: 'Mobile Number is required',
      });
    }

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        message: 'Company Name is required',
      });
    }

    const customerId = await generateCustomerId();

    // Auto srNo if not provided
    const count = await Customer.countDocuments({
      isDeleted: false,
    });

    const calculatedSrNo = (count + 1)
      .toString()
      .padStart(2, '0');

    const customer = await Customer.create({
      customerId,
      srNo: calculatedSrNo,

      mobileNumber: mobileNumber.trim(),
      companyName: companyName.trim(),

      email: email ? email.trim().toLowerCase() : '',

      state: state ? state.trim() : '',
      city: city ? city.trim() : '',

      registrationDate: registrationDate
        ? new Date(registrationDate)
        : new Date(),

      status: normalizeStatus(status),

      assignedTelecaller: assignedTelecaller
        ? assignedTelecaller.trim()
        : '',

      createdBy: req.superAdmin._id,
    });

    return res.status(201).json({
      message: 'Customer record created successfully',
      customer,
    });
  } catch (error) {
    console.error('Create Customer Error:', error);

    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
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
      return res.status(404).json({
        message: 'Customer record not found',
      });
    }

    const {
      mobileNumber,
      companyName,
      email,
      state,
      city,
      registrationDate,
      status,
      assignedTelecaller,
    } = req.body;

    // Required field validation during update
    if (
      mobileNumber !== undefined &&
      (!mobileNumber || !mobileNumber.trim())
    ) {
      return res.status(400).json({
        message: 'Mobile Number cannot be empty',
      });
    }

    if (
      companyName !== undefined &&
      (!companyName || !companyName.trim())
    ) {
      return res.status(400).json({
        message: 'Company Name cannot be empty',
      });
    }

    // Status transition protection
    if (status !== undefined) {
      const currentNormalized = normalizeStatus(customer.status);
      const incomingNormalized = normalizeStatus(status);

      // Pending -> Active allowed
      // Active -> Pending prohibited
      if (
        currentNormalized === 'Active' &&
        incomingNormalized === 'Pending'
      ) {
        return res.status(400).json({
          message:
            'Status Transition Error: Cannot change status from Active back to Pending',
        });
      }

      customer.status = incomingNormalized;
    }

    if (mobileNumber !== undefined) {
      customer.mobileNumber = mobileNumber.trim();
    }

    if (companyName !== undefined) {
      customer.companyName = companyName.trim();
    }

    if (email !== undefined) {
      customer.email = email.trim().toLowerCase();
    }

    if (state !== undefined) {
      customer.state = state.trim();
    }

    if (city !== undefined) {
      customer.city = city.trim();
    }

    if (registrationDate !== undefined) {
      customer.registrationDate = new Date(registrationDate);
    }

    if (assignedTelecaller !== undefined) {
      customer.assignedTelecaller = assignedTelecaller.trim();
    }

    customer.updatedBy = req.superAdmin._id;

    await customer.save();

    // Automatic Audit Log Recording
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Updated Customer',
      record: customer.customerId,
      module: 'Customer Database',
    });

    return res.json({
      message: 'Customer record updated successfully',
      customer,
    });
  } catch (error) {
    console.error('Update Customer Error:', error);

    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};
// BULK IMPORT CUSTOMERS (DIRECT EXCEL/CSV FILE UPLOAD OR JSON PAYLOAD)
// @desc    Bulk Import Customers from Excel / CSV Data (.xlsx, .csv, 50MB Limit & Duplicate Check)
// @route   POST /api/v1/superadmin/customers/import
// @access  Private (SuperAdmin)
export const importCustomers = async (req, res) => {
  console.log("Import Customers Request Body:", req.body);
  try {
    console.log("IMPORT STEP 1: Controller started");
    let customers = req.body?.customers;
    console.log("IMPORT STEP 2: Request body received");

    // Direct Binary Excel / CSV file upload via multer (req.file or req.files)
    const uploadedFile = req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null);
  
    console.log("IMPORT STEP 3: File:", uploadedFile?.originalname);
    if (uploadedFile && uploadedFile.buffer) {
      console.log("IMPORT STEP 4: Parsing file");
      customers = parseExcelOrCsvBuffer(uploadedFile.buffer);
      console.log("IMPORT STEP 5: Parsed records:", customers.length);
    }
    console.log("IMPORT STEP 6: Fetching existing customers");

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ message: 'Please attach a valid Excel/CSV file (.xlsx, .xls, .csv) or provide a non-empty array of customer records' });
    }

    // Fetch existing customer keys for duplicate checking
    const existingRecords = await Customer.find({ isDeleted: false }).select('customerId name companyName');
    console.log("IMPORT STEP 7: Existing customers:", existingRecords.length);

    console.log("IMPORT STEP 8: Creating existing keys");

    // const existingKeysSet = new Set(
    //   existingRecords.map((r) => {
    //     console.log("Checking DB record:", {
    //       customerId: r.customerId,
    //       name: r.name,
    //       companyName: r.companyName
    //     });

    //     return `${(r.name || "").toString().toLowerCase().trim()}_${(
    //       r.companyName || ""
    //     ).toString().toLowerCase().trim()}`;
    //   })
    // );

    const existingKeysSet = new Set(
      existingRecords.map((r) => {
        // console.log("Checking DB record:", { customerId: r.customerId, name: r.name, companyName: r.companyName });
          const name = (r.name || "").toString().trim().toLowerCase();
          const companyName = (r.companyName || "")
            .toString()
            .trim()
            .toLowerCase();

          if (!name || !companyName) return null;

          return `${name.toLowerCase()}_${companyName.toLowerCase()}`;
        })
        .filter(Boolean),
    );
    console.log("IMPORT STEP 9: Existing keys created");

    if (uploadedFile && uploadedFile.buffer) {
      customers = parseExcelOrCsvBuffer(uploadedFile.buffer);
    }
    console.log("Existing records count:", existingRecords.length);

    // existingRecords.forEach((r, index) => {
    //   console.log(`Existing record ${index}:`, {
    //     customerId: r.customerId,
    //     name: r.name,
    //     companyName: r.companyName,
    //     nameType: typeof r.name,
    //     companyNameType: typeof r.companyName,
    //   });
    // });

    // Use reusable filterUniqueRecords utility
    const { uniqueRecords, skippedDuplicatesCount } = filterUniqueRecords(
      customers,
      existingKeysSet,
      (item) => {
        const name = (item.name || item.CustomerName || item['Customer Name'] || item.Name || '').toString().trim();
        const companyName = (item.companyName || item.CompanyName || item['Company Name'] || item.Company || '').toString().trim();
        if (!name || !companyName) return null;
        return `${name}_${companyName}`;
      }
    );

    if (uniqueRecords.length === 0) {
      return res.status(200).json({
        message: `All ${customers.length} records in the uploaded file already exist in the database. 0 new records were imported.`,
        importedCount: 0,
        skippedDuplicatesCount: customers.length,
      });
    }

    // Determine starting numeric part for custom CUSTxxx ID generation safely
    const existingCustomers = await Customer.find({ customerId: /^CUST/i }).select('customerId');

    let maxNum = 0;
    existingCustomers.forEach((c) => {
      if (c.customerId) {
        const num = parseInt(c.customerId.replace(/^CUST/i, ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const startNum = maxNum + 1;

    const totalExisting = await Customer.countDocuments({ isDeleted: false });

    const newCustomerEntries = uniqueRecords.map((c, index) => {
      const customerId = `CUST${(startNum + index).toString().padStart(3, '0')}`;
      const srNo = c.srNo || c['Sr No'] || c['SR. NO.'] || (totalExisting + index + 1).toString().padStart(2, '0');
      const name = (c.name || c.CustomerName || c['Customer Name'] || c.Name || 'Unnamed Customer').toString().trim();
      const companyName = (c.companyName || c.CompanyName || c['Company Name'] || c.Company || 'Independent').toString().trim();
      const state = (c.state || c.State || '').toString().trim();
      const city = (c.city || c.City || '').toString().trim();
      const pincode = (c.pincode || c.Pincode || c['Pin Code'] || c.PinCode || c.Zip || '').toString().trim();
      const rawRegDate = c.registrationDate || c.RegistrationDate || c['Registration Date'] || c['Reg Date'];
      const registrationDate = rawRegDate ? new Date(rawRegDate) : new Date();
      const status = normalizeStatus(c.status || c.Status);
      const assignedTelecaller = (c.assignedTelecaller || c.Telecaller || c['Assigned Telecaller'] || c.TC || '').toString().trim();
      const mobileNumber = (c.mobileNumber || c.MobileNumber || c['Mobile Number'] || c.Mobile || '').toString().trim();
      const email = (c.email || c.Email || c['Email Address'] || '').toString().trim().toLowerCase();
      console.log(`--> Preparing new customer entry: ${customerId}, ${name}, ${companyName}, ${state}, ${city}, ${pincode}, ${registrationDate.toISOString()}, ${status}, ${assignedTelecaller}`);
      return {
        customerId,
        srNo,
        name,
        companyName,
        state,
        city,
        pincode,
        registrationDate,
        status,
        assignedTelecaller,
        mobileNumber,
        email,
        createdBy: req.superAdmin._id,
      };
    });

    const insertedCustomers = await Customer.insertMany(newCustomerEntries);
    console.log(`Inserted ${insertedCustomers.length} new customer records successfully.`);

    insertedCustomers.forEach((r, index) => {
      console.log(`-->> Inserted record ${index}:`, {
        customerId: r.customerId,
        name: r.name,
        companyName: r.companyName,
        nameType: typeof r.name,
        companyNameType: typeof r.companyName,
        mobileNumber: r.mobileNumber,
        email: r.email,
      });
    });

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

    // Automatic Audit Log Recording
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Exported CSV',
      record: 'CUST_LIST',
      module: 'Customer Database',
    });

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

export const deleteCustomer = async (req, res) => {
  const { id } = req.params;

  try {
    // Find customer that is not already deleted
    const customer = await Customer.findOne({
      customerId: id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Soft delete
    customer.isDeleted = true;
    customer.updatedBy = req.superAdmin?._id || null;

    await customer.save();

    // Audit log
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Deleted Customer',
      record: customer.customerId,
      module: 'Customer Database',
    });

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully.',
      data: {
        customerId: customer.customerId,
        deleted: true,
      },
    });
  } catch (error) {
    console.error('Delete customer error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
