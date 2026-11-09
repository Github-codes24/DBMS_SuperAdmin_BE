import mongoose from 'mongoose';
import { Role, PermissionMatrix } from './roleSchema.js';
import { createAuditLog } from '../../utils/auditLogger.js';

// Default 6 Modules Definition matching UI Screenshot
export const DEFAULT_MODULES = [
  {
    moduleKey: 'CUSTOMER_DATABASE',
    moduleName: 'Customer Database',
    moduleDescription: 'Manage customer profiles, history, and status.',
  },
  {
    moduleKey: 'VENDOR_DATABASE',
    moduleName: 'Vendor Database',
    moduleDescription: 'Access and approve vendor profiles & documentation.',
  },
  {
    moduleKey: 'CUSTOMER_VENDOR_QUERIES',
    moduleName: 'Customer & Vendor Queries',
    moduleDescription: 'Handle customer and vendor inquiries or tickets.',
  },
  {
    moduleKey: 'ANALYTICS_REPORTS',
    moduleName: 'Analytics & Reports',
    moduleDescription: 'Generate and download business performance reports.',
  },
  {
    moduleKey: 'SYSTEM_AUDIT_LOGS',
    moduleName: 'System Audit Logs',
    moduleDescription: 'View system security events and user activity trails.',
  },
  {
    moduleKey: 'USER_MANAGEMENT',
    moduleName: 'User Management',
    moduleDescription: 'Create, edit, or disable team accounts and roles.',
  },
];

// Helper to find Role by ObjectId, custom roleId (ROLE-002), or title
const findRoleByIdOrTitle = async (identifier) => {
  if (!identifier) return null;
  const str = identifier.toString().trim();

  const query = mongoose.Types.ObjectId.isValid(str)
    ? { $or: [{ _id: str }, { roleId: str }, { title: str }] }
    : { $or: [{ roleId: str }, { title: str }] };

  return Role.findOne(query);
};

