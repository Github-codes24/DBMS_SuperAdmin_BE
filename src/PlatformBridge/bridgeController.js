import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import SuperAdminVendor from "../SuperadminPanel/VendorDatabase/vendorDatabaseSchema.js";
import Customer from "../SuperadminPanel/CustomerDatabase/customerSchema.js";
import Telecaller from "../SuperadminPanel/TelecallerManagement/telecallerSchema.js";
import User from "../SuperadminPanel/UserManagement/userSchema.js";
import AuditLog from "../SuperadminPanel/AuditLogs/auditLogSchema.js";
import { Role, PermissionMatrix } from "../SuperadminPanel/RolesAndPermissions/roleSchema.js";
import SuperAdmin from "../SuperadminPanel/Authentication/authSchema.js";
import Vendor from "../VendorPanel/Authentication/authSchema.js";
import SupportTicket from "../VendorPanel/HelpSupport/supportSchema.js";
import Order from "../VendorPanel/Orders/orderSchema.js";

/**
 * Standardized Platform Bridge Health Controller
 * Reports system uptime, MongoDB connection status, and latency.
 */
export const getBridgeHealth = async (req, res) => {
  const startTime = Date.now();
  let dbConnected = false;
  let dbLatencyMs = 0;
  let dbName = "unknown";

  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      dbConnected = true;
      dbName = mongoose.connection.name || "LTS-DBMS";
      const pingStart = Date.now();
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
      dbLatencyMs = Date.now() - pingStart;
    }
  } catch (dbError) {
    console.error("[PlatformBridgeHealth] DB Ping failed:", dbError.message);
    dbConnected = false;
  }

  const isHealthy = dbConnected;
  const totalLatencyMs = Date.now() - startTime;

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? "healthy" : "degraded",
      service: "lts-dbms-backend",
      projectCode: "LTS",
      version: "1.0.0",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        name: dbName,
        latencyMs: dbLatencyMs,
      },
      system: {
        nodeVersion: process.version,
        memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        responseTimeMs: totalLatencyMs,
      },
      authenticated: Boolean(req.isPlatformBridge),
    },
  });
};

/**
 * Standardized Platform Bridge Stats Aggregator
 * Gathers operational metrics across SuperAdmin, Vendor, and Telecaller domains.
 */
export const getBridgeStats = async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Safe document count helper that gracefully handles missing collections
  const safeCount = async (model, query = {}) => {
    try {
      if (!model) return 0;
      return await model.countDocuments(query);
    } catch {
      return 0;
    }
  };

  const [
    totalVendors,
    newVendorsToday,
    totalCustomers,
    newCustomersToday,
    totalTelecallers,
    activeTelecallers,
    totalUsers,
    activeUsers,
    totalSuperAdmins,
    totalSupportTickets,
    pendingSupportTickets,
    totalAuditLogs,
    totalOrders,
  ] = await Promise.all([
    safeCount(SuperAdminVendor, { isDeleted: false }),
    safeCount(SuperAdminVendor, { isDeleted: false, createdAt: { $gte: startOfDay } }),
    safeCount(Customer, { isDeleted: false }),
    safeCount(Customer, { isDeleted: false, createdAt: { $gte: startOfDay } }),
    safeCount(Telecaller, { isDeleted: false }),
    safeCount(Telecaller, { isDeleted: false, status: { $in: ["Active", "ACTIVE"] } }),
    safeCount(User, { isDeleted: false }),
    safeCount(User, { isDeleted: false, status: "ACTIVE" }),
    safeCount(SuperAdmin, {}),
    safeCount(SupportTicket, {}),
    safeCount(SupportTicket, { status: { $regex: /pending/i } }),
    safeCount(AuditLog, {}),
    safeCount(Order, {}),
  ]);

  return res.json({
    success: true,
    data: {
      projectCode: "LTS",
      projectName: "Local Trade Street",
      timestamp: new Date().toISOString(),
      summary: {
        totalVendors,
        newVendorsToday,
        totalCustomers,
        newCustomersToday,
        totalTelecallers,
        activeTelecallers,
        totalAdminUsers: totalUsers + totalSuperAdmins,
        activeAdminUsers: activeUsers,
        totalSupportTickets,
        pendingSupportTickets,
        totalAuditLogs,
        totalOrders,
      },
      kpis: [
        {
          key: "vendors",
          label: "Registered Vendors",
          value: totalVendors,
          deltaText: `+${newVendorsToday} today`,
          status: totalVendors > 0 ? "healthy" : "warning",
        },
        {
          key: "customers",
          label: "Active Customers",
          value: totalCustomers,
          deltaText: `+${newCustomersToday} today`,
          status: "healthy",
        },
        {
          key: "telecallers",
          label: "Telecallers",
          value: totalTelecallers,
          deltaText: `${activeTelecallers} online`,
          status: activeTelecallers > 0 ? "healthy" : "warning",
        },
        {
          key: "support",
          label: "Pending Queries",
          value: pendingSupportTickets,
          deltaText: `${totalSupportTickets} total`,
          status: pendingSupportTickets > 10 ? "attention" : "healthy",
        },
      ],
    },
  });
};

