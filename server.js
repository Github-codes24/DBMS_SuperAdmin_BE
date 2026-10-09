import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

//Existing VendorPanel Route Imports
import authRoutes from './src/VendorPanel/Authentication/authRoutes.js';
import dashboardRoutes from './src/VendorPanel/VendorDashboard/vendorDashboardRoutes.js';
import productRoutes from './src/VendorPanel/MyProducts/productRoutes.js';
import orderRoutes from './src/VendorPanel/Orders/orderRoutes.js';
import customerRoutes from './src/VendorPanel/CustomerDatabase/customerRoutes.js';
import inventoryRoutes from './src/VendorPanel/VendorDatabase/inventoryRoutes.js';
import reportRoutes from './src/VendorPanel/SalesReports/reportRoutes.js';
import profileRoutes from './src/VendorPanel/ProfileSettings/profileRoutes.js';
import notificationRoutes from './src/VendorPanel/Notifications/notificationRoutes.js';
import supportRoutes from './src/VendorPanel/HelpSupport/supportRoutes.js';
import vendorTelecallerRoutes from './src/VendorPanel/TelecallerManagement/telecallerRoutes.js';


// SUPER ADMIN PANEL ROUTE IMPORTS
import superAdminAuthRoutes from './src/SuperadminPanel/Authentication/authRoutes.js';
import superAdminDashboardRoutes from './src/SuperadminPanel/Dashboard/superAdminDashboardRoutes.js';
import superAdminUserRoutes from './src/SuperadminPanel/UserManagement/userRoutes.js';
import superAdminRoleRoutes from './src/SuperadminPanel/RolesAndPermissions/roleRoutes.js';
import superAdminFeatureControlRoutes from './src/SuperadminPanel/FeatureControl/featureControlRoutes.js';
import superAdminCustomerRoutes from './src/SuperadminPanel/CustomerDatabase/customerRoutes.js';
import superAdminVendorRoutes from './src/SuperadminPanel/VendorDatabase/vendorDatabaseRoutes.js';
import superAdminTelecallerRoutes from './src/SuperadminPanel/TelecallerManagement/telecallerRoutes.js';
import superAdminAuditLogRoutes from './src/SuperadminPanel/AuditLogs/auditLogRoutes.js';
import superAdminDataManagementRoutes from './src/SuperadminPanel/DataManagement/dataManagementRoutes.js';
//Telecaller CRM Route Imports 
import telecallerAuthRoutes from './src/Telecaller/routes/auth.routes.js';
import telecallerVendorRoutes from './src/Telecaller/routes/vendor.routes.js';
import telecallerProfileRoutes from './src/Telecaller/routes/profile.routes.js';
import telecallerReportRoutes from './src/Telecaller/routes/report.routes.js';
import telecallerPaymentRoutes from './src/Telecaller/routes/payment.routes.js';
import telecallerFollowupRoutes from './src/Telecaller/routes/followup.routes.js';
import telecallerPlanRoutes from './src/Telecaller/routes/plan.routes.js';





// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();


// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


//middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Static file serving for uploaded vendor images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Existing VendorPanel API Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tickets', supportRoutes);
app.use('/api/telecallers', vendorTelecallerRoutes);



// SUPER ADMIN PANEL API ROUTES
app.use('/api/v1/auth', superAdminAuthRoutes);
app.use('/api/v1/users', superAdminUserRoutes);
app.use('/api/v1/roles', superAdminRoleRoutes);
app.use('/api/v1/feature-control', superAdminFeatureControlRoutes);
app.use('/api/v1/superadmin/customers', superAdminCustomerRoutes);
app.use('/api/v1/superadmin/dashboard', superAdminDashboardRoutes);
app.use('/api/v1/superadmin/vendors', superAdminVendorRoutes);
app.use('/api/v1/superadmin/telecallers', superAdminTelecallerRoutes);
app.use('/api/v1/superadmin/audit-logs', superAdminAuditLogRoutes);
app.use('/api/v1/superadmin/data-management', superAdminDataManagementRoutes);
app.use('/api/v1/superadmin/dashboard', superAdminDashboardRoutes);

// ── Telecaller CRM API Routes ─────────────────────────────────────────────────
app.use('/api/telecaller/auth',    telecallerAuthRoutes);
app.use('/api/telecaller/vendors',  telecallerVendorRoutes);
app.use('/api/telecaller/profile',  telecallerProfileRoutes);
app.use('/api/telecaller/report',   telecallerReportRoutes);
app.use('/api/telecaller/payment',  telecallerPaymentRoutes);
app.use('/api/telecaller/followup', telecallerFollowupRoutes);
app.use('/api/telecaller/plans',    telecallerPlanRoutes);
app.use('/api/customer/plan',       telecallerPlanRoutes);
app.use('/api/plans',               telecallerPlanRoutes);


// Root Route 
app.get('/', (req, res) => {
  res.json({ message: 'LTS-DBMS API is running...' });
});

//Global Error Handler 
app.use((err, req, res, next) => {
  console.error('[GlobalError]', err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
