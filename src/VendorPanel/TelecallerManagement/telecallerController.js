import Telecaller from '../../Telecaller/models/Telecaller.js';
import { sendTelecallerWelcomeEmail } from './mailHelper.js';

/**
 * @desc   Create a new Telecaller linked to the Vendor
 * @route  POST /api/telecallers
 * @access Private (Vendor)
 */
export const createVendorTelecaller = async (req, res) => {
  const { name, employeeId, email, phone, password } = req.body;

  try {
    // 1. Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    if (!password || password.trim().length < 8) {
      return res.status(400).json({ message: 'Password is required and must be at least 8 characters long' });
    }

    // 2. Uniqueness Checks
    const emailLower = email.trim().toLowerCase();
    const employeeIdUpper = employeeId.trim().toUpperCase();

    const existingTelecaller = await Telecaller.findOne({
      $or: [
        { email: emailLower },
        { phone: phone.trim() },
        { employeeId: employeeIdUpper }
      ]
    });

    if (existingTelecaller) {
      if (existingTelecaller.email === emailLower) {
        return res.status(400).json({ message: 'A telecaller with this email already exists' });
      }
      if (existingTelecaller.phone === phone.trim()) {
        return res.status(400).json({ message: 'A telecaller with this phone number already exists' });
      }
      if (existingTelecaller.employeeId === employeeIdUpper) {
        return res.status(400).json({ message: 'A telecaller with this Employee ID already exists' });
      }
    }

    // 3. Create the Telecaller document
    const newTelecaller = await Telecaller.create({
      name: name.trim(),
      employeeId: employeeIdUpper,
      email: emailLower,
      phone: phone.trim(),
      password: password.trim(), // Will be hashed by pre-save hook in Telecaller model
      createdByVendor: req.vendor._id,
    });

    // 4. Send Welcome Email via MSG91
    // Run asynchronously without blocking the client response
    sendTelecallerWelcomeEmail(emailLower, name.trim(), password.trim())
      .then(emailResult => {
        if (!emailResult.success) {
          console.error(`[Email Fail] Failed to send welcome email to ${emailLower}:`, emailResult.error);
        }
      })
      .catch(err => {
        console.error('[Email Exception] Error dispatching mail:', err);
      });

    // 5. Return success
    const result = newTelecaller.toObject();
    delete result.password;

    return res.status(201).json({
      success: true,
      message: 'Telecaller account created successfully. Welcome email dispatched.',
      data: result,
    });
  } catch (error) {
    console.error('[CreateTelecaller Error]', error);
    return res.status(500).json({ message: 'Server error occurred while creating telecaller', error: error.message });
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
    return res.status(500).json({ message: 'Server error occurred while fetching telecallers', error: error.message });
  }
};