/**
 * Standardized Platform Bridge Module Catalog
 * Lists all active business modules supported by LTS child application.
 */
export const getBridgeModules = async (req, res) => {
  const modules = [
    {
      moduleKey: "CUSTOMER_DATABASE",
      name: "Customer Database",
      category: "core",
      description: "Central customer registry, purchase histories and query profiles",
      availableActions: ["view", "edit", "export", "delete"],
      frontendApp: "superadmin",
      frontendRoute: "/customer-database",
      enabled: true,
    },
    {
      moduleKey: "VENDOR_DATABASE",
      name: "Vendor Database",
      category: "core",
      description: "Vendor onboarding, store approvals, KYC and commission plans",
      availableActions: ["view", "edit", "export", "delete"],
      frontendApp: "superadmin",
      frontendRoute: "/vendor-database",
      enabled: true,
    },
    {
      moduleKey: "CUSTOMER_VENDOR_QUERIES",
      name: "Customer & Vendor Queries",
      category: "support",
      description: "Support desk tickets, resolution escalation and dispatch management",
      availableActions: ["view", "edit", "export"],
      frontendApp: "superadmin",
      frontendRoute: "/support-tickets",
      enabled: true,
    },
    {
      moduleKey: "ANALYTICS_REPORTS",
      name: "Analytics & Reports",
      category: "analytics",
      description: "Aggregated sales metrics, telecaller call volumes and GMV charts",
      availableActions: ["view", "export"],
      frontendApp: "superadmin",
      frontendRoute: "/analytics",
      enabled: true,
    },
    {
      moduleKey: "SYSTEM_AUDIT_LOGS",
      name: "System Audit Logs",
      category: "security",
      description: "Tamper-evident logs of administrative actions and access records",
      availableActions: ["view", "export"],
      frontendApp: "superadmin",
      frontendRoute: "/audit-logs",
      enabled: true,
    },
    {
      moduleKey: "USER_MANAGEMENT",
      name: "User Management",
      category: "administration",
      description: "Internal staff, managers, telecallers and local admin accounts",
      availableActions: ["view", "edit", "delete"],
      frontendApp: "superadmin",
      frontendRoute: "/users",
      enabled: true,
    },
    {
      moduleKey: "VENDOR_STORE_PORTAL",
      name: "Vendor Store & Inventory",
      category: "vendor",
      description: "Merchant product catalog, inventory tracking and direct order dispatch",
      availableActions: ["view", "edit"],
      frontendApp: "vendor",
      frontendRoute: "/products",
      enabled: true,
    },
    {
      moduleKey: "TELECALLER_CALL_DESK",
      name: "Telecaller Calling Desk",
      category: "telecaller",
      description: "Lead queue, outbound dialer, follow-ups and payment order generation",
      availableActions: ["view", "edit"],
      frontendApp: "telecaller",
      frontendRoute: "/lead-desk",
      enabled: true,
    },
  ];

  return res.json({
    success: true,
    data: {
      projectCode: "LTS",
      totalCount: modules.length,
      modules,
    },
  });
};

/**
 * Standardized Platform Bridge Users Endpoint
 * Unified directory query across LTS Admin, SuperAdmin, Telecaller, and Vendor collections.
 */
