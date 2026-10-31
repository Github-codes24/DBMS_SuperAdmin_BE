import Telecaller from '../../Telecaller/models/Telecaller.js';
import SuperAdminTelecaller from '../../SuperadminPanel/TelecallerManagement/telecallerSchema.js';
import { createAuditLog } from '../../utils/auditLogger.js';

/**
 * @desc   Create a new Telecaller linked to the Vendor (Status: PENDING, access requires Super Admin activation)
 * @route  POST /api/telecallers
 * @access Private (Vendor)
 */
export const createVendorTelecaller = async (req, res) => {
  const { name, employeeId, email, phone, password } = req.body;

  try {
    // 1. Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password is required and must be at least 6 characters long' });
    }

    // 2. Uniqueness Checks across BOTH collections (Telecaller and SuperAdminTelecaller)
    const emailLower = email.trim().toLowerCase();
    const employeeIdUpper = employeeId.trim().toUpperCase();
    const phoneClean = phone.trim();

    const [existingAuthTc, existingSuperTc] = await Promise.all([
      Telecaller.findOne({
        $or: [
          { email: emailLower },
          { phone: phoneClean },
          { employeeId: employeeIdUpper },
        ],
      }),
      SuperAdminTelecaller.findOne({
        $or: [
          { email: emailLower },
          { mobileNumber: phoneClean },
          { userId: employeeIdUpper },
        ],
        isDeleted: false,
      }),
    ]);

    if (existingAuthTc || existingSuperTc) {
      if (existingAuthTc?.email === emailLower || existingSuperTc?.email === emailLower) {
        return res.status(400).json({ success: false, message: 'A telecaller with this email already exists' });
      }
      if (existingAuthTc?.phone === phoneClean || existingSuperTc?.mobileNumber === phoneClean) {
        return res.status(400).json({ success: false, message: 'A telecaller with this phone number already exists' });
      }
      if (existingAuthTc?.employeeId === employeeIdUpper || existingSuperTc?.userId === employeeIdUpper) {
        return res.status(400).json({ success: false, message: 'A telecaller with this Employee ID already exists' });
      }
    }

    // 3. Create the Telecaller auth document with status: 'PENDING'
    const newTelecaller = await Telecaller.create({
      name: name.trim(),
      employeeId: employeeIdUpper,
      email: emailLower,
      phone: phoneClean,
      password: password.trim(), // Will be hashed by pre-save hook in Telecaller model
      status: 'PENDING',
      createdByVendor: req.vendor._id,
    });

    // 4. Dual-schema creation: Also create in SuperAdminTelecaller with status: 'Pending'
    try {
      await SuperAdminTelecaller.create({
        userId: employeeIdUpper,
        fullName: name.trim(),
        mobileNumber: phoneClean,
        email: emailLower,
        password: newTelecaller.password, // Uses hashed password from Telecaller pre-save
        assignedRegion: '',
        status: 'Pending',
        createdBy: null,
      });
    } catch (superTcErr) {
      console.error('[Dual-Schema Telecaller Error]', superTcErr.message);
    }

    // 5. Audit Log (Updater identity: VENDOR)
    await createAuditLog({
      user: req.vendor?.vendorId || String(req.vendor?._id),
      userName: req.vendor?.fullName || req.vendor?.storeName || 'Vendor',
      userRole: 'VENDOR',
      actorType: 'VENDOR',
      action: 'Created Telecaller',
      record: employeeIdUpper,
      module: 'Telecaller Management',
      message: `Telecaller ${employeeIdUpper} (${name.trim()}) created by Vendor: ${req.vendor?.storeName || req.vendor?.fullName} (${req.vendor?.vendorId || req.vendor?._id}) with Pending status. Access pending Super Admin activation.`,
    });

    // 6. Return response (No email sent until Super Admin activates)
    const result = newTelecaller.toObject();
    delete result.password;

    return res.status(201).json({
      success: true,
      message: 'Telecaller account created successfully with Pending status. Activation and login access must be granted by Super Admin.',
      data: result,
    });
  } catch (error) {
    console.error('[CreateTelecaller Error]', error);
    return res.status(500).json({ success: false, message: 'Server error occurred while creating telecaller', error: error.message });
  }
};

/**
 * @desc   Get list of all Telecallers created by the logged-in Vendor
 * @route  GET /api/telecallers
 * @access Private (Vendor)
 */
export const getVendorTelecallers = async (req, res) => {
  try {
    const telecallers = await Telecaller.find({ createdByVendor: req.vendor._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: telecallers.length,
      data: telecallers,
    });
  } catch (error) {
    console.error('[GetTelecallers Error]', error);
    return res.status(500).json({ success: false, message: 'Server error occurred while fetching telecallers', error: error.message });
  }
};
