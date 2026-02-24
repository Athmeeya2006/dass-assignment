const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const { Organizer, Participant } = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { generateQRCode } = require('../utils/qrGenerator');
const axios = require('axios');
const json2csv = require('json2csv').Parser;
const { sendMerchandiseApprovalNotification, sendMerchandiseApprovalEmail } = require('../utils/emailService');

// Create event
const createEvent = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      eligibility,
      registrationDeadline,
      startDate,
      endDate,
      venue,
      registrationLimit,
      fee,
      tags,
      customForm,
      merchandiseDetails,
    } = req.body;

    const event = new Event({
      name,
      description,
      type,
      eligibility,
      registrationDeadline,
      startDate,
      endDate,
      venue,
      registrationLimit,
      fee: fee || 0,
      organizerId: req.user.userId,
      tags: tags || [],
      customForm: customForm || [],
      merchandiseDetails: merchandiseDetails || {},
      status: 'Draft',
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all organizer events
const getOrganizerEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizerId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate registration counts and attendance counts per event
    const eventIds = events.map(e => e._id);
    const [regCounts, attCounts] = await Promise.all([
      Registration.aggregate([
        { $match: { eventId: { $in: eventIds }, status: { $in: ['Registered', 'Successful', 'Pending Approval'] } } },
        { $group: { _id: '$eventId', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: { eventId: { $in: eventIds }, attendanceMarked: true } },
        { $group: { _id: '$eventId', count: { $sum: 1 } } },
      ]),
    ]);

    const regMap = Object.fromEntries(regCounts.map(r => [r._id.toString(), r.count]));
    const attMap = Object.fromEntries(attCounts.map(a => [a._id.toString(), a.count]));

    const enriched = events.map(e => ({
      ...e,
      totalRegistrations: regMap[e._id.toString()] || 0,
      attendanceCount: attMap[e._id.toString()] || 0,
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get event detail (organizer view)
const getEventDetail = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get analytics
    const registrations = await Registration.find({
      eventId,
      status: { $in: ['Successful', 'Registered'] }
    });

    const tickets = await Ticket.find({ eventId });
    const attendanceCount = tickets.filter(t => t.attendanceMarked).length;

    const registrationList = await Registration.find({ eventId })
      .populate('participantId', 'firstName lastName email')
      .populate({ path: 'ticketId', populate: { path: 'teamId', select: 'teamName status members' } })
      .lean();

    // Team completion stats
    const Team = require('../models/Team');
    const teams = await Team.find({ eventId }).lean();
    const teamCompletion = {
      total: teams.length,
      complete: teams.filter(t => t.status === 'Complete').length,
      forming: teams.filter(t => t.status === 'Forming').length,
    };

    // Revenue: fee-based for normal events, variant price for merchandise
    const revenue = event.type === 'Merchandise'
      ? registrations.reduce((sum, r) => sum + ((r.purchasedVariant?.price || 0) * (r.purchasedVariant?.quantity || 1)), 0)
      : registrations.length * (event.fee || 0);

    res.json({
      event,
      analytics: {
        registrationCount: registrations.length,
        attendanceCount,
        revenue,
        teamCompletion,
      },
      registrationList,
    });
  } catch (error) {
    console.error('Get event detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update event
const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate status transitions and allowed updates
    if (event.status === 'Draft') {
      // Draft: can update all fields
      Object.assign(event, updates);
    } else if (event.status === 'Published') {
      // Published: can update description, extend deadline, increase limit, close registrations, mark ongoing
      if (updates.description) event.description = updates.description;
      if (updates.registrationDeadline) event.registrationDeadline = updates.registrationDeadline;
      if (updates.registrationLimit && (event.registrationLimit == null || updates.registrationLimit >= event.registrationLimit)) {
        event.registrationLimit = updates.registrationLimit;
      }
      if (updates.status === 'Closed' || updates.status === 'Ongoing') event.status = updates.status;
    } else if (['Ongoing', 'Completed'].includes(event.status)) {
      // Can only mark as Completed or Closed
      if (updates.status === 'Completed' || updates.status === 'Closed') {
        event.status = updates.status;
      } else {
        return res.status(400).json({ error: 'Cannot edit ongoing/completed events' });
      }
    }

    event.updatedAt = new Date();
    await event.save();
    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Publish event
const publishEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (event.status !== 'Draft') {
      return res.status(400).json({ error: 'Only draft events can be published' });
    }

    event.status = 'Published';
    await event.save();

    // Post to Discord webhook if configured
    const organizer = await Organizer.findById(req.user.userId);
    if (organizer?.discordWebhook) {
      try {
        await axios.post(organizer.discordWebhook, {
          embeds: [
            {
              title: event.name,
              description: event.description,
              fields: [
                { name: 'Type', value: event.type },
                { name: 'Date', value: new Date(event.startDate).toLocaleDateString() },
                { name: 'Registration Limit', value: event.registrationLimit || 'Unlimited' },
              ],
              color: 3447003,
            },
          ],
        });
      } catch (discordError) {
        console.error('Discord webhook error:', discordError);
        // Don't fail the request if Discord fails
      }
    }

    res.json({ message: 'Event published', event });
  } catch (error) {
    console.error('Publish event error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get pending merchandise approvals
const getPendingMerchandiseApprovals = async (req, res) => {
  try {
    const events = await Event.find({ organizerId: req.user.userId }).select('_id');
    const eventIds = events.map(e => e._id);

    const pendingApprovals = await Registration.find({
      eventId: { $in: eventIds },
      status: 'Pending Approval',
    })
      .populate('participantId', 'firstName lastName email')
      .populate('eventId', 'name')
      .lean();

    res.json(pendingApprovals);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Approve merchandise purchase
const approveMerchandisePurchase = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const registration = await Registration.findById(registrationId)
      .populate('eventId')
      .populate('participantId');

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // Verify ownership
    if (registration.eventId.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update variant stock (atomic)
    if (!registration.eventId.merchandiseDetails || !registration.eventId.merchandiseDetails.variants) {
      return res.status(400).json({ error: 'Event merchandise details not found' });
    }

    const variant = registration.eventId.merchandiseDetails.variants.find(
      v => v.variantId === registration.purchasedVariant.variantId
    );

    if (!variant) {
      return res.status(400).json({ error: 'Variant not found' });
    }

    if (variant.stock < registration.purchasedVariant.quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Decrement stock atomically
    await Event.findByIdAndUpdate(
      registration.eventId._id,
      {
        $inc: {
          'merchandiseDetails.variants.$[elem].stock': -registration.purchasedVariant.quantity,
        },
      },
      {
        arrayFilters: [{ 'elem.variantId': registration.purchasedVariant.variantId }],
      }
    );

    // Generate ticket
    const ticketId = uuidv4();
    const qrCode = await generateQRCode(ticketId);

    const ticket = new Ticket({
      ticketId,
      eventId: registration.eventId._id,
      participantId: registration.participantId._id,
      registrationId: registration._id,
      participantName: `${registration.participantId.firstName} ${registration.participantId.lastName}`,
      participantEmail: registration.participantId.email,
      eventName: registration.eventId.name,
      eventDate: registration.eventId.startDate,
      eventVenue: registration.eventId.venue,
      qrCode,
    });

    await ticket.save();

    // Update registration
    registration.status = 'Successful';
    registration.ticketId = ticket._id;
    await registration.save();

    // Send approval email
    await sendMerchandiseApprovalEmail(
      registration.participantId.email,
      registration.eventId.name,
      ticketId,
      qrCode
    );

    res.json({ message: 'Merchandise purchase approved', registration });
  } catch (error) {
    console.error('Approve merchandise error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Reject merchandise purchase
const rejectMerchandisePurchase = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { rejectionReason } = req.body;

    const registration = await Registration.findById(registrationId)
      .populate('eventId')
      .populate('participantId');

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.eventId.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    registration.status = 'Rejected';
    registration.rejectionReason = rejectionReason;
    await registration.save();

    // Send rejection email
    await sendMerchandiseApprovalNotification(
      registration.participantId.email,
      registration.eventId.name,
      'rejected'
    );

    res.json({ message: 'Merchandise purchase rejected', registration });
  } catch (error) {
    console.error('Reject merchandise error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Export participants CSV
const exportParticipantsCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const registrations = await Registration.find({ eventId })
      .populate('participantId', 'firstName lastName email')
      .populate({ path: 'ticketId', populate: { path: 'teamId', select: 'teamName' } })
      .lean();

    const csvData = registrations.map(r => ({
      'Participant Name': `${r.participantId?.firstName || ''} ${r.participantId?.lastName || ''}`,
      'Email': r.participantId?.email || '',
      'Registration Date': new Date(r.createdAt).toLocaleDateString(),
      'Status': r.status,
      'Payment': r.paymentProof ? 'Proof uploaded' : r.purchasedVariant ? `₹${r.purchasedVariant.price}` : '-',
      'Team': r.ticketId?.teamId?.teamName || '-',
    }));

    const parser = new json2csv({ fields: ['Participant Name', 'Email', 'Registration Date', 'Status', 'Payment', 'Team'] });
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="participants-${eventId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get organizer profile
const getProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user.userId)
      .select('-password')
      .lean();

    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    res.json(organizer);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update organizer profile
const updateProfile = async (req, res) => {
  try {
    const { name, category, description, contactEmail, contactNumber, discordWebhook } = req.body;

    const organizer = await Organizer.findByIdAndUpdate(
      req.user.userId,
      {
        name,
        category,
        description,
        contactEmail,
        contactNumber,
        discordWebhook,
      },
      { new: true }
    ).select('-password');

    res.json(organizer);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createEvent,
  getOrganizerEvents,
  getEventDetail,
  updateEvent,
  publishEvent,
  getPendingMerchandiseApprovals,
  approveMerchandisePurchase,
  rejectMerchandisePurchase,
  exportParticipantsCSV,
  getProfile,
  updateProfile,
};
