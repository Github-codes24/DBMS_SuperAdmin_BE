
// export const BLOCKED_STATUSES = {
//     vendors: ['blocked'],
//     customers: ['blocked'],
//     telecallers: ['blocked', 'disabled'],
//   };

import SuperAdminVendor from "../SuperadminPanel/VendorDatabase/vendorDatabaseSchema.js"; 
import Customer from '../SuperadminPanel/CustomerDatabase/customerSchema.js';
import Telecaller from '../SuperadminPanel/TelecallerManagement/telecallerSchema.js';

// Statuses counted as "blocked" per model (all lowercase, compared case-insensitively)
export const BLOCKED_STATUSES = {
  vendors: ['blocked'],
  customers: ['blocked'],
  telecallers: ['blocked', 'disabled'], // Telecaller enum has DISABLED too, treated as blocked
};

export const getRoleKPI = async (Model, blockedStatuses) => {
  const [result] = await Model.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: [{ $toLower: '$status' }, 'active'] }, 1, 0] },
        },
        blocked: {
          $sum: {
            $cond: [{ $in: [{ $toLower: '$status' }, blockedStatuses] }, 1, 0],
          },
        },
      },
    },
  ]);

  const total = result?.total ?? 0;
  const active = result?.active ?? 0;
  const blocked = result?.blocked ?? 0;

  return {
    total,
    active,
    blocked,
    pending: total - active - blocked, // Pending / Rejected etc.
  };
};

export const getUserRoleKPIs = async () => {
  const [vendors, customers, telecallers] = await Promise.all([
    getRoleKPI(SuperAdminVendor, BLOCKED_STATUSES.vendors),
    getRoleKPI(Customer, BLOCKED_STATUSES.customers),
    getRoleKPI(Telecaller, BLOCKED_STATUSES.telecallers),
  ]);

  return { vendors, customers, telecallers };
};