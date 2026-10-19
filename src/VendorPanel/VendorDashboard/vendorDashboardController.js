import Product from '../MyProducts/productSchema.js';
import Order from '../Orders/orderSchema.js';
import SupportTicket from '../HelpSupport/supportSchema.js';
import { State, Category, Subcategory,Project } from './cascadeFilterSchema.js';
import Counter from "../VendorDashboard/cascadeFilterSchema.js"

export const generateCategoryId = async () => {
  const lastCategory = await Category.findOne({
    categoryId: { $regex: /^CAT-\d+$/ },
  })
    .sort({ categoryId: -1 })
    .select('categoryId')
    .lean();

  if (!lastCategory) {
    return 'CAT-001';
  }

  const lastNumber = parseInt(lastCategory.categoryId.split('-')[1], 10);

  return `CAT-${String(lastNumber + 1).padStart(3, '0')}`;
};
export const generateSubcategoryId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'subcategoryId' },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `SUBCAT-${String(counter.sequence).padStart(3, '0')}`;
};
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
// export const addCategory = async (req, res) => {
//   const { name, vendorCount } = req.body;

//   try {
//     if (!name) {
//       return res.status(400).json({ message: 'Category name is required' });
//     }

//     const categoryExists = await Category.findOne({ name: name.trim() });
//     if (categoryExists) {
//       return res.status(400).json({ message: 'Category already exists' });
//     }
//     const categoryId = await generateCategoryId();

//     const category = await Category.create({
//       categoryId,
//       name: name.trim(),
//       vendorCount: vendorCount || 0,
//     });

//     res.status(201).json(category);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

export const addCategory = async (req, res) => {
  const { name, projectId } = req.body;

  try {
    if (!name?.trim()) {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    if (!projectId?.trim()) {
      return res.status(400).json({
        message: "Project ID is required",
      });
    }

    const project = await Project.findOne({ projectId: projectId.trim() });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const normalizedName = name.trim();

    const categoryExists = await Category.findOne({
      name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      projectId: projectId.trim(),
    });

    if (categoryExists) {
      return res.status(400).json({
        message: "Category already exists in this project",
      });
    }

    const categoryId = await generateCategoryId();

    const category = await Category.create({
      categoryId,
      name: normalizedName,
      projectId: projectId.trim(),
    });

    await Project.updateOne(
      { projectId },
      { $addToSet: { categories: category.categoryId } }
    );

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Add a new Subcategory entry
// @route   POST /api/dashboard/subcategories
// @access  Private
// export const addSubcategory = async (req, res) => {
//   const { name, parentCategory, vendorCount } = req.body;

//   try {
//     if (!name || !parentCategory) {
//       return res.status(400).json({ message: 'Subcategory name and parent category are required' });
//     }

//     const subcategoryExists = await Subcategory.findOne({
//       name: name.trim(),
//       parentCategory: parentCategory.trim(),
//     });

//     if (subcategoryExists) {
//       return res.status(400).json({ message: 'Subcategory already exists under this category' });
//     }
//     const subCategoryId = await generateSubcategoryId();
//     const subcategory = await Subcategory.create({
//       subCategoryId,
//       name: name.trim(),
//       parentCategory: parentCategory.trim(),
//       vendorCount: vendorCount || 0,
//     });

//     res.status(201).json(subcategory);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

export const addSubcategory = async (req, res) => {
  const { name, subcategories, parentCategory, vendorCount } = req.body;

  try {
    if (!parentCategory?.trim()) {
      return res.status(400).json({
        message: 'Parent category is required',
      });
    }

    const category = await Category.findOne({
      name: parentCategory.trim(),
    });

    if (!category) {
      return res.status(404).json({
        message: 'Parent category not found',
      });
    }

    // Support either a single name or an array of names
    const names = Array.isArray(subcategories)
      ? subcategories
      : [name];

    if (
      names.length === 0 ||
      names.some((item) => typeof item !== 'string' || !item.trim())
    ) {
      return res.status(400).json({
        message: 'Provide a valid subcategory name or non-empty array',
      });
    }

    const normalizedNames = names.map((item) => item.trim());

    if (new Set(normalizedNames.map((item) => item.toLowerCase())).size !== normalizedNames.length) {
      return res.status(400).json({
        message: 'Duplicate names found in the request',
      });
    }

    const existing = await Subcategory.find({
      category: category._id,
      name: {
        $in: normalizedNames,
      },
    }).select('name');

    if (existing.length > 0) {
      return res.status(400).json({
        message: 'Some subcategories already exist',
        existing: existing.map((item) => item.name),
      });
    }

    const documents = [];

    for (const subcategoryName of normalizedNames) {
      documents.push({
        subCategoryId: await generateSubcategoryId(),
        name: subcategoryName,
        category: category._id,
        parentCategory: category.name,
        vendorCount: vendorCount ?? 0,
      });
    }

    const created = await Subcategory.insertMany(documents);

    return res.status(201).json({
      message: 'Subcategories created successfully',
      count: created.length,
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get Project's
// @route   Get /api/dashboard/Projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .select("projectId name")
      .sort({ projectId: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

// @desc    Get Categories
// @route    Get /api/dashboard/Categories
// @access  Private
export const getProjectCategories = async (req, res) => {
  try {
    const { projectId } = req.params;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    // Find the selected project
    const project = await Project.findOne({ projectId }).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get only categories assigned to this project
    const filter = {
      categoryId: { $in: project.categories },
    };

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      projectId: project.projectId,
      projectName: project.name,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      categories,
    });
  } catch (error) {
    console.error("Get project categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project categories",
    });
  }
};
// @desc    Get SubCategories
// @route    Get /api/dashboard/subCategories
// @access  Private
export const getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const category = await Category.findOne({ categoryId }).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    const filter = { category: category._id };
    const skip = (page - 1) * limit;
    const [subcategories, total] = await Promise.all([
      Subcategory.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subcategory.countDocuments(filter),
    ]);
    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      subcategories,
    });
  } catch (error) {
    console.error("Get subcategories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
    });
  }
};
// export const getProjectCategories = async (req, res) => {
//   try {
//     const { projectId } = req.params;

//     const page = Math.max(1, parseInt(req.query.page, 10) || 1);
//     const limit = Math.min(
//       100,
//       Math.max(1, parseInt(req.query.limit, 10) || 10)
//     );

//     const skip = (page - 1) * limit;

//     // Validate the selected project
//     const project = await Project.findOne({ projectId }).lean();

//     if (!project) {
//       return res.status(404).json({
//         success: false,
//         message: "Project not found",
//       });
//     }
//     // Return all shared categories, without subcategories
//     const filter = {};

//     const [categories, total] = await Promise.all([
//       Category.find(filter)
//         .sort({ name: 1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Category.countDocuments(filter),
//     ]);

//     return res.status(200).json({
//       success: true,
//       projectId: project.projectId,
//       projectName: project.name,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//       categories,
//     });
//   } catch (error) {
//     console.error("Get project categories error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch project categories",
//     });
//   }
// };