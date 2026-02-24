const { Organizer, Admin } = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { generateSecurePassword } = require('../utils/tokenUtils');
const { sendOrganizerCredentialsEmail, sendPasswordResetNotificationEmail } = require('../utils/emailService');

// Create organizer
const createOrganizer = async (req, res) => {
  try {
    const { name, category, description, contactEmail } = req.body;

    // Generate login email (simple slugification)
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const loginEmail = `${slug}@felicity.com`;

    // Check if email already exists
    const existingOrganizer = await Organizer.findOne({ loginEmail });
    if (existingOrganizer) {
      return res.status(400).json({ error: 'Organizer login email already exists' });
    }

    // Generate secure password
    const plainPassword = generateSecurePassword();

    const organizer = new Organizer({
      name,
      category,
      description,
      contactEmail,
      loginEmail,
      password: plainPassword, // Will be hashed by pre-save hook
      isActive: true,
    });

    await organizer.save();

    // Send credentials email
    await sendOrganizerCredentialsEmail(contactEmail, loginEmail, plainPassword, name);

    res.status(201).json({
      message: 'Organizer created successfully',
      organizer: {
        _id: organizer._id,
        name: organizer.name,
        loginEmail: organizer.loginEmail,
        contactEmail: organizer.contactEmail,
        isActive: organizer.isActive,
      },
      credentials: {
        loginEmail,
        plainPassword, // Show only once
      },
    });
  } catch (error) {
    console.error('Create organizer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all organizers
const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find()
      .select('-password')
      .lean();
    res.json(organizers);
  } catch (error) {
    console.error('Get all organizers error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Toggle organizer status
const toggleOrganizerStatus = async (req, res) => {
  try {
    const { organizerId } = req.params;
    const organizer = await Organizer.findById(organizerId);

    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    organizer.isActive = !organizer.isActive;
    await organizer.save();

    res.json({ message: `Organizer ${organizer.isActive ? 'activated' : 'deactivated'}`, organizer });
  } catch (error) {
    console.error('Toggle organizer status error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete organizer
const deleteOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;
    const result = await Organizer.findByIdAndDelete(organizerId);

    if (!result) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    res.json({ message: 'Organizer deleted' });
  } catch (error) {
    console.error('Delete organizer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get password reset requests
const getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find()
      .populate('organizerId', 'name loginEmail contactEmail')
      .sort({ requestedAt: -1 })
      .lean();
    res.json(requests);
  } catch (error) {
    console.error('Get password reset requests error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Approve password reset
const approvePasswordReset = async (req, res) => {
  try {
    const { requestId } = req.params;
    const resetRequest = await PasswordResetRequest.findById(requestId)
      .populate('organizerId');

    if (!resetRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Generate new password
    const newPlainPassword = generateSecurePassword();

    // Update organizer password
    const organizer = await Organizer.findById(resetRequest.organizerId);
    organizer.password = newPlainPassword;
    await organizer.save();

    // Update request
    resetRequest.status = 'Approved';
    resetRequest.respondedAt = new Date();
    resetRequest.respondedBy = req.user.userId;
    await resetRequest.save();

    // Send email to organizer
    await sendPasswordResetNotificationEmail(
      organizer.contactEmail,
      organizer.name,
      newPlainPassword
    );

    res.json({
      message: 'Password reset approved',
      request: resetRequest,
      newPassword: newPlainPassword, // Show only to admin
    });
  } catch (error) {
    console.error('Approve password reset error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Reject password reset
const rejectPasswordReset = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;

    const resetRequest = await PasswordResetRequest.findById(requestId);
    if (!resetRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    resetRequest.status = 'Rejected';
    resetRequest.rejectionComment = comment;
    resetRequest.respondedAt = new Date();
    resetRequest.respondedBy = req.user.userId;
    await resetRequest.save();

    res.json({ message: 'Password reset rejected', request: resetRequest });
  } catch (error) {
    console.error('Reject password reset error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get admin dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const { Participant } = require('../models/User');
    const Event = require('../models/Event');
    const Registration = require('../models/Registration');

    const participantCount = await Participant.countDocuments();
    const organizerCount = await Organizer.countDocuments();
    const eventCount = await Event.countDocuments();
    const registrationCount = await Registration.countDocuments();
    const pendingResetCount = await PasswordResetRequest.countDocuments({ status: 'Pending' });

    res.json({
      participantCount,
      organizerCount,
      eventCount,
      registrationCount,
      pendingResetCount,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createOrganizer,
  getAllOrganizers,
  toggleOrganizerStatus,
  deleteOrganizer,
  getPasswordResetRequests,
  approvePasswordReset,
  rejectPasswordReset,
  getDashboardStats,
};
