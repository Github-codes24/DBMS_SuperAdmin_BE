import Product from './productSchema.js';

// @desc    Get products list with pagination, search, and filters
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res) => {
  const vendorId = req.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, category, status } = req.query;

  try {
    let query = { vendorId };

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      products,
      page,
      pages: Math.ceil(total / limit),
      totalProducts: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single product details
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendorId: req.vendorId });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private
export const createProduct = async (req, res) => {
  const { name, category, sku, price, stock, originalPrice, image } = req.body;

  try {
    if (!name || !category || !sku || price === undefined || stock === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const skuExists = await Product.findOne({ sku: sku.trim() });
    if (skuExists) {
      return res.status(400).json({ message: 'Product SKU already exists' });
    }

    const product = new Product({
      sku: sku.trim(),
      name: name.trim(),
      category: category.trim(),
      price,
      originalPrice: originalPrice || 0,
      stock,
      vendorId: req.vendorId,
      image: image || '',
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req, res) => {
  const { name, category, sku, price, stock, originalPrice, image } = req.body;

  try {
    const product = await Product.findOne({ _id: req.params.id, vendorId: req.vendorId });

    if (product) {
      if (sku && sku !== product.sku) {
        const skuExists = await Product.findOne({ sku: sku.trim() });
        if (skuExists) {
          return res.status(400).json({ message: 'Product SKU already exists' });
        }
        product.sku = sku.trim();
      }

      product.name = name !== undefined ? name.trim() : product.name;
      product.category = category !== undefined ? category.trim() : product.category;
      product.price = price !== undefined ? price : product.price;
      product.originalPrice = originalPrice !== undefined ? originalPrice : product.originalPrice;
      product.stock = stock !== undefined ? stock : product.stock;
      product.image = image !== undefined ? image : product.image;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
export const deleteProduct = async (req, res) => {
  try {
    const result = await Product.deleteOne({ _id: req.params.id, vendorId: req.vendorId });
    if (result.deletedCount === 1) {
      res.json({ message: 'Product removed successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Export product catalog as CSV file
// @route   GET /api/products/export-csv
// @access  Private
export const exportProductsCSV = async (req, res) => {
  try {
    const products = await Product.find({ vendorId: req.vendorId }).sort({ sku: 1 });

    const csvHeader = 'SKU,Product Name,Category,Price,Stock,Status\n';
    const csvRows = products
      .map(
        (p) =>
          `"${p.sku}","${p.name.replace(/"/g, '""')}","${p.category}",${p.price},${p.stock},"${p.status}"`
      )
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lts_vendor_products_${dateStr}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
