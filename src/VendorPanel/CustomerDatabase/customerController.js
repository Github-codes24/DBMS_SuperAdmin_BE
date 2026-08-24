import Customer from './customerSchema.js';

// @desc    Get customers list with pagination and search
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
  const vendorId = req.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search } = req.query;

  try {
    let query = { vendorId };

    if (search) {
      query.$or = [
        { customerId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      customers,
      page,
      pages: Math.ceil(total / limit),
      totalCustomers: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a customer's details (Name, Mobile, Account Status)
// @route   PUT /api/customers/:customerId
// @access  Private
export const updateCustomer = async (req, res) => {
  const { name, mobile, status } = req.body;

  try {
    const customer = await Customer.findOne({ customerId: req.params.customerId, vendorId: req.vendorId });

    if (customer) {
      customer.name = name !== undefined ? name.trim() : customer.name;
      customer.mobile = mobile !== undefined ? mobile.trim() : customer.mobile;
      customer.status = status !== undefined ? status : customer.status;

      const updatedCustomer = await customer.save();
      res.json(updatedCustomer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Export customer database as CSV file
// @route   GET /api/customers/export-csv
// @access  Private
export const exportCustomersCSV = async (req, res) => {
  try {
    const customers = await Customer.find({ vendorId: req.vendorId }).sort({ customerId: 1 });

    const csvHeader = 'ID,Customer,Phone,Status\n';
    const csvRows = customers
      .map(
        (c) =>
          `"${c.customerId}","${c.name}","${c.mobile}","${c.status}"`
      )
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lts_vendor_customers_${dateStr}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
