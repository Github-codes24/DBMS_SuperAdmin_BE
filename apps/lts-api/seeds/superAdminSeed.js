import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Import SuperAdmin Panel Schemas
import SuperAdmin from '../src/SuperadminPanel/Authentication/authSchema.js';
import User from '../src/SuperadminPanel/UserManagement/userSchema.js';
import { Role, PermissionMatrix } from '../src/SuperadminPanel/RolesAndPermissions/roleSchema.js';
import AdminFeatureControl from '../src/SuperadminPanel/FeatureControl/featureControlSchema.js';
import SuperAdminCustomer from '../src/SuperadminPanel/CustomerDatabase/customerSchema.js';
import SuperAdminVendor from '../src/SuperadminPanel/VendorDatabase/vendorDatabaseSchema.js';
import SuperAdminTelecaller from '../src/SuperadminPanel/TelecallerManagement/telecallerSchema.js';
import SuperAdminAuditLog from '../src/SuperadminPanel/AuditLogs/auditLogSchema.js';
import { State, Category, Subcategory } from '../src/VendorPanel/VendorDashboard/cascadeFilterSchema.js';
import { generateReferCode } from "../src/utils/generateReferCode.js"

dotenv.config();

export const seedSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lts_dbms';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('MongoDB Connected for Super Admin Seeding...');
    }

    // 1. Clear all Super Admin Panel data
    await SuperAdmin.deleteMany({});
    await User.deleteMany({});
    await Role.deleteMany({});
    await PermissionMatrix.deleteMany({});
    await AdminFeatureControl.deleteMany({});
    await SuperAdminCustomer.deleteMany({});
    await SuperAdminVendor.deleteMany({});
    await SuperAdminTelecaller.deleteMany({});
    await SuperAdminAuditLog.deleteMany({});
    await State.deleteMany({});
    await Category.deleteMany({});
    await Subcategory.deleteMany({});
    console.log('Existing Super Admin Panel data cleared.');

    // 2. Seed Initial Master SuperAdmin Account
    const salt = await bcrypt.genSalt(10);
    const superAdminPassword = await bcrypt.hash('admin123', salt);

    const superAdminUser = await SuperAdmin.create({
      adminId: 'ADMIN-001',
      email: 'admin@lts.com',
      phone: '9876543210',
      fullName: 'Super Admin',
      password: superAdminPassword,
      role: 'SuperAdmin',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      referCode: generateReferCode()
    });
    console.log('Master SuperAdmin Account seeded successfully.');

    // 3. Seed System Roles (Super Admin, Admin, Telecaller)
    const superAdminRole = await Role.create({
      roleId: 'ROLE-001',
      title: 'Super Admin',
      description: 'Full system control with master access to all modules, system settings, and role permissions.',
      isMasterRole: true,
      status: 'ACTIVE',
      createdBy: superAdminUser._id,
    });

    const adminRole = await Role.create({
      roleId: 'ROLE-002',
      title: 'Admin',
      description: 'Administrator role managing day-to-day operations and team activities.',
      isMasterRole: false,
      status: 'ACTIVE',
      createdBy: superAdminUser._id,
    });

    const telecallerRole = await Role.create({
      roleId: 'ROLE-003',
      title: 'Telecaller',
      description: 'Front-line agent handling customer interactions, queries, and call logs.',
      isMasterRole: false,
      status: 'ACTIVE',
      createdBy: superAdminUser._id,
    });

    // Default 6 Modules Definition
    const defaultModulesList = [
      { moduleKey: 'CUSTOMER_DATABASE', moduleName: 'Customer Database', moduleDescription: 'Manage customer profiles, history, and status.' },
      { moduleKey: 'VENDOR_DATABASE', moduleName: 'Vendor Database', moduleDescription: 'Access and approve vendor profiles & documentation.' },
      { moduleKey: 'CUSTOMER_VENDOR_QUERIES', moduleName: 'Customer & Vendor Queries', moduleDescription: 'Handle customer and vendor inquiries or tickets.' },
      { moduleKey: 'ANALYTICS_REPORTS', moduleName: 'Analytics & Reports', moduleDescription: 'Generate and download business performance reports.' },
      { moduleKey: 'SYSTEM_AUDIT_LOGS', moduleName: 'System Audit Logs', moduleDescription: 'View system security events and user activity trails.' },
      { moduleKey: 'USER_MANAGEMENT', moduleName: 'User Management', moduleDescription: 'Create, edit, or disable team accounts and roles.' },
    ];

    // 4. Seed Permission Matrices for Super Admin (24/24 active)
    const superAdminMatrices = defaultModulesList.map((m) => ({
      roleId: superAdminRole._id,
      roleTitle: superAdminRole.title,
      moduleKey: m.moduleKey,
      moduleName: m.moduleName,
      moduleDescription: m.moduleDescription,
      fullAccess: true,
      viewAccess: true,
      editAccess: true,
      exportAccess: true,
      deleteAccess: true,
    }));
    await PermissionMatrix.insertMany(superAdminMatrices);

    // Seed Admin Matrices (18/24 active)
    const adminMatrices = defaultModulesList.map((m) => ({
      roleId: adminRole._id,
      roleTitle: adminRole.title,
      moduleKey: m.moduleKey,
      moduleName: m.moduleName,
      moduleDescription: m.moduleDescription,
      fullAccess: m.moduleKey !== 'SYSTEM_AUDIT_LOGS',
      viewAccess: true,
      editAccess: m.moduleKey !== 'SYSTEM_AUDIT_LOGS',
      exportAccess: true,
      deleteAccess: m.moduleKey === 'CUSTOMER_DATABASE' || m.moduleKey === 'USER_MANAGEMENT',
    }));
    await PermissionMatrix.insertMany(adminMatrices);

    // Seed Telecaller Matrices (8/24 active)
    const telecallerMatrices = defaultModulesList.map((m) => ({
      roleId: telecallerRole._id,
      roleTitle: telecallerRole.title,
      moduleKey: m.moduleKey,
      moduleName: m.moduleName,
      moduleDescription: m.moduleDescription,
      fullAccess: false,
      viewAccess: m.moduleKey === 'CUSTOMER_DATABASE' || m.moduleKey === 'CUSTOMER_VENDOR_QUERIES',
      editAccess: m.moduleKey === 'CUSTOMER_VENDOR_QUERIES',
      exportAccess: false,
      deleteAccess: false,
    }));
    await PermissionMatrix.insertMany(telecallerMatrices);
    console.log('System Roles & Permission Matrices seeded successfully.');

    // 5. Seed Active Admin Users for Feature Control
    const adminPasswordHash = await bcrypt.hash('admin123', salt);

    const adminUser1 = await User.create({
      userId: 'ADM001',
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@lts.com',
      phone: '9876500001',
      password: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdBy: superAdminUser._id,
    });

    const adminUser2 = await User.create({
      userId: 'ADM002',
      fullName: 'Neha Singh',
      email: 'neha.singh@lts.com',
      phone: '9876500002',
      password: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdBy: superAdminUser._id,
    });

    const adminUser3 = await User.create({
      userId: 'ADM003',
      fullName: 'Vikram Mehta',
      email: 'vikram.mehta@lts.com',
      phone: '9876500003',
      password: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdBy: superAdminUser._id,
    });

    // Seed Admin Feature Controls (ADM001 matching UI: 4/6 Active)
    await AdminFeatureControl.create({
      user: adminUser1._id,
      userId: adminUser1.userId,
      customerManagement: true,
      vendorManagement: true,
      reports: false,
      exportData: true,
      bulkUpload: false,
      telecallerAssignment: true,
      updatedBy: superAdminUser._id,
    });

    await AdminFeatureControl.create({
      user: adminUser2._id,
      userId: adminUser2.userId,
      customerManagement: true,
      vendorManagement: true,
      reports: true,
      exportData: true,
      bulkUpload: false,
      telecallerAssignment: false,
      updatedBy: superAdminUser._id,
    });

    await AdminFeatureControl.create({
      user: adminUser3._id,
      userId: adminUser3.userId,
      customerManagement: true,
      vendorManagement: false,
      reports: true,
      exportData: false,
      bulkUpload: true,
      telecallerAssignment: true,
      updatedBy: superAdminUser._id,
    });
    console.log('Active Admin Users & Feature Controls seeded successfully.');

    // 6. Seed SuperAdmin Customer Directory (CUST001 to CUST007 matching UI)
    await SuperAdminCustomer.insertMany([
      {
        customerId: 'CUST001',
        srNo: '01',
        name: 'Rahul Sharma',
        companyName: 'ABC Traders Pvt Ltd',
        state: 'Maharashtra',
        city: 'Mumbai',
        pincode: '400001',
        registrationDate: new Date('2026-01-15'),
        status: 'Active',
        assignedTelecaller: 'TC001',
        createdBy: superAdminUser._id,
      },
      {
        customerId: 'CUST002',
        srNo: '02',
        name: 'Priya Verma',
        companyName: 'XYZ Stores & Logistics',
        state: 'Delhi',
        city: 'New Delhi',
        pincode: '110001',
        registrationDate: new Date('2026-02-10'),
        status: 'Active',
        assignedTelecaller: 'TC002',
        createdBy: superAdminUser._id,
      },
      {
        customerId: 'CUST003',
        srNo: '03',
        name: 'Amit Patel',
        companyName: 'Metro Retail Mart',
        state: 'Karnataka',
        city: 'Bengaluru',
        pincode: '560001',
        registrationDate: new Date('2026-03-05'),
        status: 'Pending',
        assignedTelecaller: 'TC003',
        createdBy: superAdminUser._id,
      },
      {
        customerId: 'CUST004',
        srNo: '04',
        name: 'Neha Singh',
        companyName: 'Apex Enterprises',
        state: 'Gujarat',
        city: 'Ahmedabad',
        pincode: '380001',
        registrationDate: new Date('2026-04-12'),
        status: 'Active',
        assignedTelecaller: 'TC004',
        createdBy: superAdminUser._id,
      },
      {
        customerId: 'CUST005',
        srNo: '05',
        name: 'Vikram Mehta',
        companyName: 'Sunrise Super Mart',
        state: 'Rajasthan',
        city: 'Jaipur',
        pincode: '302001',
        registrationDate: new Date('2026-05-20'),
        status: 'Pending',
        assignedTelecaller: 'TC005',
        createdBy: superAdminUser._id,
      },
      {
        customerId: 'CUST006',
        srNo: '06',
        name: 'Suresh Raina',
        companyName: 'Raina Electricals',
        state: 'Uttar Pradesh',
        city: 'Lucknow',
        pincode: '226001',
        registrationDate: new Date('2026-06-10'),
        status: 'Active',
        assignedTelecaller: 'TC001',
        createdBy: superAdminUser._id,
      },
      {
        customerId: 'CUST007',
        srNo: '07',
        name: 'Kavita Menon',
        companyName: 'Menon General Stores',
        state: 'Kerala',
        city: 'Kochi',
        pincode: '682001',
        registrationDate: new Date('2026-07-02'),
        status: 'Active',
        assignedTelecaller: 'TC002',
        createdBy: superAdminUser._id,
      },
    ]);
    console.log('Customer Directory seeded successfully.');

    // 7. Seed SuperAdmin Vendor Directory (Matching Data Management UI Mockups)
    await SuperAdminVendor.insertMany([
      {
        vendorId: 'VEN001',
        transNo: 'TRX90101',
        srNo: '01',
        vendorName: 'ABC Traders Pvt Ltd',
        ownerName: 'Rajesh Patel',
        category: 'Grocery & FMCG',
        gstin: '27AAAAA0000A1Z5',
        verificationDateTime: new Date('2026-07-30T10:30:00'),
        contactNo: '+91 98920 11223',
        email: 'contact@abctraders.com',
        state: 'Maharashtra',
        city: 'Nagpur',
        pincode: '440001',
        completeAddress: 'Shop #12, Commercial Hub, Central Ave, Wardha Road',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
      {
        vendorId: 'VEN002',
        transNo: 'TRX90102',
        srNo: '02',
        vendorName: 'Metro Supplies & Logistics',
        ownerName: 'Sanjay Deshmukh',
        category: 'Medical & Pharma',
        gstin: '27BBBBB0000B1Z6',
        verificationDateTime: new Date('2026-07-30T14:15:00'),
        contactNo: '+91 98771 22334',
        email: 'sales@metrosupplies.com',
        state: 'Maharashtra',
        city: 'Nagpur',
        pincode: '440002',
        completeAddress: 'Building 4, MIDC Industrial Area, Hingna Road',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
      {
        vendorId: 'VEN005',
        transNo: 'TRX90105',
        srNo: '03',
        vendorName: 'Delhi Retail World',
        ownerName: 'Rajesh Gupta',
        category: 'Home Products',
        gstin: '07CCCCC0000C1Z7',
        verificationDateTime: new Date('2026-07-31T13:10:00'),
        contactNo: '+91 98556 77889',
        email: 'info@delhiretail.com',
        state: 'Delhi',
        city: 'Delhi',
        pincode: '110001',
        completeAddress: 'Plot #88, Inner Circle, Connaught Place',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
      {
        vendorId: 'VEN003',
        transNo: 'TRX90103',
        srNo: '03',
        vendorName: 'Global Electronics',
        category: 'Electronics & IT',
        verificationDateTime: new Date('2026-07-31T09:45:00'),
        contactNo: '+91 98440 55667',
        state: 'Karnataka',
        city: 'Bengaluru',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
      {
        vendorId: 'VEN004',
        transNo: 'TRX90104',
        srNo: '04',
        vendorName: 'Apex Hardware',
        category: 'Hardware & Tools',
        verificationDateTime: new Date('2026-07-31T11:20:00'),
        contactNo: '+91 98770 88990',
        state: 'Gujarat',
        city: 'Ahmedabad',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
      {
        vendorId: 'VEN008',
        transNo: 'TRX90108',
        srNo: '05',
        vendorName: 'Royal Furnishings',
        category: 'Home Products',
        verificationDateTime: new Date('2026-07-31T13:10:00'),
        contactNo: '+91 98221 33445',
        state: 'Rajasthan',
        city: 'Jaipur',
        status: 'Pending',
        createdBy: superAdminUser._id,
      },
      {
        vendorId: 'VEN006',
        transNo: 'TRX90106',
        srNo: '06',
        vendorName: 'Zenith Electricals',
        category: 'Electronics',
        verificationDateTime: new Date('2026-07-31T15:30:00'),
        contactNo: '+91 98220 77889',
        state: 'Maharashtra',
        city: 'Pune',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
      {
        vendorId: 'VEN007',
        transNo: 'TRX90107',
        srNo: '07',
        vendorName: 'Sunrise Foods',
        category: 'Grocery',
        verificationDateTime: new Date('2026-08-01T11:00:00'),
        contactNo: '+91 98331 44556',
        state: 'Gujarat',
        city: 'Surat',
        status: 'Pending',
        createdBy: superAdminUser._id,
      },
    ]);
    console.log('Vendor Directory seeded successfully.');

    // 8. Seed SuperAdmin Telecaller Directory (Matching UI Mockups TC014, TC021, TC031, TC042)
    const tcDefaultSalt = await bcrypt.genSalt(10);
    const tcDefaultPassword = await bcrypt.hash('Telecaller@123', tcDefaultSalt);

    await SuperAdminTelecaller.insertMany([
      {
        userId: 'TC001',
        fullName: 'Amit Verma',
        mobileNumber: '+91 98765 43210',
        email: 'amit.verma@lts.com',
        password: tcDefaultPassword,
        assignedRegion: 'North Region',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
      {
        userId: 'TC002',
        fullName: 'Neha Joshi',
        mobileNumber: '+91 97654 32109',
        email: 'neha.joshi@lts.com',
        password: tcDefaultPassword,
        assignedRegion: 'West Region',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
      {
        userId: 'TC003',
        fullName: 'Ravi Singh',
        mobileNumber: '+91 98123 45678',
        email: 'ravi.singh@lts.com',
        password: tcDefaultPassword,
        assignedRegion: 'East Region',
        status: 'Disabled',
        createdBy: superAdminUser._id,
      },
      {
        userId: 'TC004',
        fullName: 'Priya Patel',
        mobileNumber: '+91 94321 09876',
        email: 'priya.patel@lts.com',
        password: tcDefaultPassword,
        assignedRegion: 'South Region',
        status: 'Active',
        createdBy: superAdminUser._id,
      },
    ]);
    console.log('Telecaller Directory seeded successfully.');

    // 9. Seed Audit Logs (Matching UI Mockups: 10:21 ADM001, 10:31 ADM002, 10:35 SUPER, 11:05 ADM001, 11:42 SUPER)
    const todayStr = new Date().toISOString().split('T')[0];

    await SuperAdminAuditLog.insertMany([
      {
        user: 'ADM001',
        userName: 'Rahul Sharma',
        userRole: 'ADMIN',
        action: 'Updated Customer',
        record: 'CUST1023',
        module: 'Customer Database',
        timestamp: new Date(`${todayStr}T10:21:00`),
      },
      {
        user: 'ADM002',
        userName: 'Neha Singh',
        userRole: 'ADMIN',
        action: 'Updated Vendor',
        record: 'VEN0092',
        module: 'Vendor Database',
        timestamp: new Date(`${todayStr}T10:31:00`),
      },
      {
        user: 'SUPER',
        userName: 'Super Admin',
        userRole: 'SUPER_ADMIN',
        action: 'Disabled Admin',
        record: 'ADM003',
        module: 'User Management',
        timestamp: new Date(`${todayStr}T10:35:00`),
      },
      {
        user: 'ADM001',
        userName: 'Rahul Sharma',
        userRole: 'ADMIN',
        action: 'Exported CSV',
        record: 'CUST_LIST',
        module: 'Customer Database',
        timestamp: new Date(`${todayStr}T11:05:00`),
      },
      {
        user: 'SUPER',
        userName: 'Super Admin',
        userRole: 'SUPER_ADMIN',
        action: 'Changed Password',
        record: 'TC031',
        module: 'Telecaller Management',
        timestamp: new Date(`${todayStr}T11:42:00`),
      },
    ]);
    // 10. Seed Dashboard Cascade Filter Data (States, Categories, Subcategories matching UI)
    await State.insertMany([
      { name: 'Maharashtra', vendorCount: 1950958 },
      { name: 'Uttar Pradesh', vendorCount: 1280656 },
      { name: 'Tamil Nadu', vendorCount: 1175749 },
      { name: 'Gujarat', vendorCount: 1014905 },
      { name: 'Karnataka', vendorCount: 914058 },
      { name: 'Rajasthan', vendorCount: 737685 },
      { name: 'West Bengal', vendorCount: 654210 },
      { name: 'Madhya Pradesh', vendorCount: 589400 },
      { name: 'Telangana', vendorCount: 521090 },
      { name: 'Kerala', vendorCount: 489120 },
      { name: 'Punjab', vendorCount: 412500 },
      { name: 'Haryana', vendorCount: 389100 },
      { name: 'Bihar', vendorCount: 310450 },
      { name: 'Odisha', vendorCount: 285100 },
    ]);

    const createdCategories = await Category.insertMany([
      { name: 'Grocery & FMCG', vendorCount: 5420100 },
      { name: 'Electronics & IT', vendorCount: 4850400 },
      { name: 'Medical & Pharma', vendorCount: 3910550 },
      { name: 'Home Products & Kitchenware', vendorCount: 3420900 },
      { name: 'Hardware & Tools', vendorCount: 2890120 },
      { name: 'Fashion & Apparel', vendorCount: 2410800 },
      { name: 'Automotive & Spares', vendorCount: 1950300 },
      { name: 'Services & Logistics', vendorCount: 1520100 },
    ]);

    const groceryCategory = createdCategories.find((c) => c.name === 'Grocery & FMCG');
    const electronicsCategory = createdCategories.find((c) => c.name === 'Electronics & IT');
    const medicalCategory = createdCategories.find((c) => c.name === 'Medical & Pharma');
    const fashionCategory = createdCategories.find((c) => c.name === 'Fashion & Apparel');
    const servicesCategory = createdCategories.find((c) => c.name === 'Services & Logistics');

    await Subcategory.insertMany([
      { name: 'Supermarkets & Kirana', category: groceryCategory?._id, parentCategory: 'Grocery & FMCG', vendorCount: 510200 },
      { name: 'FMCG Wholesalers & Distributors', category: groceryCategory?._id, parentCategory: 'Grocery & FMCG', vendorCount: 320000 },
      { name: 'Dairy, Bakery & Frozen Foods', category: groceryCategory?._id, parentCategory: 'Grocery & FMCG', vendorCount: 210500 },
      { name: 'Organic & Health Foods', category: groceryCategory?._id, parentCategory: 'Grocery & FMCG', vendorCount: 150300 },
      { name: 'Home Appliances', category: electronicsCategory?._id, parentCategory: 'Electronics & IT', vendorCount: 4207936 },
      { name: 'Architecture', category: servicesCategory?._id, parentCategory: 'Services & Logistics', vendorCount: 1190209 },
      { name: 'Medical Sector', category: medicalCategory?._id, parentCategory: 'Medical & Pharma', vendorCount: 964467 },
      { name: 'Education', category: servicesCategory?._id, parentCategory: 'Services & Logistics', vendorCount: 843749 },
      { name: 'Fashion Accessories', category: fashionCategory?._id, parentCategory: 'Fashion & Apparel', vendorCount: 834068 },
    ]);
    console.log('Dashboard Cascade Data (States, Categories, Subcategories) seeded successfully.');

    console.log('✨ Super Admin Seeding Completed Successfully! ✨');
    return superAdminUser;
  } catch (error) {
    console.error('Error seeding Super Admin database:', error);
    throw error;
  }
};

// Standalone execution support
if (process.argv[1]?.includes('superAdminSeed.js')) {
  seedSuperAdmin()
    .then(() => {
      mongoose.connection.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
