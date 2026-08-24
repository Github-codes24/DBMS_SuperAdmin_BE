import Product from '../MyProducts/productSchema.js';
import Order from '../Orders/orderSchema.js';
import SupportTicket from '../HelpSupport/supportSchema.js';
import { State, Category, Subcategory } from './cascadeFilterSchema.js';

// @desc    Get dashboard metrics counters
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const vendorId = req.vendorId;

    // 1. Total Products
    const totalProducts = await Product.countDocuments({ vendorId });

    // 2. Active Products (where stock is greater than 0)
    const activeProducts = await Product.countDocuments({ vendorId, stock: { $gt: 0 } });

    // 3. Orders Today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const ordersToday = await Order.countDocuments({
      vendorId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // 4. Pending Queries (Support Tickets not resolved)
    const pendingQueries = await SupportTicket.countDocuments({
      vendorId,
      status: { $ne: 'Resolved' },
    });

    // Mock/Simulated counters matching UI mockup screenshots
    const vendorActivity = 1006;
    const onlineUsers = 149;
    const pendingVendorPayment = 'No Pending Payments';

    res.json({
      totalProducts,
      activeProducts,
      ordersToday,
      pendingQueries,
      vendorActivity,
      onlineUsers,
      pendingVendorPayment,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get cascade filter lists (States, Categories, Subcategories)
// @route   GET /api/dashboard/cascade-data
// @access  Private
export const getCascadeData = async (req, res) => {
  try {
    const states = await State.find({});
    const categories = await Category.find({});
    const subcategories = await Subcategory.find({});

    res.json({
      states,
      categories,
      subcategories,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a new State entry
// @route   POST /api/dashboard/states
// @access  Private
export const addState = async (req, res) => {
  const { name, vendorCount } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ message: 'State name is required' });
    }

    const stateExists = await State.findOne({ name: name.trim() });
    if (stateExists) {
      return res.status(400).json({ message: 'State already exists' });
    }

    const state = await State.create({
      name: name.trim(),
      vendorCount: vendorCount || 0,
    });

    res.status(201).json(state);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a new Category entry
// @route   POST /api/dashboard/categories
// @access  Private
export const addCategory = async (req, res) => {
  const { name, vendorCount } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const categoryExists = await Category.findOne({ name: name.trim() });
    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({
      name: name.trim(),
      vendorCount: vendorCount || 0,
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a new Subcategory entry
// @route   POST /api/dashboard/subcategories
// @access  Private
export const addSubcategory = async (req, res) => {
  const { name, parentCategory, vendorCount } = req.body;

  try {
    if (!name || !parentCategory) {
      return res.status(400).json({ message: 'Subcategory name and parent category are required' });
    }

    const subcategoryExists = await Subcategory.findOne({
      name: name.trim(),
      parentCategory: parentCategory.trim(),
    });

    if (subcategoryExists) {
      return res.status(400).json({ message: 'Subcategory already exists under this category' });
    }

    const subcategory = await Subcategory.create({
      name: name.trim(),
      parentCategory: parentCategory.trim(),
      vendorCount: vendorCount || 0,
    });

    res.status(201).json(subcategory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
