import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import SuperAdminVendor from './vendorDatabaseSchema.js';
import Vendor from '../../VendorPanel/Authentication/authSchema.js';
import {
  parseExcelOrCsvBuffer,
  filterUniqueRecords,
  generateCSVData,
  generateHTMLPDFReport,
} from '../../utils/excelCsvHandler.js';
import { createAuditLog } from '../../utils/auditLogger.js';
import { sendVendorCredentialsEmail } from '../../utils/emailHandler.js';

// Helper to generate a random 8-character password if not provided
const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

// Helper to generate auto-increment Vendor ID (VEN001, VEN002...) and Trans No (TRX90101, TRX90102...)
const generateVendorIdAndTransNo = async () => {
  const existingVendors = await SuperAdminVendor.find({}).select('vendorId transNo');

  let maxVenNum = 0;
  let maxTrxNum = 100; // Base index so TRX90101 is 101

  existingVendors.forEach((v) => {
    if (v.vendorId) {
      const num = parseInt(v.vendorId.replace(/^VEN/i, ''), 10);
      if (!isNaN(num) && num > maxVenNum) {
        maxVenNum = num;
      }
    }
    if (v.transNo) {
      const num = parseInt(v.transNo.replace(/^TRX90/i, ''), 10);
      if (!isNaN(num) && num > maxTrxNum) {
        maxTrxNum = num;
      }
    }
  });

  const nextVenNum = maxVenNum + 1;
  const nextTrxNum = maxTrxNum + 1;

  return {
    vendorId: `VEN${nextVenNum.toString().padStart(3, '0')}`,
    transNo: `TRX90${nextTrxNum.toString().padStart(3, '0')}`,
  };
};

// Helper to safely find Vendor by MongoDB _id, custom vendorId (VEN002), or transNo (TRX90102) without CastError
const findVendorByIdOrCustomId = async (identifier) => {
  if (!identifier) return null;
  const str = identifier.toString().trim();
  const isObjId = mongoose.Types.ObjectId.isValid(str);

  const query = isObjId
    ? { $or: [{ _id: str }, { vendorId: str }, { transNo: str }], isDeleted: false }
    : { $or: [{ vendorId: str }, { transNo: str }], isDeleted: false };

  return await SuperAdminVendor.findOne(query);
};

// Normalize status string for consistent formatting (Default: Pending)
const normalizeStatus = (statusStr) => {
  if (!statusStr) return 'Pending';
  const str = statusStr.toString().trim().toLowerCase();
  if (str === 'active') return 'Active';
  return 'Pending';
};


