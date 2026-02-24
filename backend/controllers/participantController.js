const { Participant, Organizer } = require('../models/User');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');
const { generateQRCode } = require('../utils/qrGenerator');
const { sendRegistrationConfirmation, sendMerchandiseApprovalNotification } = require('../utils/emailService');

// Get participant profile
const getProfile = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user.userId)
      .select('-password')
      .populate('followedOrganizers', 'name category description')
      .lean();
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json(participant);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update participant profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, collegeOrg, interests, followedOrganizers } = req.body;
    
    const participant = await Participant.findByIdAndUpdate(
      req.user.userId,
      {
        firstName,
        lastName,
        contactNumber,
        collegeOrg,
        interests: interests || [],
        followedOrganizers: followedOrganizers || [],
      },
      { new: true }
    ).select('-password');

    res.json(participant);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Register for event
const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    let formResponses = req.body.formResponses || {};
    // If formResponses was sent as a JSON string (multipart), parse it
    if (typeof formResponses === 'string') {
      try { formResponses = JSON.parse(formResponses); } catch (_) { formResponses = {}; }
    }
    // Attach uploaded file paths to formResponses
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        formResponses[file.fieldname] = `/uploads/${file.filename}`;
      }
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only allow normal event registration through this endpoint
    if (event.type === 'Merchandise') {
      return res.status(400).json({ error: 'Merchandise events require purchase through the merchandise endpoint' });
    }

    // Check event is in a registerable status
    if (!['Published', 'Ongoing'].includes(event.status)) {
      return res.status(400).json({ error: 'Event is not currently accepting registrations' });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({ eventId, participantId: req.user.userId });
    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Check deadline
    if (new Date() > event.registrationDeadline) {
      return res.status(400).json({ error: 'Registration deadline passed' });
    }

    // Check limit
    if (event.registrationLimit) {
      const registrationCount = await Registration.countDocuments({ 
        eventId, 
        status: { $in: ['Registered', 'Successful'] } 
      });
      if (registrationCount >= event.registrationLimit) {
        return res.status(400).json({ error: 'Event registration full' });
      }
    }

    // Create registration
    const registration = new Registration({
      eventId,
      participantId: req.user.userId,
      status: 'Registered',
      formResponses: formResponses || {},
    });

    await registration.save();

    // Generate ticket
    const ticketId = uuidv4();
    const qrCode = await generateQRCode(ticketId);
    
    const participant = await Participant.findById(req.user.userId);
    
    const ticket = new Ticket({
      ticketId,
      eventId,
      participantId: req.user.userId,
      registrationId: registration._id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
      eventName: event.name,
      eventDate: event.startDate,
      eventVenue: event.venue,
      qrCode,
    });

    await ticket.save();

    // Update registration with ticket
    registration.ticketId = ticket._id;
    await registration.save();

    // Increment event registration count and lock form if first registration
    const regCount = await Registration.countDocuments({ eventId, status: { $in: ['Registered', 'Successful'] } });
    const updateData = { $inc: { totalRegistrations: 1 } };
    if (regCount === 1 && event.type === 'Normal') {
      updateData.$set = { formLocked: true };
    }
    await Event.findByIdAndUpdate(eventId, updateData);

    // Send confirmation email
    await sendRegistrationConfirmation(participant.email, event.name, ticketId, qrCode);

    res.status(201).json({
      message: 'Registration successful',
      registration,
      ticket,
    });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get upcoming events (registered)
const getUpcomingEvents = async (req, res) => {
  try {
    const registrations = await Registration.find({ 
      participantId: req.user.userId,
      status: { $in: ['Registered', 'Successful', 'Pending Approval'] }
    })
      .populate({ path: 'eventId', populate: { path: 'organizerId', select: 'name category' } })
      .populate({ path: 'ticketId', populate: { path: 'teamId', select: 'teamName' } })
      .sort({ createdAt: -1 })
      .lean();

    // Filter to only upcoming events (startDate in the future)
    const upcomingEvents = registrations
      .filter(reg => reg.eventId && new Date(reg.eventId.startDate) >= new Date())
      .map(reg => ({
        ...reg,
        event: reg.eventId,
        ticket: reg.ticketId,
      }));

    res.json(upcomingEvents);
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get registration history with tabs
const getRegistrationHistory = async (req, res) => {
  try {
    const { tab = 'all' } = req.query;

    let statusFilter = { $in: ['Registered', 'Successful', 'Pending Approval', 'Rejected', 'Cancelled'] };
    
    const popEvent = { path: 'eventId', populate: { path: 'organizerId', select: 'name category' } };
    const popTicket = { path: 'ticketId', populate: { path: 'teamId', select: 'teamName' } };

    if (tab === 'normal') {
      // Normal events only
      const normalEventIds = await Event.find({ type: 'Normal' }).select('_id');
      const histories = await Registration.find({
        participantId: req.user.userId,
        eventId: { $in: normalEventIds },
        status: statusFilter,
      })
        .populate(popEvent)
        .populate(popTicket)
        .sort({ createdAt: -1 })
        .lean();
      return res.json(histories);
    } else if (tab === 'merchandise') {
      const merchEventIds = await Event.find({ type: 'Merchandise' }).select('_id');
      const histories = await Registration.find({
        participantId: req.user.userId,
        eventId: { $in: merchEventIds },
        status: statusFilter,
      })
        .populate(popEvent)
        .populate(popTicket)
        .sort({ createdAt: -1 })
        .lean();
      return res.json(histories);
    } else if (tab === 'completed') {
      // Registrations for events that are Completed
      const completedEventIds = await Event.find({ status: 'Completed' }).select('_id');
      const histories = await Registration.find({
        participantId: req.user.userId,
        eventId: { $in: completedEventIds },
        status: { $in: ['Registered', 'Successful'] },
      })
        .populate(popEvent)
        .populate(popTicket)
        .sort({ createdAt: -1 })
        .lean();
      return res.json(histories);
    } else if (tab === 'cancelled') {
      const histories = await Registration.find({
        participantId: req.user.userId,
        status: { $in: ['Cancelled', 'Rejected'] },
      })
        .populate(popEvent)
        .populate(popTicket)
        .sort({ createdAt: -1 })
        .lean();
      return res.json(histories);
    }

    // All
    const histories = await Registration.find({ participantId: req.user.userId })
      .populate(popEvent)
      .populate(popTicket)
      .sort({ createdAt: -1 })
      .lean();
    res.json(histories);
  } catch (error) {
    console.error('Get registration history error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get ticket by ID
const getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId)
      .populate('eventId')
      .populate('participantId')
      .lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify ownership
    if (ticket.participantId._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Follow organizer
const followOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;

    const participant = await Participant.findById(req.user.userId);
    if (!participant.followedOrganizers.includes(organizerId)) {
      participant.followedOrganizers.push(organizerId);
      await participant.save();
    }

    res.json({ message: 'Organizer followed' });
  } catch (error) {
    console.error('Follow organizer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Unfollow organizer
const unfollowOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;

    await Participant.findByIdAndUpdate(
      req.user.userId,
      { $pull: { followedOrganizers: organizerId } }
    );

    res.json({ message: 'Organizer unfollowed' });
  } catch (error) {
    console.error('Unfollow organizer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Purchase merchandise
const purchaseMerchandise = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { variantId, quantity } = req.body;

    const event = await Event.findById(eventId);
    if (!event || event.type !== 'Merchandise') {
      return res.status(400).json({ error: 'Invalid merchandise event' });
    }

    // Check event is published/ongoing
    if (!['Published', 'Ongoing'].includes(event.status)) {
      return res.status(400).json({ error: 'Event is not accepting purchases' });
    }

    // Check deadline
    if (new Date() > event.registrationDeadline) {
      return res.status(400).json({ error: 'Purchase deadline has passed' });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({ eventId, participantId: req.user.userId });
    if (existingRegistration) {
      return res.status(400).json({ error: 'Already purchased from this event' });
    }

    // Find variant
    const variant = event.merchandiseDetails.variants.find(v => v.variantId === variantId);
    if (!variant) {
      return res.status(400).json({ error: 'Variant not found' });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check purchase limit
    if (quantity > event.merchandiseDetails.purchaseLimitPerParticipant) {
      return res.status(400).json({ error: 'Exceeds purchase limit' });
    }

    // Create registration (pending approval)
    const registration = new Registration({
      eventId,
      participantId: req.user.userId,
      status: 'Pending Approval',
      purchasedVariant: {
        variantId,
        size: variant.size,
        color: variant.color,
        quantity,
        price: variant.price,
      },
    });

    await registration.save();

    res.status(201).json({
      message: 'Merchandise purchase initiated - awaiting approval',
      registration,
    });
  } catch (error) {
    console.error('Purchase merchandise error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Save onboarding preferences
const saveOnboarding = async (req, res) => {
  try {
    const { interests, followedOrganizers } = req.body;
    await Participant.findByIdAndUpdate(req.user.userId, {
      interests: interests || [],
      followedOrganizers: followedOrganizers || [],
    });
    res.json({ message: 'Onboarding preferences saved' });
  } catch (error) {
    console.error('Save onboarding error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Upload payment proof
const uploadPaymentProof = async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.participantId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow upload if status is Pending Approval or Rejected (for re-upload)
    if (!['Pending Approval', 'Rejected'].includes(registration.status)) {
      return res.status(400).json({ error: 'Payment proof can only be uploaded for pending approval or rejected registrations' });
    }

    registration.paymentProof = `/uploads/${req.file.filename}`;
    // Reset to Pending Approval if re-uploading after rejection
    if (registration.status === 'Rejected') {
      registration.status = 'Pending Approval';
    }
    await registration.save();

    res.json({ message: 'Payment proof uploaded', registration });
  } catch (error) {
    console.error('Upload payment proof error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  saveOnboarding,
  registerForEvent,
  getUpcomingEvents,
  getRegistrationHistory,
  getTicket,
  followOrganizer,
  unfollowOrganizer,
  purchaseMerchandise,
  uploadPaymentProof,
};
