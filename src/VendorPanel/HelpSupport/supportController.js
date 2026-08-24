import SupportTicket from './supportSchema.js';

// @desc    Get support tickets list with pagination and search
// @route   GET /api/tickets
// @access  Private
export const getTickets = async (req, res) => {
  const vendorId = req.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, status } = req.query;

  try {
    let query = { vendorId };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await SupportTicket.countDocuments(query);
    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      tickets,
      page,
      pages: Math.ceil(total / limit),
      totalTickets: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single ticket details and reply thread history
// @route   GET /api/tickets/:ticketId
// @access  Private
export const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({ ticketId: req.params.ticketId, vendorId: req.vendorId });
    if (ticket) {
      res.json(ticket);
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Raise a support ticket
// @route   POST /api/tickets
// @access  Private
export const createTicket = async (req, res) => {
  const { category, subject, description, priority } = req.body;

  try {
    if (!category || !subject || !description) {
      return res.status(400).json({ message: 'Please provide Category, Subject, and Description' });
    }

    // Generate a unique ticket ID like TKT-8021
    let ticketId;
    let isUnique = false;
    while (!isUnique) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      ticketId = `TKT-${randNum}`;
      const ticketExists = await SupportTicket.findOne({ ticketId });
      if (!ticketExists) {
        isUnique = true;
      }
    }

    const ticket = new SupportTicket({
      ticketId,
      category,
      subject,
      description,
      priority: priority || 'Medium Priority',
      vendorId: req.vendorId,
      replies: [
        {
          sender: 'Vendor',
          message: description,
        },
      ],
    });

    const createdTicket = await ticket.save();
    res.status(201).json(createdTicket);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a reply message to the support ticket thread
// @route   POST /api/tickets/:ticketId/replies
// @access  Private
export const addReply = async (req, res) => {
  const { message } = req.body;

  try {
    if (!message) {
      return res.status(400).json({ message: 'Reply message is required' });
    }

    const ticket = await SupportTicket.findOne({ ticketId: req.params.ticketId, vendorId: req.vendorId });

    if (ticket) {
      ticket.replies.push({
        sender: 'Vendor',
        message: message.trim(),
      });

      // Update status to Open if it was Resolved/closed when vendor replied
      if (ticket.status === 'Resolved') {
        ticket.status = 'In Progress';
      }

      const updatedTicket = await ticket.save();
      res.status(201).json(updatedTicket);
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
