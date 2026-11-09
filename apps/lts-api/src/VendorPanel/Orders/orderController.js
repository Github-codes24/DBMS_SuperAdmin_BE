import Order from './orderSchema.js';

// @desc    Get orders list with pagination, search, and filters
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res) => {
  const vendorId = req.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, deliveryStatus } = req.query;

  try {
    let query = { vendorId };

    if (deliveryStatus) {
      query.deliveryStatus = deliveryStatus;
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { products: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      orders,
      page,
      pages: Math.ceil(total / limit),
      totalOrders: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get 4 most recent orders for dashboard Recent Orders table
// @route   GET /api/orders/recent
// @access  Private
export const getRecentOrders = async (req, res) => {
  try {
    const orders = await Order.find({ vendorId: req.vendorId })
      .sort({ createdAt: -1 })
      .limit(4);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:orderId
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, vendorId: req.vendorId });
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update order delivery status
// @route   PATCH /api/orders/:orderId/delivery-status
// @access  Private
export const updateDeliveryStatus = async (req, res) => {
  const { deliveryStatus } = req.body;

  try {
    const order = await Order.findOne({ orderId: req.params.orderId, vendorId: req.vendorId });

    if (order) {
      // Set payment status to Paid if delivery status is set to Delivered Successfully/Delivered
      order.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'Delivered' || deliveryStatus === 'Delivered Successfully') {
        order.paymentStatus = 'Paid';
      }

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Export orders list as CSV file
// @route   GET /api/orders/export-csv
// @access  Private
export const exportOrdersCSV = async (req, res) => {
  try {
    const orders = await Order.find({ vendorId: req.vendorId }).sort({ createdAt: -1 });

    const csvHeader = 'Order ID,Customer,Products,Amount,Payment,Delivery Status\n';
    const csvRows = orders
      .map(
        (o) =>
          `"${o.orderId}","${o.customerName}","${o.products.replace(/"/g, '""')}",${o.amount},"${o.paymentStatus}","${o.deliveryStatus}"`
      )
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lts_vendor_orders_${dateStr}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
