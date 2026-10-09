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
    const {
      number,
      city,
      state,
      status,
      companyName,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);

    const skip = (pageNumber - 1) * limitNumber;

    const filter = {
      isDeleted: false,
    };

    // Phone number search
    if (number) {
      filter.registeredPhoneNo = number;
    }

    // City search
    if (city) {
      filter.city = {
        $regex: city,
        $options: "i",
      };
    }

    // State search
    if (state) {
      filter.state = {
        $regex: state,
        $options: "i",
      };
    }

    // Status search
    if (status) {
      filter.status = {
        $regex: `^${status}$`,
        $options: "i",
      };
    }

    // Company name search
    if (companyName) {
      filter.companyName = {
        $regex: companyName,
        $options: "i",
      };
    }

    const [customers, totalCustomers] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Customer.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCustomers / limitNumber);

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",

      pagination: {
        currentPage: pageNumber,
        limit: limitNumber,
        totalCustomers,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },

      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};
// CREATE SINGLE CUSTOMER RECORD
// @desc    Create Single Customer Record (Manual "+ Add Customer")
// @route   POST /api/v1/superadmin/customers
// @access  Private (SuperAdmin)
export const createCustomer = async (req, res) => {
  try {
  
    const {
      vendorCode,
      registrationDate,
      vendorName,
      companyName,
      country,
      state,
      city,
      locality,
      email,
      gstNumber,
      address,

      registeredPhoneNo,
      whatsappNo,
      alternateContactNo,
      website,
      vendorListingType,
      isPaidVendor,
      packagePaidAmount,
      lastPaymentDate,
      paymentTerm,
      lastPaymentInvoiceNo,
      nextPaymentDueDate,
      activePackageList,
      createdByTelecaller,

      primaryBusinessCategory,
      serviceSpecialization,
      keywordsTags,
    } = req.body;

    // Required fields
    if (!vendorName || !companyName || !registeredPhoneNo) {
      return res.status(400).json({
        success: false,
        message:
          "vendorName, companyName and registeredPhoneNo are required",
      });
    }

    // Uploaded image
    const image = req.file
      ? `/uploads/customers/${req.file.filename}`
      : "";

    // Customer ID
    const customerId = `CUST-${Date.now()}`;

    const customer = await Customer.create({
      customerId,

      vendorCode,
      registrationDate,
      vendorName,
      companyName,
      country,
      state,
      city,
      locality,
      email,
      gstNumber,
      address,

      image,

      registeredPhoneNo,
      whatsappNo,
      alternateContactNo,
      website,
      vendorListingType,
      isPaidVendor,
      packagePaidAmount,
      lastPaymentDate,
      paymentTerm,
      lastPaymentInvoiceNo,
      nextPaymentDueDate,
      activePackageList,
      createdByTelecaller,

      primaryBusinessCategory,
      serviceSpecialization,
      keywordsTags,

      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};
// UPDATE CUSTOMER RECORD (STATUS RULES ENFORCED)
// @desc    Update Customer Record & Status Rules
// @route   PATCH /api/v1/superadmin/customers/:id
// @access  Private (SuperAdmin)
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Prevent updating protected/system fields
    const allowedFields = [
      "vendorCode",
      "registrationDate",
      "vendorName",
      "companyName",
      "country",
      "state",
      "city",
      "locality",
      "email",
      "gstNumber",
      "address",

      "image",

      "registeredPhoneNo",
      "whatsappNo",
      "alternateContactNo",
      "website",
      "vendorListingType",
      "isPaidVendor",
      "packagePaidAmount",
      "lastPaymentDate",
      "paymentTerm",
      "lastPaymentInvoiceNo",
      "nextPaymentDueDate",
      "activePackageList",
      "createdByTelecaller",

      "primaryBusinessCategory",
      "serviceSpecialization",
      "keywordsTags",

      "status",
      "assignedTelecaller",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });

    customer.updatedBy = req.user?._id || null;

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
      error: error.message,
    });
  }
};
// BULK IMPORT CUSTOMERS (DIRECT EXCEL/CSV FILE UPLOAD OR JSON PAYLOAD)
// @desc    Bulk Import Customers from Excel / CSV Data (.xlsx, .csv, 50MB Limit & Duplicate Check)
// @route   POST /api/v1/superadmin/customers/import
// @access  Private (SuperAdmin)
export const importCustomers = async (req, res) => {
  try {
    let customers = req.body?.customers;

    // Direct Binary Excel / CSV file upload via multer (req.file or req.files)
    const uploadedFile = req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null);
    if (uploadedFile && uploadedFile.buffer) {
      customers = parseExcelOrCsvBuffer(uploadedFile.buffer);
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ message: 'Please attach a valid Excel/CSV file (.xlsx, .xls, .csv) or provide a non-empty array of customer records' });
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
// Delete the Customer 
export const deleteCustomer = async (req, res) => {
  const { id } = req.params;

  try {
    // Find customer that is not already deleted
    const customer = await Customer.findOne({
      _id: id,  // find and delete the customer with object Id.
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
// Block the Customer 
export const blockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (customer.status === "Blocked") {
      return res.status(400).json({
        success: false,
        message: "Customer is already blocked",
      });
    }

    customer.status = "Blocked";
    customer.updatedBy = req.user?._id || null;

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer blocked successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Block customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to block customer",
      error: error.message,
    });
  }
};
//-----------unblock customer 

export const unblockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (customer.status !== "Blocked") {
      return res.status(400).json({
        success: false,
        message: "Customer is not blocked",
      });
    }

    customer.status = "Active";
    customer.updatedBy = req.user?._id || null;

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer unblocked successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Unblock customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unblock customer",
      error: error.message,
    });
  }
};

