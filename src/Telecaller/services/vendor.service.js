import mongoose from "mongoose";
import SuperAdminVendor from "../../SuperadminPanel/VendorDatabase/vendorDatabaseSchema.js";
import VendorImage from "../models/VendorImage.js";
import Customers from "../../SuperadminPanel/CustomerDatabase/customerSchema.js"
import VendorFollowup from "../models/VendorFollowup.js";
import VendorNotification from "../models/VendorNotification.js";
import PaymentOrder from "../models/PaymentOrder.js";
import TelecallerAuditLog from "../models/TelecallerAuditLog.js";
import bcrypt from "bcryptjs";
import { sendVendorCredentialsEmail } from "../../utils/emailHandler.js";
 import Telecaller from "../models/Telecaller.js"

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
    ipAddress: ipAddress || "",
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
    const randomNumber = Math.floor(100000 + Math.random() * 900000);

    vendorId = `VEN${randomNumber}`;

    exists = await Customers.exists({ vendorId });
  }

  return vendorId;
};

// CREATE VENDOR

// import TelecallerAuditLog from ...
// import SuperAdminVendor from ...
// import { sendVendorCredentialsEmail } from ...

export const createVendor = async (data, performedBy, ip) => {
  const {
    companyName,
    contactPerson,

    phone,
    mobile,
    whatsapp,
    email,
    state,
    city,
    name,
    locality,
    isPaidVendor,
    fullAddress,
    address,
    customerId: inputCustomerId,
  } = data;

  // 1. Generate vendorId / customerId
  const vendorId = data.vendorId || (await generateVendorId());
  const finalCustomerId = inputCustomerId || vendorId;

  // 2. Generate temporary password
  const temporaryPassword = `Ven@${Math.floor(100000 + Math.random() * 900000)}`;
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  const contactPhone = phone || mobile || '';
  const vendorContactName = contactPerson || fullName || name || '';
  const vendorAddress = fullAddress || address || '';

  // 3. Create document in 'customers' collection
  const sanitizedCompanyName = companyName ? companyName.trim() : '';
if (!sanitizedCompanyName) {
  throw new Error('Company name is required.');
}

// 2. Validate createdBy ObjectId safely
const createdById =
  performedBy && mongoose.Types.ObjectId.isValid(performedBy)
    ? new mongoose.Types.ObjectId(performedBy)
    : null;

const vendor = await Customers.create({
  customerId: finalCustomerId,
  vendorId: vendorId || '',
  password: hashedPassword,
  fullName: vendorContactName || '',
  companyName: sanitizedCompanyName,
  mobileNumber: contactPhone ? String(contactPhone).trim() : '',
  whatsapp: whatsapp ? String(whatsapp).trim() : '',
  email: email ? email.trim().toLowerCase() : '',
  state: state ? state.trim() : '',
  city: city ? city.trim() : '',
  locality: locality ? locality.trim() : '',
  address: typeof vendorAddress === 'string' ? vendorAddress.trim() : '',
  isPaidVendor: isPaidVendor === true || isPaidVendor === 'true' || isPaidVendor === 'yes',
  assignedTelecaller: performedBy ? String(performedBy) : '',
  createdBy: createdById,
  status: 'Active',
});

  // 4. Audit Log
  try {
    await TelecallerAuditLog.create({
      module: 'Vendor',
      action: 'CREATE_VENDOR',
      vendorId: vendor._id,
      performedBy,
      oldData: null,
      newData: {
        vendorId: vendor.vendorId,
        fullName: vendor.fullName,
        companyName: vendor.companyName,
        phone: vendor.phone,
        email: vendor.email,
      },
      ipAddress: ip || '',
    });
  } catch (auditErr) {
    console.error('AuditLog error:', auditErr.message);
  }

  // 5. SuperAdmin Vendor Directory Sync
  try {
    const totalCount = await SuperAdminVendor.countDocuments();
    const generatedTransNo = `TRX${90101 + totalCount}`;

    await SuperAdminVendor.findOneAndUpdate(
      { vendorId: vendor.vendorId },
      {
        vendorId: vendor.vendorId,
        transNo: generatedTransNo,
        vendorName: vendor.companyName || vendor.fullName || 'Unnamed Vendor',
        ownerName: vendor.fullName || '',
        category: 'General',
        verificationDateTime: new Date(),
        contactNo: vendor.phone,
        email: vendor.email,
        password: hashedPassword,
        state: vendor.state,
        city: vendor.city,
        completeAddress: vendor.address,
        status: 'Pending',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (syncErr) {
    console.error('Failed to sync SuperAdminVendor record:', syncErr.message);
  }

  // 6. Email notification
  let emailSent = false;
  let emailError = null;

  if (vendor.email && vendor.email.trim()) {
    try {
      const emailResult = await sendVendorCredentialsEmail({
        toEmail: vendor.email.trim(),
        vendorName: vendor.companyName || vendor.fullName || 'Vendor Partner',
        vendorId: vendor.vendorId,
        password: temporaryPassword,
      });

      if (emailResult && emailResult.success) {
        emailSent = true;
      } else {
        emailError = emailResult?.error || 'Failed to dispatch email';
      }
    } catch (err) {
      emailError = err.message;
    }
  } else {
    emailError = 'Vendor email address was not provided.';
  }

  const result = vendor.toObject();
  delete result.password;

  return {
    ...result,
    temporaryPassword,
    emailSent,
    ...(emailError && { emailError }),
  };
};
// ─── LIST VENDORS ─────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered, searchable list of vendors.
 */
// Helper to escape special regex characters (like +, ?, *, etc.)
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

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

  if (search) {
    const trimmed = search.trim();
    const safeSearch = escapeRegex(trimmed);

    const digitsOnly = trimmed.replace(/\D/g, "");
    const phonePattern = digitsOnly.length > 0 
      ? digitsOnly.split("").join("\\s*") 
      : safeSearch;

    matchStage.$or = [
      { 
        mobile: { $regex: phonePattern, $options: "i" } ,
        mobileNumber: { $regex: phonePattern, $options: "i" } },
      { fullName: { $regex: safeSearch, $options: "i" } },
      { companyName: { $regex: safeSearch, $options: "i" } },
      { customerId: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (vendorCode) {
    matchStage.customerId = {
      $regex: escapeRegex(vendorCode.trim()),
      $options: "i",
    };
  }

  if (state) {
    matchStage.state = {
      $regex: escapeRegex(state.trim()),
      $options: "i",
    };
  }

  if (city) {
    matchStage.city = {
      $regex: escapeRegex(city.trim()),
      $options: "i",
    };
  }

  const sort = {};
  sort[sortBy || "createdAt"] = sortOrder === "asc" ? 1 : -1;

  const totalRecords = await Customers.countDocuments(matchStage);

  // If no match found, exit early
  if (totalRecords === 0) {
    return {
      found: false,
      page,
      limit,
      totalRecords: 0,
      totalPages: 0,
      data: [],
    };
  }

  const vendors = await Customers.find(matchStage)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    found: true,
    page,
    limit,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    data: vendors,
  };
};
/**
 * Return a complete vendor profile using aggregation.
 */


export const getVendorFullProfile = async (customerId) => {
  // 1. Guard against invalid ObjectId to prevent unhandled runtime errors
  console.log(customerId);
  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
    console.log(customerId);
    return null;
  }
  console.log("hehe");
  
  const objectId = new mongoose.Types.ObjectId(customerId);
  
  const [customer] = await Customers.aggregate([
    // Match customer by _id
    {
      $match: {
        _id: objectId,
      },
    },

    // Exclude sensitive fields
    {
      $project: {
        password: 0,
      },
    },

    // Images (Check if foreign key in image collection is customerId or vendorId)
    {
      $lookup: {
        from: "vendorimages", // Change to "customerimages" if you have a separate collection
        let: { cid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$customerId", "$$cid"] }, // Use $customerId if referencing customers
                  { $eq: ["$isDeleted", false] },
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
        as: "images",
      },
    },

    // Payment Orders
    {
      $lookup: {
        from: "paymentorders",
        let: { cid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$customerId", "$$cid"],
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
        as: "paymentOrders",
      },
    },

    // Followups
    {
      $lookup: {
        from: "customerfollowups", // Adjust collection name if distinct for customers
        let: { cid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$customerId", "$$cid"],
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
        as: "followups",
      },
    },

    // Notifications
    {
      $lookup: {
        from: "customernotifications", // Adjust collection name if distinct for customers
        let: { cid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$customerId", "$$cid"],
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
        as: "notifications",
      },
    },
  ]);

  console.log("hehe");
  return customer;
};

// ─── GET VENDOR CATEGORY ──────────────────────────────────────────────────────

export const getVendorCategory = async (vendorId) => {
  const vendor = await Customers.findById(vendorId)
    .select("category specialization keywords")
    .lean();

  if (!vendor) return null;

  return {
    category: vendor.category || "",
    specialization: vendor.specialization || "",
    keywords: vendor.keywords || [],
  };
};
// ─── UPDATE VENDOR PERSONAL INFO ──────────────────────────────────────────────

export const updateVendorPersonal = async (
  vendorId,
  updates,
  performedBy,
  ip,
) => {
  const vendor = await Customers.findById(vendorId);

  console.log(vendorId);
  if (!vendor) return null;
  const oldData = {
    fullName: vendor.fullName,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    gst: vendor.gst,
  };

  const allowedFields = [
    "fullName",
    "storeName",
    "country",
    "state",
    "city",
    "locality",
    "email",
    "gst",
    "address",
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      vendor[field] =
        typeof updates[field] === "string"
          ? updates[field].trim()
          : updates[field];
    }
  });

  const updated = await vendor.save();

  await createAuditLog({
    module: "Vendor",
    action: "UPDATE_PERSONAL",
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
  ip,
) => {
  // 1. Fetch vendor
  const vendor = await Customer.findById(vendorId);
  if (!vendor) return null;

  // 2. Snapshot old data for audit
  const oldData = {
    whatsapp: vendor.whatsapp || "",
    alternateContact: vendor.alternateContact || "",
    website: vendor.website || "",
    listingType: vendor.listingType || "",
    paymentTerm: vendor.paymentTerm || "",
    packageAmount: vendor.packageAmount || "",
    lastPayment: vendor.lastPayment || "",
    nextDue: vendor.nextDue || "",
    invoiceNumber: vendor.invoiceNumber || "",
    isPaidVendor: vendor.isPaidVendor || "",
  };

  const allowedFields = [
    "whatsapp",
    "alternateContact",
    "website",
    "listingType",
    "paymentTerm",
    "packageAmount",
    "lastPayment",
    "nextDue",
    "invoiceNumber",
    "isPaidVendor"
  ];

  // 3. Apply updates
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      vendor[field] =
        typeof updates[field] === "string"
          ? updates[field].trim()
          : updates[field];
    }
  });

  const updated = await vendor.save();

  // 4. Create Audit Log
  if (typeof createAuditLog === "function") {
    await createAuditLog({
      module: "Vendor",
      action: "UPDATE_CONTACT_PAYMENT",
      vendorId: vendor._id,
      performedBy: performedBy || null,
      oldData,
      newData: updates,
      ipAddress: ip,
    });
  }

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
  ip,
) => {
  const vendor = await Customer.findById(vendorId);

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
    module: "Vendor",
    action: "UPDATE_CATEGORY",
    vendorId: vendor._id,
    performedBy,
    oldData,
    newData: updates,
    ipAddress: ip,
  });

  return updated;
};

// SEARCH TELLECALLER USING CATEGORY

export const listTelecallers = async ({
  page,
  limit,
  search,
  status,
  sortBy,
  sortOrder,
}) => {
  const skip = (page - 1) * limit;

  const filter = {
    role: "TELECALLER",
  };

  if (search) {
    filter.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        employeeId: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
      {
        phone: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (status) {
    filter.status = status;
  }

  const sort = {};
  sort[sortBy || "createdAt"] =
    sortOrder === "asc" ? 1 : -1;

  const totalRecords =
    await Telecaller.countDocuments(filter);

  const telecallers = await Telecaller.find(filter)
    .select("-password")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    page,
    limit,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    data: telecallers,
  };
};
