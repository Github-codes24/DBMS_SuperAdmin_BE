import { State, Category, Subcategory } from '../../VendorPanel/VendorDashboard/cascadeFilterSchema.js';

// @desc    Get Super Admin Dashboard KPI Stats & Cards
// @route   GET /api/superadmin/dashboard/stats
// @access  Private (SuperAdmin)
export const getSuperAdminStats = async (req, res) => {
  try {
    const stats = {
      newVendors: {
        count: 48,
        badgePercentage: '+10%',
        totalVendors: '12356688/0',
      },
      newCustomers: {
        count: 373,
        badgePercentage: '+10%',
        totalCustomers: 56975,
      },
      newVendorRequests: {
        count: 17,
        totalFYRequests: 5363,
      },
      newCustomerQueries: {
        count: 0,
        totalQueries: 6,
      },
      todaysVendorAudit: {
        count: 1006,
        pendingQuality: 2290575,
      },
      onlineUsersDMS: {
        count: 149,
        badgePercentage: '+101%',
        totalUserCount: 147,
      },
      cascadeFilter: {
        selectedState: 'All',
        selectedCategory: 'All',
        selectedSubCategory: 'All',
      },
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get Master Consolidated Dashboard Overview (Single API using Promise.allSettled)
// @route   GET /api/v1/superadmin/dashboard/overview
// @access  Private (SuperAdmin)
export const getSuperAdminDashboardOverview = async (req, res) => {
  try {
    const results = await Promise.allSettled([
      // Task 0: KPI Cards Stats
      Promise.resolve({
        newVendors: { count: 48, badgePercentage: '+10%', totalVendors: '12356688/0' },
        newCustomers: { count: 373, badgePercentage: '+10%', totalCustomers: 56975 },
        newVendorRequests: { count: 17, totalFYRequests: 5363 },
        newCustomerQueries: { count: 0, totalQueries: 6 },
        todaysVendorAudit: { count: 1006, pendingQuality: 2290575 },
        onlineUsersDMS: { count: 149, badgePercentage: '+101%', totalUserCount: 147 },
        cascadeFilter: { selectedState: 'All', selectedCategory: 'All', selectedSubCategory: 'All' },
      }),
      // Task 1: States List
      State.find({}).sort({ vendorCount: -1 }),
      // Task 2: Categories List
      Category.find({}).sort({ vendorCount: -1 }),
      // Task 3: Subcategories List (Populating linked Category ObjectId)
      Subcategory.find({}).sort({ vendorCount: -1 }).populate('category', 'name vendorCount'),
    ]);

    const stats = results[0].status === 'fulfilled' ? results[0].value : {};
    const states = results[1].status === 'fulfilled' ? results[1].value : [];
    const categories = results[2].status === 'fulfilled' ? results[2].value : [];
    const subcategories = results[3].status === 'fulfilled' ? results[3].value : [];

    const pendingPayments = {
      status: 'Up to date',
      hasPending: false,
      message: 'No Pending Payments',
      subtext: 'All vendor payouts & invoices are cleared.',
    };

    res.json({
      message: 'Dashboard Overview fetched successfully',
      stats,
      cascadeData: {
        totalStates: states.length,
        totalCategories: categories.length,
        totalSubCategories: subcategories.length,
        states,
        categories,
        subcategories,
        pendingPayments,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get Super Admin Cascade Filter Lists (States, Categories, Subcategories, Pending Payments)
// @route   GET /api/v1/superadmin/dashboard/cascade-data
// @access  Private (SuperAdmin)
export const getSuperAdminCascadeData = async (req, res) => {
  try {
    const states = await State.find({}).sort({ vendorCount: -1 });
    const categories = await Category.find({}).sort({ vendorCount: -1 });
    const subcategories = await Subcategory.find({}).sort({ vendorCount: -1 }).populate('category', 'name vendorCount');

    const pendingPayments = {
      status: 'Up to date',
      hasPending: false,
      message: 'No Pending Payments',
      subtext: 'All vendor payouts & invoices are cleared.',
    };

    res.json({
      totalStates: states.length,
      totalCategories: categories.length,
      totalSubCategories: subcategories.length,
      states,
      categories,
      subcategories,
      pendingPayments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a new State entry (+ Add Button in UI)
// @route   POST /api/superadmin/dashboard/states
// @access  Private (SuperAdmin)
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

// @desc    Add a new Category entry (+ Add Button in UI)
// @route   POST /api/superadmin/dashboard/categories
// @access  Private (SuperAdmin)
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

// @desc    Add a new Subcategory entry (+ Add Button in UI, Linked via Category ObjectId)
// @route   POST /api/v1/superadmin/dashboard/subcategories
// @access  Private (SuperAdmin)
export const addSubcategory = async (req, res) => {
  const { name, categoryId, parentCategory, vendorCount } = req.body;

  try {
    if (!name || (!categoryId && !parentCategory)) {
      return res.status(400).json({ message: 'Subcategory name and parent Category ID (or Name) are required' });
    }

    let categoryObj = null;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      categoryObj = await Category.findById(categoryId);
    } else if (parentCategory) {
      categoryObj = await Category.findOne({ name: parentCategory.trim() });
    }

    if (!categoryObj) {
      return res.status(400).json({ message: 'Valid parent Category not found in database' });
    }

    const subcategoryExists = await Subcategory.findOne({
      name: name.trim(),
      $or: [{ category: categoryObj._id }, { parentCategory: categoryObj.name }],
    });

    if (subcategoryExists) {
      return res.status(400).json({ message: 'Subcategory already exists under this category' });
    }

    const subcategory = await Subcategory.create({
      name: name.trim(),
      category: categoryObj._id,
      parentCategory: categoryObj.name,
      vendorCount: vendorCount || 0,
    });

    res.status(201).json(subcategory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
