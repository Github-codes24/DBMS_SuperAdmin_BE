import mongoose from 'mongoose';
import Vendor from '../../VendorPanel/Authentication/authSchema.js';
import VendorImage from '../models/VendorImage.js';
import VendorFollowup from '../models/VendorFollowup.js';
import VendorNotification from '../models/VendorNotification.js';
import PaymentOrder from '../models/PaymentOrder.js';
import TelecallerAuditLog from '../models/TelecallerAuditLog.js';
import bcrypt from 'bcryptjs';



// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Persist an audit log entry for any mutation.
 */
export const createAuditLog = async ({
  module,
  action,
  vendorId,
  performedBy,
  oldData,
  newData,
  ipAddress,
}) => {
  await TelecallerAuditLog.create({
    module,
    action,
    vendorId,
    performedBy,
    oldData,
    newData,
    ipAddress: ipAddress || '',
  });
};

// ─── CREATE VENDOR ────────────────────────────────────────────────────────────

/**
 * Create a new vendor from Telecaller CRM.
 */

// Generate unique vendor ID
const generateVendorId = async () => {
  let vendorId;
  let exists = true;

  while (exists) {
    const randomNumber = Math.floor(
      100000 + Math.random() * 900000
    );

    vendorId = `VEN${randomNumber}`;

    exists = await Vendor.exists({ vendorId });
  }

  return vendorId;
};

// CREATE VENDOR
export const createVendor = async (
  data,
  performedBy,
  ip
) => {
  const {
    companyName,
    contactPerson,
    phone,
    whatsapp,
    email,
    state,
    city,
    locality,
    isPaidVendor,
    fullAddress,
  } = data;

  // Generate vendor ID
  const vendorId = await generateVendorId();

  // Generate temporary password
  const temporaryPassword =
    `Ven@${Math.floor(100000 + Math.random() * 900000)}`;

  // Hash password
  const hashedPassword = await bcrypt.hash(
    temporaryPassword,
    10
  );

  // Create vendor
  const vendor = await Vendor.create({
    vendorId,

    password: hashedPassword,

    fullName: contactPerson,

    storeName: companyName,

    phone,

    whatsapp,

    email,

    state,

    city,

    locality,

    address: fullAddress,

    isPaidVendor:
      isPaidVendor === true ||
      isPaidVendor === 'true',
  });

  // Audit log
  await TelecallerAuditLog.create({
    module: 'Vendor',
    action: 'CREATE_VENDOR',
    vendorId: vendor._id,
    performedBy,
    oldData: null,
    newData: {
      vendorId: vendor.vendorId,
      fullName: vendor.fullName,
      storeName: vendor.storeName,
      phone: vendor.phone,
      email: vendor.email,
    },
    ipAddress: ip || '',
  });

  // Don't return password hash
  const result = vendor.toObject();

  delete result.password;

  return {
    ...result,

    // Return this only if your business requirement
    // is to show the initial password to the telecaller.
    temporaryPassword,
  };
};
// ─── LIST VENDORS ─────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered, searchable list of vendors.
 */
export const listVendors = async ({
  page,
  limit,
  search,
  vendorCode,
  isPaid,
  state,
  city,
  sortBy,
  sortOrder,
}) => {
  const skip = (page - 1) * limit;

  const matchStage = {};

  // Text search across name, storeName, email
  if (search) {
    matchStage.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { storeName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // Vendor code search
  if (vendorCode) {
    matchStage.vendorId = {
      $regex: vendorCode,
      $options: 'i',
    };
  }

  // State filter
  if (state) {
    matchStage['address.state'] = {
      $regex: state,
      $options: 'i',
    };
  }

  // City filter
  if (city) {
    matchStage['address.city'] = {
      $regex: city,
      $options: 'i',
    };
  }

  // Build sort
  const sort = {};
  sort[sortBy || 'createdAt'] =
    sortOrder === 'asc' ? 1 : -1;

  const totalRecords = await Vendor.countDocuments(matchStage);

  const vendors = await Vendor.find(matchStage)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  // If isPaid filter
  let result = vendors;

  if (isPaid !== undefined) {
    const paidVendorIds = await PaymentOrder.distinct(
      'vendorId',
      {
        paymentStatus: 'Paid',
      }
    );

    const paidSet = new Set(
      paidVendorIds.map(String)
    );

    result = vendors.filter((v) => {
      const inSet = paidSet.has(
        String(v._id)
      );

      return isPaid === 'true'
        ? inSet
        : !inSet;
    });
  }

  return {
    page,
    limit,
    totalRecords,
    totalPages: Math.ceil(
      totalRecords / limit
    ),
    data: result,
  };
};

// ─── GET SINGLE VENDOR ────────────────────────────────────────────────────────

/**
 * Return a complete vendor profile using aggregation.
 */
export const getVendorFullProfile = async (
  vendorId
) => {
  const objectId =
    new mongoose.Types.ObjectId(vendorId);

  const [vendor] = await Vendor.aggregate([
    {
      $match: {
        _id: objectId,
      },
    },

    {
      $project: {
        password: 0,
      },
    },

    // Images
    {
      $lookup: {
        from: 'vendorimages',
        let: {
          vid: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$vendorId',
                      '$$vid',
                    ],
                  },
                  {
                    $eq: [
                      '$isDeleted',
                      false,
                    ],
                  },
                ],
              },
            },
          },
          {
            $sort: {
              isPrimary: -1,
              createdAt: -1,
            },
          },
        ],
        as: 'images',
      },
    },

    // Payment Orders
    {
      $lookup: {
        from: 'paymentorders',
        let: {
          vid: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  '$vendorId',
                  '$$vid',
                ],
              },
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $limit: 5,
          },
        ],
        as: 'paymentOrders',
      },
    },

    // Followups
    {
      $lookup: {
        from: 'vendorfollowups',
        let: {
          vid: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  '$vendorId',
                  '$$vid',
                ],
              },
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $limit: 10,
          },
        ],
        as: 'followups',
      },
    },

    // Notifications
    {
      $lookup: {
        from: 'vendornotifications',
        let: {
          vid: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  '$vendorId',
                  '$$vid',
                ],
              },
            },
          },
          {
            $sort: {
              sentAt: -1,
            },
          },
          {
            $limit: 10,
          },
        ],
        as: 'notifications',
      },
    },
  ]);

  return vendor || null;
};



