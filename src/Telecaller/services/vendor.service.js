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
export const createVendor = async (data, performedBy, ip) => {
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
  const temporaryPassword = `Ven@${Math.floor(100000 + Math.random() * 900000)}`;

  // Hash password
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  // Create vendor
  const vendor = await Customers.create({
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

    isPaidVendor: isPaidVendor === true || isPaidVendor === "true",
  });

  // Audit log
  await TelecallerAuditLog.create({
    module: "Vendor",
    action: "CREATE_VENDOR",
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
    ipAddress: ip || "",
  });

  // Sync to SuperAdminVendor collection so it appears in SuperAdmin Vendor Directory
  try {
    const totalCount = await SuperAdminVendor.countDocuments();
    const generatedTransNo = `TRX${90101 + totalCount}`;

    await SuperAdminVendor.findOneAndUpdate(
      { vendorId: vendor.vendorId },
      {
        vendorId: vendor.vendorId,
        transNo: generatedTransNo,
        vendorName: companyName
          ? companyName.trim()
          : contactPerson
            ? contactPerson.trim()
            : "Unnamed Vendor",
        ownerName: contactPerson ? contactPerson.trim() : "",
        category: "General",
        verificationDateTime: new Date(),
        contactNo: phone ? phone.trim() : "",
        email: email ? email.trim().toLowerCase() : "",
        password: hashedPassword,
        state: state ? state.trim() : "",
        city: city ? city.trim() : "",
        completeAddress: fullAddress ? fullAddress.trim() : "",
        status: "Pending",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (syncErr) {
    console.error("Failed to sync SuperAdminVendor record:", syncErr.message);
  }

  // Email credentials trigger
  let emailSent = false;
  let emailError = null;

  if (vendor.email && vendor.email.trim()) {
    const emailResult = await sendVendorCredentialsEmail({
      toEmail: vendor.email.trim(),
      vendorName: vendor.storeName || vendor.fullName || "Vendor Partner",
      vendorId: vendor.vendorId,
      password: temporaryPassword,
    });

    if (emailResult.success) {
      emailSent = true;
    } else {
      emailSent = false;
      emailError = emailResult.error || "Failed to dispatch email";
    }
  } else {
    emailError = "Vendor email address was not provided.";
  }

  // Don't return password hash
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
    // 1. Escaped version of the raw string (handles "+" in "+91 ...")
    const safeSearch = escapeRegex(trimmed);

    // 2. Extract digits only to handle flexible phone number spacing
    const digitsOnly = trimmed.replace(/\D/g, "");
    const phonePattern = digitsOnly.length > 0 
      ? digitsOnly.split("").join("\\s*") 
      : safeSearch;

    matchStage.$or = [
      { mobile: { $regex: phonePattern, $options: "i" } },
      { name: { $regex: safeSearch, $options: "i" } },
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

  const vendors = await Customers.find(matchStage)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    page,
    limit,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    data: vendors,
  };
};
// ─── GET SINGLE VENDOR ────────────────────────────────────────────────────────

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
