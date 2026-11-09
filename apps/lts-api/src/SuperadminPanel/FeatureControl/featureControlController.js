import mongoose from 'mongoose';
import User from '../UserManagement/userSchema.js';
import AdminFeatureControl from './featureControlSchema.js';
import { createAuditLog } from '../../utils/auditLogger.js';

// List of the 6 granular features supported
export const FEATURE_KEYS = [
  'customerManagement',
  'vendorManagement',
  'reports',
  'exportData',
  'bulkUpload',
  'telecallerAssignment',
];

// Helper to calculate active feature count
const calculateActiveCount = (featureDoc) => {
  let count = 0;
  FEATURE_KEYS.forEach((key) => {
    if (featureDoc[key]) count++;
  });
  return count;
};

// @desc    Get List of Active Admin Users (Top Selector Bar)
// @route   GET /api/v1/feature-control/admin-users
// @access  Private (SuperAdmin)
export const getActiveAdminUsers = async (req, res) => {
  try {
    const adminUsers = await User.find({
      role: 'ADMIN',
      status: 'ACTIVE',
      isDeleted: false,
    })
      .select('_id userId fullName email phone role status avatar')
      .sort({ createdAt: 1 });

    // Include feature control stats for each admin user
    const adminUsersWithStats = await Promise.all(
      adminUsers.map(async (admin) => {
        let featureDoc = await AdminFeatureControl.findOne({ user: admin._id });
        if (!featureDoc) {
          // Create default feature control if missing
          featureDoc = await AdminFeatureControl.create({
            user: admin._id,
            userId: admin.userId,
            customerManagement: true,
            vendorManagement: true,
            reports: false,
            exportData: true,
            bulkUpload: false,
            telecallerAssignment: true,
          });
        }

        const activeCount = calculateActiveCount(featureDoc);

        return {
          ...admin.toObject(),
          activeFeaturesCount: activeCount,
          totalFeatures: 6,
          activeFeaturesRatio: `${activeCount} / 6 Active`,
        };
      })
    );

    res.json({
      totalAdminUsers: adminUsersWithStats.length,
      adminUsers: adminUsersWithStats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get Feature Control Toggles for a Specific Admin User
// @route   GET /api/v1/feature-control/admin-users/:userId
// @access  Private (SuperAdmin)
export const getAdminFeatureControl = async (req, res) => {
  const { userId } = req.params;

  try {
    // Find User by ObjectId or custom userId (e.g. ADM001)
    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId, isDeleted: false }
      : { userId: userId.trim(), isDeleted: false };

    const adminUser = await User.findOne(query).select('_id userId fullName email phone role status avatar');

    if (!adminUser) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    if (adminUser.role !== 'ADMIN') {
      return res.status(400).json({ message: 'Feature Control is only applicable to ADMIN role users' });
    }

    let featureDoc = await AdminFeatureControl.findOne({ user: adminUser._id });

    if (!featureDoc) {
      featureDoc = await AdminFeatureControl.create({
        user: adminUser._id,
        userId: adminUser.userId,
        customerManagement: true,
        vendorManagement: true,
        reports: false,
        exportData: true,
        bulkUpload: false,
        telecallerAssignment: true,
      });
    }

    const activeCount = calculateActiveCount(featureDoc);

    res.json({
      adminUser: {
        _id: adminUser._id,
        userId: adminUser.userId,
        fullName: adminUser.fullName,
        email: adminUser.email,
      },
      stats: {
        activeFeaturesCount: activeCount,
        totalFeatures: 6,
        activeFeaturesRatio: `${activeCount} / 6 Active`,
      },
      features: {
        customerManagement: featureDoc.customerManagement,
        vendorManagement: featureDoc.vendorManagement,
        reports: featureDoc.reports,
        exportData: featureDoc.exportData,
        bulkUpload: featureDoc.bulkUpload,
        telecallerAssignment: featureDoc.telecallerAssignment,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update Feature Control Settings for an Admin User ("Apply Feature Settings")
// @route   PUT /api/v1/feature-control/admin-users/:userId
// @access  Private (SuperAdmin)
export const updateAdminFeatureControl = async (req, res) => {
  const { userId } = req.params;
  const {
    customerManagement,
    vendorManagement,
    reports,
    exportData,
    bulkUpload,
    telecallerAssignment,
  } = req.body;

  try {
    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId, isDeleted: false }
      : { userId: userId.trim(), isDeleted: false };

    const adminUser = await User.findOne(query);

    if (!adminUser) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    if (adminUser.role !== 'ADMIN') {
      return res.status(400).json({ message: 'Feature Control is only applicable to ADMIN role users' });
    }

    let featureDoc = await AdminFeatureControl.findOne({ user: adminUser._id });

    if (!featureDoc) {
      featureDoc = new AdminFeatureControl({
        user: adminUser._id,
        userId: adminUser.userId,
      });
    }

    if (customerManagement !== undefined) featureDoc.customerManagement = Boolean(customerManagement);
    if (vendorManagement !== undefined) featureDoc.vendorManagement = Boolean(vendorManagement);
    if (reports !== undefined) featureDoc.reports = Boolean(reports);
    if (exportData !== undefined) featureDoc.exportData = Boolean(exportData);
    if (bulkUpload !== undefined) featureDoc.bulkUpload = Boolean(bulkUpload);
    if (telecallerAssignment !== undefined) featureDoc.telecallerAssignment = Boolean(telecallerAssignment);

    featureDoc.updatedBy = req.superAdmin._id;
    await featureDoc.save();

    // Automatic Audit Log Recording
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Updated Feature Settings',
      record: adminUser.userId || adminUser._id.toString(),
      module: 'Feature Control',
    });

    const activeCount = calculateActiveCount(featureDoc);

    res.json({
      message: `Feature settings updated successfully for ${adminUser.userId}`,
      adminUser: {
        _id: adminUser._id,
        userId: adminUser.userId,
        fullName: adminUser.fullName,
      },
      stats: {
        activeFeaturesCount: activeCount,
        totalFeatures: 6,
        activeFeaturesRatio: `${activeCount} / 6 Active`,
      },
      features: {
        customerManagement: featureDoc.customerManagement,
        vendorManagement: featureDoc.vendorManagement,
        reports: featureDoc.reports,
        exportData: featureDoc.exportData,
        bulkUpload: featureDoc.bulkUpload,
        telecallerAssignment: featureDoc.telecallerAssignment,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