// ─── GET VENDOR CATEGORY ──────────────────────────────────────────────────────

export const getVendorCategory = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId)
    .select('category specialization keywords')
    .lean();

  if (!vendor) return null;

  return {
    category: vendor.category || '',
    specialization: vendor.specialization || '',
    keywords: vendor.keywords || [],
  };
};
// ─── UPDATE VENDOR PERSONAL INFO ──────────────────────────────────────────────

export const updateVendorPersonal = async (
  vendorId,
  updates,
  performedBy,
  ip
) => {
  const vendor =
    await Vendor.findById(vendorId);

  if (!vendor) return null;

  const oldData = {
    fullName: vendor.fullName,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    gst: vendor.gst,
  };

  const allowedFields = [
    'fullName',
    'storeName',
    'country',
    'state',
    'city',
    'locality',
    'email',
    'gst',
    'address',
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      vendor[field] =
        typeof updates[field] === 'string'
          ? updates[field].trim()
          : updates[field];
    }
  });

  const updated =
    await vendor.save();

  await createAuditLog({
    module: 'Vendor',
    action: 'UPDATE_PERSONAL',
    vendorId: vendor._id,
    performedBy,
    oldData,
    newData: updates,
    ipAddress: ip,
  });

  return updated;
};

// ─── UPDATE CONTACT & PAYMENT ─────────────────────────────────────────────────

export const updateVendorContactPayment = async (
  vendorId,
  updates,
  performedBy,
  ip
) => {
  const vendor =
    await Vendor.findById(vendorId);

  if (!vendor) return null;

  const oldData = {
    whatsapp: vendor.whatsapp,
    alternateContact:
      vendor.alternateContact,
    website: vendor.website,
    listingType:
      vendor.listingType,
    paymentTerm:
      vendor.paymentTerm,
    packageAmount:
      vendor.packageAmount,
    lastPayment:
      vendor.lastPayment,
    nextDue:
      vendor.nextDue,
    invoiceNumber:
      vendor.invoiceNumber,
  };

  const allowedFields = [
    'whatsapp',
    'alternateContact',
    'website',
    'listingType',
    'paymentTerm',
    'packageAmount',
    'lastPayment',
    'nextDue',
    'invoiceNumber',
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      vendor[field] =
        typeof updates[field] === 'string'
          ? updates[field].trim()
          : updates[field];
    }
  });

  const updated =
    await vendor.save();

  await createAuditLog({
    module: 'Vendor',
    action: 'UPDATE_CONTACT_PAYMENT',
    vendorId: vendor._id,
    performedBy,
    oldData,
    newData: updates,
    ipAddress: ip,
  });

  return updated;
};

// ─── UPDATE CATEGORY ──────────────────────────────────────────────────────────

// export const updateVendorCategory = async (
//   vendorId,
//   updates,
//   performedBy,
//   ip
// ) => {
//   const vendor =
//     await Vendor.findById(vendorId);

//   if (!vendor) return null;

//   const oldData = {
//     primaryCategory:
//       vendor.primaryCategory,
//     specialization:
//       vendor.specialization,
//     keywords:
//       vendor.keywords,
//   };

//   const allowedFields = [
//     'primaryCategory',
//     'specialization',
//     'keywords',
//   ];

//   allowedFields.forEach((field) => {
//     if (updates[field] !== undefined) {
//       vendor[field] =
//         updates[field];
//     }
//   });

//   const updated =
//     await vendor.save();

//   await createAuditLog({
//     module: 'Vendor',
//     action: 'UPDATE_CATEGORY',
//     vendorId: vendor._id,
//     performedBy,
//     oldData,
//     newData: updates,
//     ipAddress: ip,
//   });

//   return updated;
// };


export const updateVendorCategory = async (
  vendorId,
  updates,
  performedBy,
  ip
) => {
  const vendor = await Vendor.findById(vendorId);

  if (!vendor) return null;

  const oldData = {
    category: vendor.category,
    specialization: vendor.specialization,
    keywords: vendor.keywords,
  };

  // Update category
  if (updates.category !== undefined) {
    vendor.category = updates.category;
  }

  // Update specialization
  if (updates.specialization !== undefined) {
    vendor.specialization = updates.specialization;
  }

  // Update keywords
  if (updates.keywords !== undefined) {
    vendor.keywords = updates.keywords;
  }

  const updated = await vendor.save();

  await createAuditLog({
    module: 'Vendor',
    action: 'UPDATE_CATEGORY',
    vendorId: vendor._id,
    performedBy,
    oldData,
    newData: updates,
    ipAddress: ip,
  });

  return updated;
};