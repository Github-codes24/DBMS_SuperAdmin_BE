import Telecaller from '../../Telecaller/models/Telecaller.js';
import SuperAdminTelecaller from '../../SuperadminPanel/TelecallerManagement/telecallerSchema.js';
import { generateTelecallerId } from '../../SuperadminPanel/TelecallerManagement/telecallerController.js';

/**
 * @desc   Create a new Telecaller linked to the Vendor (Pending Super Admin Activation)
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
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Auto-generate employeeId if not provided
    const employeeIdUpper = (employeeId && employeeId.trim())
      ? employeeId.trim().toUpperCase()
      : await generateTelecallerId();

    // Auto-generate temporary password if not provided
    const rawPassword = (password && password.trim().length >= 6)
      ? password.trim()
      : `Tc@${Math.floor(100000 + Math.random() * 900000)}`;

    // 2. Uniqueness Checks across both Telecaller auth model and SuperAdmin directory
    const emailLower = email.trim().toLowerCase();
    const phoneTrimmed = phone.trim();

    // Check collision in Telecaller auth collection
    const existingAuth = await Telecaller.findOne({
      $or: [
        { email: emailLower },
        { phone: phoneTrimmed },
        { employeeId: employeeIdUpper },
      ],
    });

    if (existingAuth) {
      if (existingAuth.email === emailLower) {
        return res.status(409).json({ success: false, message: `Telecaller with email '${emailLower}' already exists` });
      }
      if (existingAuth.phone === phoneTrimmed) {
        return res.status(409).json({ success: false, message: `Telecaller with phone number '${phoneTrimmed}' already exists` });
      }
      if (existingAuth.employeeId === employeeIdUpper) {
        return res.status(409).json({ success: false, message: `Telecaller with Employee ID '${employeeIdUpper}' already exists` });
      }
    }

    // Check collision in SuperAdminTelecaller collection
    const existingMaster = await SuperAdminTelecaller.findOne({
      $or: [
        { email: emailLower },
        { mobileNumber: phoneTrimmed },
        { userId: employeeIdUpper },
      ],
      isDeleted: false,
    });

    if (existingMaster) {
      if (existingMaster.email === emailLower) {
        return res.status(409).json({ success: false, message: `Telecaller with email '${emailLower}' already exists in Super Admin records` });
      }
      if (existingMaster.mobileNumber === phoneTrimmed) {
        return res.status(409).json({ success: false, message: `Telecaller with phone number '${phoneTrimmed}' already exists in Super Admin records` });
      }
      if (existingMaster.userId === employeeIdUpper) {
        return res.status(409).json({ success: false, message: `Telecaller with Employee ID '${employeeIdUpper}' already exists in Super Admin records` });
      }
    }

    // 3. Create the Telecaller document with status PENDING (Vendor cannot give access)
    const newTelecaller = await Telecaller.create({
      name: name.trim(),
      employeeId: employeeIdUpper,
      email: emailLower,
      phone: phoneTrimmed,
      password: rawPassword, // Will be hashed by pre-save hook in Telecaller model
      role: 'TELECALLER',
      status: 'PENDING',
      createdByVendor: req.vendor._id,
    });

    // 4. Sync to SuperAdminTelecaller master directory with status Pending
    try {
      await SuperAdminTelecaller.findOneAndUpdate(
        {
          $or: [
            { email: emailLower },
            { mobileNumber: phoneTrimmed },
            { userId: employeeIdUpper },
          ],
        },
        {
          userId: employeeIdUpper,
          fullName: name.trim(),
          mobileNumber: phoneTrimmed,
          email: emailLower,
          password: rawPassword, // Will be hashed by pre-save hook
          status: 'Pending',
          createdByVendor: req.vendor._id,
          isDeleted: false,
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    } catch (syncErr) {
      console.error('[Vendor Telecaller Sync Warning] SuperAdminTelecaller sync error:', syncErr.message);
    }

    // Note: Credentials email is intentionally NOT sent here.
    // Vendor creates the account, but access is only granted when Super Admin activates it.

    // 5. Return success
    const result = newTelecaller.toObject();
    delete result.password;

    return res.status(201).json({
      success: true,
      message: 'Telecaller account created successfully. Account is pending activation by Super Admin. Access will be granted once approved.',
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
      .select('-password')
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
