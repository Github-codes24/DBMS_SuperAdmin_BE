import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route Imports
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

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API Routes
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

// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'LTS-DBMS API is running...' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
