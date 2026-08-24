import bcrypt from 'bcryptjs';
import Vendor from '../Authentication/authSchema.js';

// @desc    Update vendor profile details
// @route   PUT /api/profile
// @access  Private
export const updateVendorProfile = async (req, res) => {
  const { fullName, email, phone, designation, regionalJurisdiction, avatar } = req.body;

  try {
    const vendor = await Vendor.findById(req.vendor._id);

    if (vendor) {
      if (email && email.toLowerCase() !== vendor.email) {
        const emailExists = await Vendor.findOne({ email: email.toLowerCase() });
        if (emailExists) {
          return res.status(400).json({ message: 'Email address already in use' });
        }
        vendor.email = email.toLowerCase();
      }

      vendor.fullName = fullName !== undefined ? fullName.trim() : vendor.fullName;
      vendor.phone = phone !== undefined ? phone.trim() : vendor.phone;
      vendor.designation = designation !== undefined ? designation.trim() : vendor.designation;
      vendor.regionalJurisdiction = regionalJurisdiction !== undefined ? regionalJurisdiction.trim() : vendor.regionalJurisdiction;
      vendor.avatar = avatar !== undefined ? avatar : vendor.avatar;

      const updatedVendor = await vendor.save();
      res.json({
        _id: updatedVendor._id,
        vendorId: updatedVendor.vendorId,
        fullName: updatedVendor.fullName,
        email: updatedVendor.email,
        phone: updatedVendor.phone,
        designation: updatedVendor.designation,
        regionalJurisdiction: updatedVendor.regionalJurisdiction,
        storeName: updatedVendor.storeName,
        storeStatus: updatedVendor.storeStatus,
        avatar: updatedVendor.avatar,
      });
    } else {
      res.status(404).json({ message: 'Vendor not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update security password
// @route   PUT /api/profile/password
// @access  Private
export const updateVendorPassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide all password fields' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    const vendor = await Vendor.findById(req.vendor._id);

    if (vendor) {
      const isMatch = await bcrypt.compare(currentPassword, vendor.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }

      const salt = await bcrypt.genSalt(10);
      vendor.password = await bcrypt.hash(newPassword, salt);

      await vendor.save();
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(404).json({ message: 'Vendor not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update system settings/preferences
// @route   PUT /api/profile/preferences
// @access  Private
export const updateVendorPreferences = async (req, res) => {
  const { twoFactorAuth, emailAlerts, syncFrequency } = req.body;

  try {
    const vendor = await Vendor.findById(req.vendor._id);

    if (vendor) {
      vendor.twoFactorAuth = twoFactorAuth !== undefined ? twoFactorAuth : vendor.twoFactorAuth;
      vendor.emailAlerts = emailAlerts !== undefined ? emailAlerts : vendor.emailAlerts;
      vendor.syncFrequency = syncFrequency !== undefined ? syncFrequency : vendor.syncFrequency;

      const updatedVendor = await vendor.save();
      res.json({
        twoFactorAuth: updatedVendor.twoFactorAuth,
        emailAlerts: updatedVendor.emailAlerts,
        syncFrequency: updatedVendor.syncFrequency,
      });
    } else {
      res.status(404).json({ message: 'Vendor not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
