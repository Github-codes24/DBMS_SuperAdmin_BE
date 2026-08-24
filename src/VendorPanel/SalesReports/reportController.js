import Report from './reportSchema.js';

// @desc    Get sales report configurations list with pagination and search
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res) => {
  const vendorId = req.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search } = req.query;

  try {
    let query = { vendorId };

    if (search) {
      query.$or = [
        { reportId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      reports,
      page,
      pages: Math.ceil(total / limit),
      totalReports: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a report's configuration (Title, Aggregation Period, Status)
// @route   PUT /api/reports/:reportId
// @access  Private
export const updateReport = async (req, res) => {
  const { name, period, status } = req.body;

  try {
    const report = await Report.findOne({ reportId: req.params.reportId, vendorId: req.vendorId });

    if (report) {
      report.name = name !== undefined ? name.trim() : report.name;
      report.period = period !== undefined ? period : report.period;
      report.status = status !== undefined ? status : report.status;

      const updatedReport = await report.save();
      res.json(updatedReport);
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Export reports list as CSV file
// @route   GET /api/reports/export-csv
// @access  Private
export const exportReportsCSV = async (req, res) => {
  try {
    const reports = await Report.find({ vendorId: req.vendorId }).sort({ reportId: 1 });

    const csvHeader = 'Report ID,Report Name,Period,Customers,Status\n';
    const csvRows = reports
      .map(
        (r) =>
          `"${r.reportId}","${r.name}","${r.period}",${r.customersCount},"${r.status}"`
      )
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lts_vendor_reports_${dateStr}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