// 1. GET ALL VENDORS DIRECTORY
// @desc    Get All Vendors Directory (Search, Filter, Pagination)
// @route   GET /api/v1/superadmin/vendors
// @access  Private (SuperAdmin)
export const getVendors = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, status, state, city, category } = req.query;

    const query = { isDeleted: false };

    // Search filter across vendorName, transNo, vendorId, category, verification date, city, state
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { vendorName: searchRegex },
        { transNo: searchRegex },
        { vendorId: searchRegex },
        { category: searchRegex },
        { state: searchRegex },
        { city: searchRegex },
        { contactNo: searchRegex },
        { srNo: searchRegex },
      ];
    }

    if (status && status.trim()) {
      query.status = normalizeStatus(status);
    }

    if (category && category.trim()) {
      query.category = new RegExp(category.trim(), 'i');
    }

    if (state && state.trim()) {
      query.state = new RegExp(state.trim(), 'i');
    }

    if (city && city.trim()) {
      query.city = new RegExp(city.trim(), 'i');
    }

    const totalVendors = await SuperAdminVendor.countDocuments(query);

    const vendors = await SuperAdminVendor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.json({
      totalVendors,
      totalPages: Math.ceil(totalVendors / limit),
      currentPage: page,
      limit,
      vendors,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// 2. CREATE SINGLE VENDOR RECORD
// @desc    Create Single Vendor Record (Manual "+ Add Vendor")
// @route   POST /api/v1/superadmin/vendors
// @access  Private (SuperAdmin)
export const createVendor = async (req, res) => {
  const {
    srNo,
    transNo,
    vendorName,
    ownerName,
    category,
    verificationDateTime,
    contactNo,
    email,
    state,
    city,
    pincode,
    completeAddress,
    gstin,
  } = req.body;
  try {
    const DEFAULT_VENDOR_LIMIT = 10;
    const vendorCount = await SuperAdminVendor.countDocuments({
      isDeleted: false,
    });
    if (vendorCount >= DEFAULT_VENDOR_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Vendor limit reached. Maximum ${DEFAULT_VENDOR_LIMIT} vendors are allowed.`,
      });
    }
    if (!vendorName || !vendorName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vendor Name is required',
      });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }
    // Check explicitly provided transaction number
    if (transNo && transNo.trim()) {
      const existingTrans = await SuperAdminVendor.findOne({
        transNo: transNo.trim(),
      });
      if (existingTrans) {
        return res.status(400).json({
          success: false,
          message: `Transaction Number '${transNo.trim()}' is already in use.`,
        });
      }
    }
    const {
      vendorId: autoVendorId,
      transNo: autoTransNo,
    } = await generateVendorIdAndTransNo();
    const finalTransNo =
      transNo && transNo.trim()
        ? transNo.trim()
        : autoTransNo;
    // Auto Sr No
    let calculatedSrNo = srNo;
    if (!calculatedSrNo) {
      const count = await SuperAdminVendor.countDocuments({
        isDeleted: false,
      });

      calculatedSrNo = (count + 1)
        .toString()
        .padStart(2, '0');
    }

    const cleanEmail = email
      ? email.trim().toLowerCase()
      : '';

    /*
     * IMPORTANT:
     * Do NOT generate a password here.
     *
     * Password will be generated only when
     * Super Admin activates the vendor.
     */

    // 1. Create vendor master record

    const vendor = await SuperAdminVendor.create({
      vendorId: autoVendorId,
      transNo: finalTransNo,
      srNo: calculatedSrNo,

      vendorName: vendorName.trim(),
      ownerName: ownerName ? ownerName.trim() : '',
      category: category.trim(),

      verificationDateTime: verificationDateTime
        ? new Date(verificationDateTime)
        : new Date(),

      contactNo: contactNo ? contactNo.trim() : '',
      email: cleanEmail,

      state: state ? state.trim() : '',
      city: city ? city.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      completeAddress: completeAddress
        ? completeAddress.trim()
        : '',
      gstin: gstin ? gstin.trim() : '',

      // ALWAYS Pending on creation
      status: 'Pending',

      createdBy: req.superAdmin._id,
    });

    // 2. Create Vendor authentication record
    const vendorAuthEmail =
      cleanEmail ||
      `${autoVendorId.toLowerCase()}@lts-dbms.com`;

    await Vendor.findOneAndUpdate(
      { vendorId: autoVendorId },
      {
        vendorId: autoVendorId,
        email: vendorAuthEmail,

        fullName:
          ownerName && ownerName.trim()
            ? ownerName.trim()
            : vendorName.trim(),

        phone: contactNo ? contactNo.trim() : '',

        // No password until activation
        password: null,

        storeName: vendorName.trim(),

        // Vendor cannot login yet
        storeStatus: 'Pending Verification',

        state: state ? state.trim() : '',
        city: city ? city.trim() : '',
        address: completeAddress
          ? completeAddress.trim()
          : '',
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    );
    // 3. Audit log
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Created Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    // 4. Response
    return res.status(201).json({
      success: true,
      message: 'Vendor created successfully and is pending approval.',
      data: {
        vendorId: vendor.vendorId,
        email: vendor.email || '',
        status: vendor.status,
        vendor,
      },
    });

  } catch (error) {
    console.error('Create vendor error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
// Active the Account and Send  
export const activateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Find vendor
    const vendor = await SuperAdminVendor.findOne({
      vendorId,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Prevent activating an already active vendor
    if (vendor.status === 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already active',
      });
    }

    // Make sure vendor has an email
    if (!vendor.email) {
      return res.status(400).json({
        success: false,
        message:
          'Vendor cannot be activated because no email address is available.',
      });
    }
    /*
     * Generate password ONLY during activation.
     */
    const rawPassword = generateRandomPassword();

    const hashedPassword = await bcrypt.hash(
      rawPassword,
      10
    );

    // Update master vendor
    vendor.status = 'Active';
    vendor.password = hashedPassword;

    await vendor.save();

    // Update authentication record
    const vendorAuth = await Vendor.findOneAndUpdate(
      { vendorId },

      {
        email: vendor.email,
        password: hashedPassword,
        storeStatus: 'Active & Verified',
      },

      {
        returnDocument: 'after',
      }
    );

    if (!vendorAuth) {
      // Important: don't silently continue
      return res.status(500).json({
        success: false,
        message: 'Vendor authentication record not found.',
      });
    }

    /*
     * Send credentials AFTER successful activation.
     */
    const emailResult =
      await sendVendorCredentialsEmail({
        toEmail: vendor.email,
        vendorName: vendor.vendorName,
        vendorId: vendor.vendorId,
        password: rawPassword,
      });

    // Audit
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Activated Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    return res.status(200).json({
      success: true,
      message: emailResult.success
        ? 'Vendor activated and credentials sent successfully.'
        : 'Vendor activated, but credentials email could not be sent.',

      data: {
        vendorId: vendor.vendorId,
        email: vendor.email,
        status: vendor.status,
        emailSent: emailResult.success,
        ...(emailResult.error && {
          emailError: emailResult.error,
        }),
      },
    });

  } catch (error) {
    console.error('Activate vendor error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// 3. GET SINGLE VENDOR BY ID OR CUSTOM ID
// @desc    Get Single Vendor Record by Mongo _id, custom vendorId (VEN002), or transNo (TRX90102)
// @route   GET /api/v1/superadmin/vendors/:id
// @access  Private (SuperAdmin)
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await findVendorByIdOrCustomId(id);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor record not found' });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 4. UPDATE VENDOR RECORD (STATUS RULES ENFORCED)
// @desc    Update Vendor Record & Status Rules
// @route   PATCH /api/v1/superadmin/vendors/:id
// @access  Private (SuperAdmin)
export const updateVendor = async (req, res) => {
  const { id } = req.params;

  try {
    const vendor = await findVendorByIdOrCustomId(id);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor record not found' });
    }

    const {
      srNo,
      transNo,
      vendorName,
      category,
      verificationDateTime,
      contactNo,
      state,
      city,
      status,
    } = req.body;

    // BUSINESS RULE: Status Transition Protection
    // Pending -> Active is ALLOWED. Active -> Pending is STRICTLY PROHIBITED.
    if (status !== undefined) {
      const currentNormalized = normalizeStatus(vendor.status);
      const incomingNormalized = normalizeStatus(status);

      if (currentNormalized === 'Active' && incomingNormalized === 'Pending') {
        return res.status(400).json({
          message: 'Status Transition Error: Cannot change status from Active back to Pending',
        });
      }
      vendor.status = incomingNormalized;
    }

    if (vendorName) vendor.vendorName = vendorName.trim();
    if (transNo) vendor.transNo = transNo.trim();
    if (category) vendor.category = category.trim();
    if (verificationDateTime) vendor.verificationDateTime = new Date(verificationDateTime);
    if (contactNo !== undefined) vendor.contactNo = contactNo.trim();
    if (state !== undefined) vendor.state = state.trim();
    if (city !== undefined) vendor.city = city.trim();
    if (srNo !== undefined) vendor.srNo = srNo;

    vendor.updatedBy = req.superAdmin._id;
    await vendor.save();

    // Automatic Audit Log Recording
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Updated Vendor',
      record: vendor.transNo || vendor.vendorId,
      module: 'Vendor Database',
    });

    res.json({
      message: 'Vendor record updated successfully',
      vendor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// BULK IMPORT VENDORS (DIRECT FILE UPLOAD OR JSON PAYLOAD)
// @desc    Bulk Import Vendors from Excel / CSV Data (.xlsx, .csv, 50MB Limit & Duplicate Check)
// @route   POST /api/v1/superadmin/vendors/import
// @access  Private (SuperAdmin)
export const importVendors = async (req, res) => {
  try {
    let vendorsPayload = req.body?.vendors || req.body?.data;

    // Direct Binary Excel / CSV file upload via multer (req.file or req.files)
    const uploadedFile = req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null);
    if (uploadedFile && uploadedFile.buffer) {
      vendorsPayload = parseExcelOrCsvBuffer(uploadedFile.buffer);
    }

    if (!Array.isArray(vendorsPayload) || vendorsPayload.length === 0) {
      return res.status(400).json({ message: 'Please attach a valid Excel/CSV file (.xlsx, .xls, .csv) or provide a non-empty array of vendor records' });
    }

    // Helper to extract clean digits from phone string for exact matching
    const cleanPhoneDigits = (phoneStr) => (phoneStr ? phoneStr.toString().replace(/[\s\-\(\)\.\+]/g, '') : '');

    // Fetch all existing vendor records (including soft-deleted) to build lookup sets
    const existingRecords = await SuperAdminVendor.find({}).select('vendorId transNo vendorName contactNo');

    const existingTransNoSet = new Set(existingRecords.map((r) => (r.transNo || '').toLowerCase().trim()).filter(Boolean));
    const existingVendorIdsSet = new Set(existingRecords.map((r) => (r.vendorId || '').toLowerCase().trim()).filter(Boolean));
    const existingNamesSet = new Set(existingRecords.map((r) => (r.vendorName || '').toLowerCase().trim()).filter(Boolean));
    const existingPhoneSet = new Set(existingRecords.map((r) => cleanPhoneDigits(r.contactNo)).filter(Boolean));
    const existingNamePhoneSet = new Set(
      existingRecords.map((r) => `${(r.vendorName || '').toLowerCase().trim()}_${cleanPhoneDigits(r.contactNo)}`)
    );

    // Filter incoming payload based on Vendor Name & Phone Number uniqueness + index collision protection
    const uniqueRecords = [];
    let skippedDuplicatesCount = 0;
    const batchTransNoSet = new Set();
    const batchNamesSet = new Set();
    const batchPhoneSet = new Set();
    const batchNamePhoneSet = new Set();

    for (const item of vendorsPayload) {
      if (!item) {
        skippedDuplicatesCount++;
        continue;
      }

      const name = (item.vendorName || item.VendorName || item['Vendor Name'] || item.Name || '').toString().trim();
      const phone = (item.contactNo || item.ContactNo || item['Contact No'] || item['Contact No.'] || item.Phone || item['Phone Number'] || '').toString().trim();
      const trans = (item.transNo || item.TransNo || item['Trans No'] || item['TRANS NO.'] || '').toString().trim();
      const venId = (item.vendorId || item.VendorId || item['Vendor ID'] || '').toString().trim();

      if (!name) {
        skippedDuplicatesCount++;
        continue;
      }

      const nameLower = name.toLowerCase();
      const phoneDigits = cleanPhoneDigits(phone);
      const namePhoneKey = `${nameLower}_${phoneDigits}`;
      const transLower = trans.toLowerCase();
      const venIdLower = venId.toLowerCase();

      // 100% Future-Proof Uniqueness Rule:
      // Skip if exact SAME Vendor Name AND SAME Phone Number pair exists in DB or current Excel batch
      const isDuplicateNamePhone = phoneDigits
        ? existingNamePhoneSet.has(namePhoneKey) || batchNamePhoneSet.has(namePhoneKey)
        : existingNamesSet.has(nameLower) || batchNamesSet.has(nameLower);

      // Index Collision Protection: Skip if explicit transNo or vendorId collides with DB
      const isDuplicateTrans = transLower && (existingTransNoSet.has(transLower) || batchTransNoSet.has(transLower));
      const isDuplicateVenId = venIdLower && existingVendorIdsSet.has(venIdLower);

      if (isDuplicateNamePhone || isDuplicateTrans || isDuplicateVenId) {
        skippedDuplicatesCount++;
        continue;
      }

      // Record in batch sets
      if (nameLower) batchNamesSet.add(nameLower);
      if (phoneDigits) batchPhoneSet.add(phoneDigits);
      batchNamePhoneSet.add(namePhoneKey);
      if (transLower) batchTransNoSet.add(transLower);

      uniqueRecords.push(item);
    }

    if (uniqueRecords.length === 0) {
      return res.status(200).json({
        message: `All ${vendorsPayload.length} records in the uploaded file already exist in the database. 0 new records were imported.`,
        importedCount: 0,
        skippedDuplicatesCount: vendorsPayload.length,
      });
    }

    // Determine starting numeric part for auto custom VENxxx and TRX901xx ID generation
    let maxVenNum = 0;
    let maxTrxNum = 100;

    existingRecords.forEach((v) => {
      if (v.vendorId) {
        const num = parseInt(v.vendorId.replace(/^VEN/i, ''), 10);
        if (!isNaN(num) && num > maxVenNum) maxVenNum = num;
      }
      if (v.transNo) {
        const num = parseInt(v.transNo.replace(/^TRX90/i, ''), 10);
        if (!isNaN(num) && num > maxTrxNum) maxTrxNum = num;
      }
    });

    let currentVenNum = maxVenNum + 1;
    let currentTrxNum = maxTrxNum + 1;

    const totalExisting = await SuperAdminVendor.countDocuments({ isDeleted: false });

    const newVendorEntries = uniqueRecords.map((v, index) => {
      // Auto-generate VENxxx ensuring no collision
      let vendorId = (v.vendorId || v.VendorId || v['Vendor ID'] || '').toString().trim();
      if (!vendorId) {
        while (existingVendorIdsSet.has(`ven${currentVenNum.toString().padStart(3, '0')}`)) {
          currentVenNum++;
        }
        vendorId = `VEN${currentVenNum.toString().padStart(3, '0')}`;
        currentVenNum++;
      }
      existingVendorIdsSet.add(vendorId.toLowerCase());

      // Auto-generate TRX901xx ensuring no collision
      let transNo = (v.transNo || v.TransNo || v['Trans No'] || v['TRANS NO.'] || '').toString().trim();
      if (!transNo) {
        while (existingTransNoSet.has(`trx90${currentTrxNum.toString().padStart(3, '0')}`)) {
          currentTrxNum++;
        }
        transNo = `TRX90${currentTrxNum.toString().padStart(3, '0')}`;
        currentTrxNum++;
      }
      existingTransNoSet.add(transNo.toLowerCase());

      const srNo = v.srNo || v['Sr No'] || v['SR. NO.'] || (totalExisting + index + 1).toString().padStart(2, '0');
      const vendorName = (v.vendorName || v.VendorName || v['Vendor Name'] || v.Name || 'Unnamed Vendor').toString().trim();
      const category = (v.category || v.Category || 'General').toString().trim();
      const rawVerificationDate = v.verificationDateTime || v.VerificationDate || v['Verification Date'] || v['Verification Date & Time'] || v['Contact Verification'];
      const verificationDateTime = rawVerificationDate ? new Date(rawVerificationDate) : new Date();
      const contactNo = (v.contactNo || v.ContactNo || v['Contact No'] || v['Contact No.'] || '').toString().trim();
      const state = (v.state || v.State || '').toString().trim();
      const city = (v.city || v.City || '').toString().trim();
      const status = normalizeStatus(v.status || v.Status);

      return {
        vendorId,
        transNo,
        srNo,
        vendorName,
        category,
        verificationDateTime,
        contactNo,
        state,
        city,
        status,
        createdBy: req.superAdmin._id,
      };
    });

    const insertedVendors = await SuperAdminVendor.insertMany(newVendorEntries);

    res.status(201).json({
      message: `Import completed successfully: ${insertedVendors.length} unique vendor records imported. ${skippedDuplicatesCount} duplicate/invalid records were discarded.`,
      importedCount: insertedVendors.length,
      skippedDuplicatesCount,
      vendors: insertedVendors,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during import', error: error.message });
  }
};


// EXPORT VENDORS TO CSV (.csv)
// @desc    Export Vendors to CSV Format (.csv)
// @route   GET /api/v1/superadmin/vendors/export/csv
// @access  Private (SuperAdmin)
export const exportVendorsCSV = async (req, res) => {
  try {
    const vendors = await SuperAdminVendor.find({ isDeleted: false }).sort({ createdAt: 1 });

    const headers = ['Sr No', 'Trans No', 'ID', 'Vendor Name', 'Category', 'Verification Date & Time', 'Contact No', 'State', 'City', 'Status'];

    const rowsData = vendors.map((v) => {
      const verifDate = v.verificationDateTime ? new Date(v.verificationDateTime).toLocaleString() : '';
      return [
        v.srNo || '',
        v.transNo || '',
        v.vendorId || '',
        v.vendorName || '',
        v.category || '',
        verifDate,
        v.contactNo || '',
        v.state || '',
        v.city || '',
        v.status || 'Active',
      ];
    });

    // Use reusable generateCSVData utility from src/utils/excelCsvHandler.js
    const csvContent = generateCSVData(headers, rowsData);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Vendor_Database.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error during CSV export', error: error.message });
  }
};


// EXPORT VENDORS TO PDF REPORT
// @desc    Export Vendors to PDF Format (Report view)
// @route   GET /api/v1/superadmin/vendors/export/pdf
// @access  Private (SuperAdmin)
export const exportVendorsPDF = async (req, res) => {
  try {
    const vendors = await SuperAdminVendor.find({ isDeleted: false }).sort({ createdAt: 1 });

    const headers = ['SR. NO.', 'TRANS NO.', 'VENDOR NAME', 'CATEGORY', 'VERIFICATION DATE & TIME', 'STATE', 'CITY', 'STATUS'];

    const tableRowsHtml = vendors
      .map((v, i) => {
        const verifDate = v.verificationDateTime ? new Date(v.verificationDateTime).toLocaleString() : '';
        const statusColor = v.status === 'Pending' ? '#d97706' : '#16a34a';
        return `
        <tr>
          <td>${(i + 1).toString().padStart(2, '0')}</td>
          <td><strong style="color: #ea580c;">${v.transNo}</strong></td>
          <td><strong>${v.vendorName}</strong></td>
          <td>${v.category}</td>
          <td>${verifDate}</td>
          <td>${v.state}</td>
          <td>${v.city}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${v.status}</td>
        </tr>`;
      })
      .join('');

    // Use reusable generateHTMLPDFReport utility from src/utils/excelCsvHandler.js
    const pdfHtmlReport = generateHTMLPDFReport(
      'Vendor Database Report',
      'Super Admin Master Vendor Directory',
      headers,
      tableRowsHtml,
      vendors.length
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="Vendor_Database_Report.pdf"');
    res.status(200).send(pdfHtmlReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error during PDF export', error: error.message });
  }
};