export const getBridgeUsers = async (req, res) => {
  const { panel, search, page = 1, limit = 50 } = req.query;
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (numPage - 1) * numLimit;

  const users = [];

  try {
    // 1. Fetch SuperAdmins if panel filter matches
    if (!panel || panel === "all" || panel === "superadmin") {
      const superAdmins = await SuperAdmin.find({}, "adminId fullName email phone role status createdAt")
        .limit(20)
        .lean();
      for (const sa of superAdmins) {
        users.push({
          id: sa.adminId || sa._id,
          name: sa.fullName,
          email: sa.email,
          phone: sa.phone || "",
          role: "SUPER_ADMIN",
          panel: "superadmin",
          status: sa.status || "Active",
          createdAt: sa.createdAt,
        });
      }
    }

    // 2. Fetch Users (Admins, Managers)
    if (!panel || panel === "all" || panel === "admin" || panel === "superadmin") {
      const query = { isDeleted: false };
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
      const adminUsers = await User.find(query, "userId fullName email phone role status createdAt")
        .limit(numLimit)
        .lean();
      for (const u of adminUsers) {
        users.push({
          id: u.userId || u._id,
          name: u.fullName,
          email: u.email,
          phone: u.phone || "",
          role: u.role || "ADMIN",
          panel: "superadmin",
          status: u.status || "ACTIVE",
          createdAt: u.createdAt,
        });
      }
    }

    // 3. Fetch Telecallers
    if (!panel || panel === "all" || panel === "telecaller") {
      const tcQuery = { isDeleted: false };
      if (search) {
        tcQuery.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
      const telecallers = await Telecaller.find(
        tcQuery,
        "name email mobileNumber employeeId status createdAt",
      )
        .limit(numLimit)
        .lean();
      for (const tc of telecallers) {
        users.push({
          id: tc.employeeId || tc._id,
          name: tc.name,
          email: tc.email,
          phone: tc.mobileNumber || "",
          role: "TELECALLER",
          panel: "telecaller",
          status: tc.status || "Active",
          createdAt: tc.createdAt,
        });
      }
    }

    // 4. Fetch Vendors (capped for performance)
    if (!panel || panel === "all" || panel === "vendor") {
      const vendorQuery = {};
      if (search) {
        vendorQuery.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { storeName: { $regex: search, $options: "i" } },
        ];
      }
      const vendors = await Vendor.find(
        vendorQuery,
        "vendorId fullName email phone storeName storeStatus createdAt",
      )
        .limit(numLimit)
        .lean();
      for (const v of vendors) {
        users.push({
          id: v.vendorId || v._id,
          name: v.fullName,
          email: v.email,
          phone: v.phone || "",
          storeName: v.storeName,
          role: "VENDOR",
          panel: "vendor",
          status: v.storeStatus || "Active",
          createdAt: v.createdAt,
        });
      }
    }
  } catch (err) {
    console.error("[PlatformBridgeUsers] Error querying users:", err);
  }

  // Filter and paginate unified array
  const total = users.length;
  const paginatedUsers = users.slice(skip, skip + numLimit);

  return res.json({
    success: true,
    data: {
      projectCode: "LTS",
      pagination: {
        total,
        page: numPage,
        limit: numLimit,
        totalPages: Math.ceil(total / numLimit) || 1,
      },
      users: paginatedUsers,
    },
  });
};

/**
 * Standardized Platform Bridge Roles Endpoint
 * Exports configured roles and permission matrices.
 */