// Helper to generate auto-increment Role ID
const generateRoleId = async () => {
  const lastRole = await Role.findOne({ roleId: /^ROLE-/ })
    .sort({ createdAt: -1 })
    .exec();

  let nextNumber = 1;
  if (lastRole && lastRole.roleId) {
    const numericPart = parseInt(lastRole.roleId.replace('ROLE-', ''), 10);
    if (!isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }

  return `ROLE-${nextNumber.toString().padStart(3, '0')}`;
};

// ==========================================
// 1. GET ALL ROLES WITH PRIVILEGES STATS
// ==========================================
// @desc    Get All Roles with Privileges Count
// @route   GET /api/v1/roles
// @access  Private (SuperAdmin)
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({ status: 'ACTIVE' }).sort({ isMasterRole: -1, createdAt: 1 });

    // Calculate active privileges for each role
    const rolesWithStats = await Promise.all(
      roles.map(async (role) => {
        const matrix = await PermissionMatrix.find({ roleId: role._id });
        let activePrivilegesCount = 0;

        matrix.forEach((mod) => {
          if (mod.viewAccess) activePrivilegesCount++;
          if (mod.editAccess) activePrivilegesCount++;
          if (mod.exportAccess) activePrivilegesCount++;
          if (mod.deleteAccess) activePrivilegesCount++;
        });

        return {
          ...role.toObject(),
          totalPrivileges: 24, // 6 modules * 4 granular access types
          activePrivilegesCount,
          isFullAccess: role.isMasterRole || activePrivilegesCount === 24,
        };
      })
    );

    res.json({
      totalRoles: rolesWithStats.length,
      roles: rolesWithStats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// 2. CREATE NEW CUSTOM ROLE (+ ADD ROLE MODAL)
// ==========================================
// @desc    Create New Custom Role (UI Modal)
// @route   POST /api/v1/roles
// @access  Private (SuperAdmin)
export const createRole = async (req, res) => {
  const { title, description, cloneFromRole } = req.body;

  try {
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Role title is required' });
    }

    const formattedTitle = title.trim();
    const existingRole = await Role.findOne({ title: formattedTitle });
    if (existingRole) {
      return res.status(400).json({ message: 'A role with this title already exists' });
    }

    const roleId = await generateRoleId();

    const newRole = await Role.create({
      roleId,
      title: formattedTitle,
      description: description ? description.trim() : '',
      isMasterRole: false,
      clonedFrom: cloneFromRole || null,
      createdBy: req.superAdmin._id,
    });

    // Clone initial permissions from selected role if provided
    let sourcePermissionsMap = {};
    if (cloneFromRole) {
      const sourceRole = await findRoleByIdOrTitle(cloneFromRole);
      if (sourceRole) {
        const sourceMatrix = await PermissionMatrix.find({ roleId: sourceRole._id });
        sourceMatrix.forEach((pm) => {
          sourcePermissionsMap[pm.moduleKey] = pm;
        });
      }
    }

    // Create Permission Matrix items for the new role across all 6 modules
    const matrixEntries = DEFAULT_MODULES.map((mod) => {
      const clonedPm = sourcePermissionsMap[mod.moduleKey];
      return {
        roleId: newRole._id,
        roleTitle: newRole.title,
        moduleKey: mod.moduleKey,
        moduleName: mod.moduleName,
        moduleDescription: mod.moduleDescription,
        fullAccess: clonedPm ? clonedPm.fullAccess : false,
        viewAccess: clonedPm ? clonedPm.viewAccess : false,
        editAccess: clonedPm ? clonedPm.editAccess : false,
        exportAccess: clonedPm ? clonedPm.exportAccess : false,
        deleteAccess: clonedPm ? clonedPm.deleteAccess : false,
      };
    });

    await PermissionMatrix.insertMany(matrixEntries);

    // Automatic Audit Log Recording
    await createAuditLog({
      user: req.superAdmin?.adminId || 'SUPER',
      userName: req.superAdmin?.name || 'Super Admin',
      userRole: req.superAdmin?.role || 'SUPER_ADMIN',
      action: 'Created Custom Role',
      record: newRole.roleId,
      module: 'Roles & Permissions',
    });

    res.status(201).json({
      message: 'New role created successfully',
      role: newRole,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// 3. GET PERMISSION MATRIX FOR SELECTED ROLE
// ==========================================
// @desc    Get Permissions Matrix for a Specific Role
// @route   GET /api/v1/roles/:roleId/permissions
// @access  Private (SuperAdmin)
export const getRolePermissions = async (req, res) => {
  const { roleId } = req.params;

  try {
    const role = await findRoleByIdOrTitle(roleId);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    let permissions = await PermissionMatrix.find({ roleId: role._id });

    // If permissions matrix is missing or incomplete, auto-populate default modules
    if (permissions.length < DEFAULT_MODULES.length) {
      const existingKeys = permissions.map((p) => p.moduleKey);
      const missingModules = DEFAULT_MODULES.filter((m) => !existingKeys.includes(m.moduleKey));

      if (missingModules.length > 0) {
        const newEntries = missingModules.map((mod) => ({
          roleId: role._id,
          roleTitle: role.title,
          moduleKey: mod.moduleKey,
          moduleName: mod.moduleName,
          moduleDescription: mod.moduleDescription,
          fullAccess: role.isMasterRole,
          viewAccess: role.isMasterRole,
          editAccess: role.isMasterRole,
          exportAccess: role.isMasterRole,
          deleteAccess: role.isMasterRole,
        }));
        await PermissionMatrix.insertMany(newEntries);
        permissions = await PermissionMatrix.find({ roleId: role._id });
      }
    }

    let activePrivilegesCount = 0;
    permissions.forEach((mod) => {
      if (mod.viewAccess) activePrivilegesCount++;
      if (mod.editAccess) activePrivilegesCount++;
      if (mod.exportAccess) activePrivilegesCount++;
      if (mod.deleteAccess) activePrivilegesCount++;
    });

    res.json({
      role: {
        _id: role._id,
        roleId: role.roleId,
        title: role.title,
        description: role.description,
        isMasterRole: role.isMasterRole,
        activePrivilegesCount,
        totalPrivileges: 24,
      },
      permissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// 4. UPDATE ROLE PERMISSION MATRIX (SAVE CHANGES)
// ==========================================
// @desc    Update Role Permission Matrix (Save Changes / Save Permissions)
// @route   PUT /api/v1/roles/:roleId/permissions
// @access  Private (SuperAdmin)
export const updateRolePermissions = async (req, res) => {
  const { roleId } = req.params;
  const { permissions } = req.body; // Array of module permission updates

  try {
    const role = await findRoleByIdOrTitle(roleId);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions payload must be an array of module settings' });
    }

    // Bulk update module permissions
    const updatePromises = permissions.map(async (modPerm) => {
      const { moduleKey, viewAccess, editAccess, exportAccess, deleteAccess, fullAccess } = modPerm;

      const isFull = fullAccess || (viewAccess && editAccess && exportAccess && deleteAccess);

      return PermissionMatrix.findOneAndUpdate(
        { roleId: role._id, moduleKey },
        {
          fullAccess: Boolean(isFull),
          viewAccess: Boolean(viewAccess || isFull),
          editAccess: Boolean(editAccess || isFull),
          exportAccess: Boolean(exportAccess || isFull),
          deleteAccess: Boolean(deleteAccess || isFull),
        },
        { new: true, upsert: true }
      );
    });

    await Promise.all(updatePromises);

    const updatedPermissions = await PermissionMatrix.find({ roleId: role._id });

    res.json({
      message: 'Permissions updated successfully',
      roleId: role._id,
      roleTitle: role.title,
      permissions: updatedPermissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// 5. QUICK ACTIONS FOR PERMISSIONS
// ==========================================
// @desc    Quick Actions for Permissions (Grant All, Revoke All, Reset)
// @route   POST /api/v1/roles/:roleId/permissions/quick-action
// @access  Private (SuperAdmin)
export const quickActionPermissions = async (req, res) => {
  const { roleId } = req.params;
  const { action } = req.body; // 'GRANT_ALL', 'REVOKE_ALL', 'RESET'

  try {
    const role = await findRoleByIdOrTitle(roleId);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    let updateState = {
      fullAccess: false,
      viewAccess: false,
      editAccess: false,
      exportAccess: false,
      deleteAccess: false,
    };

    if (action === 'GRANT_ALL') {
      updateState = {
        fullAccess: true,
        viewAccess: true,
        editAccess: true,
        exportAccess: true,
        deleteAccess: true,
      };
    } else if (action === 'RESET' && role.isMasterRole) {
      updateState = {
        fullAccess: true,
        viewAccess: true,
        editAccess: true,
        exportAccess: true,
        deleteAccess: true,
      };
    }

    await PermissionMatrix.updateMany({ roleId: role._id }, updateState);

    const updatedPermissions = await PermissionMatrix.find({ roleId: role._id });

    res.json({
      message: `Action ${action} executed successfully`,
      permissions: updatedPermissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
