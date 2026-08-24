import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Import Schemas
import Vendor from './src/VendorPanel/Authentication/authSchema.js';
import Product from './src/VendorPanel/MyProducts/productSchema.js';
import Order from './src/VendorPanel/Orders/orderSchema.js';
import Customer from './src/VendorPanel/CustomerDatabase/customerSchema.js';
import Report from './src/VendorPanel/SalesReports/reportSchema.js';
import Notification from './src/VendorPanel/Notifications/notificationSchema.js';
import SupportTicket from './src/VendorPanel/HelpSupport/supportSchema.js';
import { State, Category, Subcategory } from './src/VendorPanel/VendorDashboard/cascadeFilterSchema.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lts_dbms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding...');

    // Clear all existing data
    await Vendor.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Customer.deleteMany({});
    await Report.deleteMany({});
    await Notification.deleteMany({});
    await SupportTicket.deleteMany({});
    await State.deleteMany({});
    await Category.deleteMany({});
    await Subcategory.deleteMany({});
    console.log('Existing data cleared.');

    // 1. Seed Vendor
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const vendor = await Vendor.create({
      vendorId: 'arham@lts.com',
      email: 'arham@lts.com',
      fullName: 'Mohd Arham',
      phone: '+91 98765 43210',
      designation: 'Senior Vendor & Regional Store Manager',
      regionalJurisdiction: 'All India Vendor Operations',
      password: hashedPassword,
      storeName: 'Ar Fresh Mart',
      storeStatus: 'Active & Verified',
      twoFactorAuth: true,
      emailAlerts: true,
      syncFrequency: 'Real-Time (Instant)',
      avatar: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150',
    });
    console.log('Vendor seeded successfully.');

    // 2. Seed States
    await State.insertMany([
      { name: 'Maharashtra', vendorCount: 1950958 },
      { name: 'Uttar Pradesh', vendorCount: 1280656 },
      { name: 'Tamil Nadu', vendorCount: 1175749 },
      { name: 'Gujarat', vendorCount: 1014905 },
      { name: 'Karnataka', vendorCount: 914058 },
    ]);
    console.log('States seeded.');

    // 3. Seed Categories
    await Category.insertMany([
      { name: 'Grocery & FMCG', vendorCount: 5420100 },
      { name: 'Electronics & IT', vendorCount: 4850400 },
      { name: 'Medical & Pharma', vendorCount: 3910550 },
      { name: 'Home Products & Kitchenware', vendorCount: 3420900 },
      { name: 'Hardware & Tools', vendorCount: 2890120 },
    ]);
    console.log('Categories seeded.');

    // 4. Seed Subcategories
    await Subcategory.insertMany([
      { name: 'Supermarkets & Kirana', parentCategory: 'Grocery & FMCG', vendorCount: 510200 },
      { name: 'FMCG Wholesalers & Distributors', parentCategory: 'Grocery & FMCG', vendorCount: 320000 },
      { name: 'Dairy, Bakery & Frozen Foods', parentCategory: 'Grocery & FMCG', vendorCount: 210500 },
      { name: 'Organic & Health Foods', parentCategory: 'Grocery & FMCG', vendorCount: 150300 },
    ]);
    console.log('Subcategories seeded.');

    // 5. Seed Products
    await Product.insertMany([
      {
        sku: 'LTS-GRO-001',
        name: 'Organic Alphonso Mangoes (1 Dozen)',
        category: 'Grocery',
        price: 809,
        originalPrice: 1000,
        stock: 45,
        vendorId: vendor.vendorId,
        image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=80',
      },
      {
        sku: 'LTS-ORG-002',
        name: 'Cold Pressed Virgin Coconut Oil 500ml',
        category: 'Grocery',
        price: 427,
        originalPrice: 450,
        stock: 8,
        vendorId: vendor.vendorId,
        image: 'https://images.unsplash.com/photo-1624484296196-1c5ff6008620?w=80',
      },
      {
        sku: 'LTS-SPI-003',
        name: 'Artisanal Malabar Black Pepper 250g',
        category: 'Grocery',
        price: 320,
        originalPrice: 320,
        stock: 65,
        vendorId: vendor.vendorId,
        image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=80',
      },
      {
        sku: 'LTS-GRO-004',
        name: 'Farm Fresh Organic Honey 500g',
        category: 'Grocery',
        price: 509,
        originalPrice: 599,
        stock: 0,
        vendorId: vendor.vendorId,
        image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=80',
      },
      {
        sku: 'LTS-ORG-005',
        name: 'Himalayan Pink Rock Salt 1kg',
        category: 'Grocery',
        price: 180,
        originalPrice: 180,
        stock: 120,
        vendorId: vendor.vendorId,
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=80',
      },
      {
        sku: 'LTS-GRO-006',
        name: 'Pure Desi A2 Gir Cow Ghee 500ml',
        category: 'Grocery',
        price: 1058,
        originalPrice: 1150,
        stock: 5,
        vendorId: vendor.vendorId,
        image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=80',
      },
    ]);
    console.log('Products seeded.');

    // 6. Seed Orders
    await Order.insertMany([
      {
        orderId: 'ORD-9401',
        customerName: 'Aarav Mehta',
        products: 'Organic Alphonso Mangoes (2x), Malabar Black Pepper (1x)',
        amount: 1938,
        paymentStatus: 'Paid',
        deliveryStatus: 'Delivered',
        vendorId: vendor.vendorId,
      },
      {
        orderId: 'ORD-9402',
        customerName: 'Ananya Deshmukh',
        products: 'Cold Pressed Virgin Coconut Oil (1x)',
        amount: 427,
        paymentStatus: 'Paid',
        deliveryStatus: 'Confirmed',
        vendorId: vendor.vendorId,
      },
      {
        orderId: 'ORD-9403',
        customerName: 'Rohan Kapoor',
        products: 'Desi A2 Gir Cow Ghee (2x), Pink Salt (1x)',
        amount: 2296,
        paymentStatus: 'Pending',
        deliveryStatus: 'Pending',
        vendorId: vendor.vendorId,
      },
      {
        orderId: 'ORD-9404',
        customerName: 'Sneha Rao',
        products: 'Organic Alphonso Mangoes (1x)',
        amount: 809,
        paymentStatus: 'Paid',
        deliveryStatus: 'Delivered',
        vendorId: vendor.vendorId,
      },
      {
        orderId: 'ORD-9405',
        customerName: 'Kabir Nair',
        products: 'Artisanal Malabar Black Pepper (3x)',
        amount: 960,
        paymentStatus: 'Failed',
        deliveryStatus: 'Cancelled',
        vendorId: vendor.vendorId,
      },
    ]);
    console.log('Orders seeded.');

    // 7. Seed Customers
    await Customer.insertMany([
      {
        customerId: 'CUST-301',
        name: 'Aarav Mehta',
        mobile: '+91 99887 76655',
        status: 'Active',
        vendorId: vendor.vendorId,
      },
      {
        customerId: 'CUST-302',
        name: 'Ananya Deshmukh',
        mobile: '+91 98776 65544',
        status: 'Active',
        vendorId: vendor.vendorId,
      },
      {
        customerId: 'CUST-303',
        name: 'Rohan Kapoor',
        mobile: '+91 97665 54433',
        status: 'Active',
        vendorId: vendor.vendorId,
      },
      {
        customerId: 'CUST-304',
        name: 'Sneha Rao',
        mobile: '+91 96554 43322',
        status: 'Disabled',
        vendorId: vendor.vendorId,
      },
      {
        customerId: 'CUST-305',
        name: 'Kabir Nair',
        mobile: '+91 95443 32211',
        status: 'Active',
        vendorId: vendor.vendorId,
      },
    ]);
    console.log('Customers seeded.');

    // 8. Seed Reports
    await Report.insertMany([
      {
        reportId: 'TC014',
        name: 'Today Sales Report',
        period: 'Daily Summary',
        customersCount: 128,
        status: 'Active (Generating)',
        vendorId: vendor.vendorId,
      },
      {
        reportId: 'TC021',
        name: 'Weekly Performance Report',
        period: 'Weekly Aggregate',
        customersCount: 94,
        status: 'Active (Generating)',
        vendorId: vendor.vendorId,
      },
      {
        reportId: 'TC031',
        name: 'Monthly Revenue Analytics',
        period: 'Monthly Analytics',
        customersCount: 0,
        status: 'Disabled (Archived)',
        vendorId: vendor.vendorId,
      },
    ]);
    console.log('Reports seeded.');

    // 9. Seed Notifications
    await Notification.insertMany([
      {
        notificationId: 'NOTIF-01',
        category: 'NEW ORDERS',
        title: 'New Order Received #ORD-9401',
        body: 'Customer Aarav Mehta placed an order worth ₹1938.',
        status: 'Unread',
        vendorId: vendor.vendorId,
      },
      {
        notificationId: 'NOTIF-02',
        category: 'STOCK ALERTS',
        title: 'Low Stock Warning',
        body: 'Cold Pressed Virgin Coconut Oil is down to 8 units. Minimum threshold is 20.',
        status: 'Unread',
        vendorId: vendor.vendorId,
      },
      {
        notificationId: 'NOTIF-03',
        category: 'PAYMENT RECEIVED',
        title: 'Payout Settlement Credited',
        body: 'Weekly payout of ₹15,450.00 has been transferred to your Bank Account.',
        status: 'Read',
        vendorId: vendor.vendorId,
      },
      {
        notificationId: 'NOTIF-04',
        category: 'DIRECTORY LISTING',
        title: 'Local Trade Street Spotlight Badge',
        body: 'Congratulations! Your store is awarded a Spotlight Badge.',
        status: 'Read',
        vendorId: vendor.vendorId,
      },
    ]);
    console.log('Notifications seeded.');

    // 10. Seed Tickets
    await SupportTicket.insertMany([
      {
        ticketId: 'TKT-8021',
        category: 'Payout & Settlement',
        subject: 'Query regarding weekly settlement credit timing',
        description: 'My payout for last week was processed on Monday, but the confirmation UTR is pending update.',
        priority: 'High Priority',
        status: 'In Progress',
        assignedAgent: 'Priya Sharma',
        vendorId: vendor.vendorId,
        replies: [
          {
            sender: 'Vendor',
            message: 'My payout for last week was processed on Monday, but the confirmation UTR is pending update.',
          },
        ],
      },
      {
        ticketId: 'TKT-7914',
        category: 'Order Dispatch & Logistics',
        subject: 'Pickup delay for bulk order',
        description: 'Pickup is delayed by 2 days for ORD-9405.',
        priority: 'Urgent Priority',
        status: 'Open',
        assignedAgent: 'Priya Sharma',
        vendorId: vendor.vendorId,
        replies: [
          {
            sender: 'Vendor',
            message: 'Pickup is delayed by 2 days for ORD-9405.',
          },
        ],
      },
      {
        ticketId: 'TKT-7850',
        category: 'Product Catalog Listing',
        subject: 'Request to add organic mango subcategory',
        description: 'Please add organic mango under Grocery category.',
        priority: 'Low Priority',
        status: 'Resolved',
        assignedAgent: 'Priya Sharma',
        vendorId: vendor.vendorId,
        replies: [
          {
            sender: 'Vendor',
            message: 'Please add organic mango under Grocery category.',
          },
        ],
      },
    ]);
    console.log('Support Tickets seeded.');

    console.log('Seeding Completed Successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