export const getBridgeRoles = async (req, res) => {
  try {
    let roles = await Role.find({ status: "ACTIVE" }).lean();
    let matrices = await PermissionMatrix.find().lean();

    // If no roles exist in DB, provide default LTS role catalog
    if (!roles || roles.length === 0) {
      roles = [
        {
          roleId: "SUPER_ADMIN",
          title: "Super Admin",
          description: "Full system administration and oversight",
          isMasterRole: true,
          status: "ACTIVE",
        },
        {
          roleId: "ADMIN",
          title: "Admin",
          description: "Operations manager with module-level permissions",
          isMasterRole: false,
          status: "ACTIVE",
        },
        {
          roleId: "TELECALLER",
          title: "Telecaller",
          description: "Outbound lead calling and customer follow-up",
          isMasterRole: false,
          status: "ACTIVE",
        },
        {
          roleId: "VENDOR",
          title: "Vendor",
          description: "Store operator and inventory owner",
          isMasterRole: false,
          status: "ACTIVE",
        },
      ];
    }

    const rolesWithPermissions = roles.map((r) => {
      const roleMatrices = matrices.filter(
        (m) => String(m.roleId) === String(r._id) || m.roleTitle === r.title,
      );
      return {
        roleId: r.roleId || r._id,
        title: r.title,
        description: r.description,
        isMasterRole: Boolean(r.isMasterRole),
        status: r.status,
        permissions: roleMatrices.map((m) => ({
          moduleKey: m.moduleKey,
          moduleName: m.moduleName,
          fullAccess: Boolean(m.fullAccess),
          viewAccess: Boolean(m.viewAccess),
          editAccess: Boolean(m.editAccess),
          exportAccess: Boolean(m.exportAccess),
          deleteAccess: Boolean(m.deleteAccess),
        })),
      };
    });

    return res.json({
      success: true,
      data: {
        projectCode: "LTS",
        totalCount: rolesWithPermissions.length,
        roles: rolesWithPermissions,
      },
    });
  } catch (err) {
    console.error("[PlatformBridgeRoles] Error querying roles:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve child project roles",
      error: err.message,
    });
  }
};

// In-memory replay prevention cache for SSO nonces (evicts expired entries)
const redeemedNonces = new Map();
const cleanupNonces = () => {
  const now = Date.now();
  for (const [nonce, expiresAt] of redeemedNonces.entries()) {
    if (expiresAt <= now) redeemedNonces.delete(nonce);
  }
};
setInterval(cleanupNonces, 60000).unref();

const DEFAULT_BRIDGE_SECRET = "dbms_platform_bridge_secret_key_2026";

/**
 * Standardized Platform Bridge SSO Ticket Exchange Endpoint
 * Validates a single-use signed ticket from the Platform control plane,
 * provisions or authenticates the SuperAdmin user in LTS, and issues
 * child session tokens without requiring password entry.
 */
