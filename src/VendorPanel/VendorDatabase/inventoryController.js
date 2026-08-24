import Product from '../MyProducts/productSchema.js';

// @desc    Get inventory list (representing vendor database product stock records)
// @route   GET /api/inventory
// @access  Private
export const getInventory = async (req, res) => {
  const vendorId = req.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search } = req.query;

  try {
    let query = { vendorId };

    if (search) {
      query.$or = [
        { sku: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ sku: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      inventory: products,
      page,
      pages: Math.ceil(total / limit),
      totalRecords: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update stock level and status of an item by SKU
// @route   PUT /api/inventory/:sku
// @access  Private
export const updateInventory = async (req, res) => {
  const { stock, status } = req.body;
  const { sku } = req.params;

  try {
    const product = await Product.findOne({ sku, vendorId: req.vendorId });

    if (product) {
      if (stock !== undefined) {
        product.stock = stock;
      }
      if (status !== undefined) {
        product.status = status;
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Inventory item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Export inventory directory list as CSV file
// @route   GET /api/inventory/export-csv
// @access  Private
export const exportInventoryCSV = async (req, res) => {
  try {
    const products = await Product.find({ vendorId: req.vendorId }).sort({ sku: 1 });

    const csvHeader = 'SKU,Product Name,Category,Stock,Status\n';
    const csvRows = products
      .map(
        (p) =>
          `"${p.sku}","${p.name.replace(/"/g, '""')}","${p.category}",${p.stock},"${p.status}"`
      )
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lts_vendor_inventory_${dateStr}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