export const exchangeSsoTicket = async (req, res) => {
  const { ticket } = req.body;
  if (!ticket) {
    return res.status(400).json({
      success: false,
      message: "Missing SSO ticket in request body",
    });
  }

  const bridgeSecret =
    process.env.PLATFORM_BRIDGE_SECRET || DEFAULT_BRIDGE_SECRET;

  let decoded;
  try {
    decoded = jwt.verify(ticket, bridgeSecret, {
      audience: "LTS",
      issuer: "platform-control-plane",
    });
  } catch (err) {
    console.warn("[PlatformBridgeSSO] Invalid ticket:", err.message);
    return res.status(401).json({
      success: false,
      message: `Invalid or expired SSO ticket: ${err.message}`,
    });
  }

  // Verify and record nonce to prevent replay attacks
  const nonce = decoded.nonce;
  if (!nonce) {
    return res.status(400).json({
      success: false,
      message: "SSO ticket is missing replay prevention nonce",
    });
  }

  if (redeemedNonces.has(nonce)) {
    return res.status(409).json({
      success: false,
      message: "SSO ticket has already been redeemed (replay rejected)",
    });
  }

  // Store nonce with a 2-minute expiration
  redeemedNonces.set(nonce, Date.now() + 120000);

  try {
    const userEmail = (decoded.email || "").toLowerCase().trim();
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "SSO ticket contains no email address",
      });
    }

    const appKey = decoded.appKey || "lts-superadmin";

    // ─────────────────────────────────────────────────────────────
    // TARGET 1: VENDOR PANEL SSO HANDOFF
    // ─────────────────────────────────────────────────────────────
    if (appKey === "lts-vendor") {
      let vendor = await Vendor.findOne({ email: userEmail });
      if (!vendor) {
        vendor = await Vendor.findOne({
          storeStatus: { $in: ["Active & Verified", "Active", "Verified"] },
        });
        if (!vendor) {
          vendor = await Vendor.create({
            vendorId: `VND-PLT-${Date.now().toString().slice(-4)}`,
            email: userEmail,
            fullName: decoded.name || "Platform Super Admin",
            storeName: "Platform Administration Store",
            storeStatus: "Active & Verified",
            phone: "9999999999",
          });
        }
      }

      const vendorToken = jwt.sign(
        { id: vendor._id },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "30d" },
      );

      try {
        await AuditLog.create({
          adminId: vendor.vendorId || String(vendor._id),
          action: "PLATFORM_SSO_VENDOR_LOGIN",
          description: `Federated SSO launch into Vendor Panel from Platform control plane (actor: ${decoded.sub})`,
          ipAddress: req.ip || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "Platform-Control-Plane",
        });
      } catch (auditErr) {
        console.warn("[PlatformBridgeSSO] Non-blocking audit error:", auditErr.message);
      }

      return res.status(200).json({
        success: true,
        message: "Vendor SSO session authenticated successfully",
        token: vendorToken,
        accessToken: vendorToken,
        user: {
          _id: vendor._id,
          vendorId: vendor.vendorId,
          fullName: vendor.fullName,
          email: vendor.email,
          storeName: vendor.storeName,
          storeStatus: vendor.storeStatus,
        },
        redirectRoute: decoded.targetRoute || "/",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // TARGET 2: TELECALLER PANEL SSO HANDOFF
    // ─────────────────────────────────────────────────────────────
    if (appKey === "lts-telecaller") {
      let telecaller = await Telecaller.findOne({ email: userEmail });
      if (!telecaller) {
        telecaller = await Telecaller.findOne({ isDeleted: false });
        if (!telecaller) {
          telecaller = await Telecaller.create({
            name: decoded.name || "Platform Super Admin",
            employeeId: `TC-PLT-${Date.now().toString().slice(-4)}`,
            email: userEmail,
            mobileNumber: "9999999999",
            role: "TELECALLER",
            status: "Active",
          });
        }
      }

      const telecallerToken = jwt.sign(
        { id: telecaller._id, role: "TELECALLER" },
        process.env.JWT_SECRET || "lts_default_jwt_secret_key_2026",
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
      );

      try {
        await AuditLog.create({
          adminId: telecaller.employeeId || String(telecaller._id),
          action: "PLATFORM_SSO_TELECALLER_LOGIN",
          description: `Federated SSO launch into Telecaller CRM from Platform control plane (actor: ${decoded.sub})`,
          ipAddress: req.ip || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "Platform-Control-Plane",
        });
      } catch (auditErr) {
        console.warn("[PlatformBridgeSSO] Non-blocking audit error:", auditErr.message);
      }

      return res.status(200).json({
        success: true,
        message: "Telecaller SSO session authenticated successfully",
        token: telecallerToken,
        accessToken: telecallerToken,
        user: {
          id: telecaller._id,
          _id: telecaller._id,
          name: telecaller.name,
          employeeId: telecaller.employeeId,
          email: telecaller.email,
          phone: telecaller.mobileNumber || telecaller.phone || "",
          role: "TELECALLER",
        },
        redirectRoute: decoded.targetRoute || "/",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // TARGET 3: SUPER ADMIN PANEL SSO HANDOFF (DEFAULT)
    // ─────────────────────────────────────────────────────────────
    // Lookup existing SuperAdmin or provision one
    let admin = await SuperAdmin.findOne({ email: userEmail });
    if (!admin) {
      // Find any existing active SuperAdmin to prevent account proliferation,
      // or provision a new linked SuperAdmin record for Platform control
      admin = await SuperAdmin.findOne({ status: { $in: ["Active", "ACTIVE"] } });
      if (!admin) {
        admin = await SuperAdmin.create({
          adminId: `SA-PLT-${Date.now().toString().slice(-4)}`,
          email: userEmail,
          fullName: decoded.name || "Platform Super Admin",
          phone: "9999999999",
          role: "SuperAdmin",
          status: "Active",
        });
      }
    }

    // Account must be active
    if (admin.status && admin.status.toLowerCase() !== "active") {
      return res.status(403).json({
        success: false,
        message: "Child project account is suspended or inactive",
      });
    }

    // Generate LTS child application tokens
    const accessToken = jwt.sign(
      { id: admin._id, role: "SuperAdmin" },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "8h" },
    );

    const refreshToken = jwt.sign(
      { id: admin._id, role: "SuperAdmin" },
      process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
      { expiresIn: "7d" },
    );

    admin.refreshToken = refreshToken;
    await admin.save();

    // Log the SSO login event
    try {
      await AuditLog.create({
        adminId: admin.adminId || String(admin._id),
        action: "PLATFORM_SSO_LOGIN",
        description: `Federated SSO login from Platform control plane (actor: ${decoded.sub})`,
        ipAddress: req.ip || "127.0.0.1",
        userAgent: req.headers["user-agent"] || "Platform-Control-Plane",
      });
    } catch (auditErr) {
      console.warn("[PlatformBridgeSSO] Audit log non-blocking error:", auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "SSO session authenticated successfully",
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        _id: admin._id,
        adminId: admin.adminId,
        email: admin.email,
        fullName: admin.fullName,
        phone: admin.phone || "",
        role: admin.role || "SuperAdmin",
        status: admin.status,
        avatar: admin.avatar || "",
      },
      redirectRoute: decoded.targetRoute || "/dashboard",
    });
  } catch (err) {
    console.error("[PlatformBridgeSSO] Exchange failure:", err);
    return res.status(500).json({
      success: false,
      message: "Internal error establishing child SSO session",
      error: err.message,
    });
  }
};

/**
 * Standardized Platform Bridge User Status Updater
 * Allows Platform Super Admin to toggle active/inactive status across child collections.
 */
export const updateBridgeUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: "Missing status in request body" });
  }

  const normalizedStatus = String(status).toUpperCase();
  const isMongoId = mongoose.Types.ObjectId.isValid(id);

  try {
    // 1. Check User (Admin/Staff)
    let user = await User.findOne(
      isMongoId ? { $or: [{ _id: id }, { userId: id }] } : { userId: id },
    );
    if (user) {
      user.status = normalizedStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE";
      await user.save();
      return res.json({
        success: true,
        message: `User ${user.fullName} status updated to ${user.status}`,
        data: { id: user.userId || user._id, status: user.status },
      });
    }

    // 2. Check Telecaller
    let telecaller = await Telecaller.findOne(
      isMongoId ? { $or: [{ _id: id }, { employeeId: id }] } : { employeeId: id },
    );
    if (telecaller) {
      telecaller.status = normalizedStatus === "ACTIVE" ? "Active" : "Inactive";
      await telecaller.save();
      return res.json({
        success: true,
        message: `Telecaller ${telecaller.name} status updated to ${telecaller.status}`,
        data: { id: telecaller.employeeId || telecaller._id, status: telecaller.status },
      });
    }

    // 3. Check Vendor
    let vendor = await Vendor.findOne(
      isMongoId ? { $or: [{ _id: id }, { vendorId: id }] } : { vendorId: id },
    );
    if (vendor) {
      vendor.storeStatus = normalizedStatus === "ACTIVE" ? "Active & Verified" : "Suspended";
      await vendor.save();
      return res.json({
        success: true,
        message: `Vendor ${vendor.storeName} status updated to ${vendor.storeStatus}`,
        data: { id: vendor.vendorId || vendor._id, status: vendor.storeStatus },
      });
    }

    // 4. Check SuperAdmin
    let superAdmin = await SuperAdmin.findOne(
      isMongoId ? { $or: [{ _id: id }, { adminId: id }] } : { adminId: id },
    );
    if (superAdmin) {
      superAdmin.status = normalizedStatus === "ACTIVE" ? "Active" : "Inactive";
      await superAdmin.save();
      return res.json({
        success: true,
        message: `SuperAdmin ${superAdmin.fullName} status updated to ${superAdmin.status}`,
        data: { id: superAdmin.adminId || superAdmin._id, status: superAdmin.status },
      });
    }

    return res.status(404).json({
      success: false,
      message: `User with ID "${id}" not found in child project collections`,
    });
  } catch (err) {
    console.error("[PlatformBridgeUpdateStatus] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: err.message,
    });
  }
};

