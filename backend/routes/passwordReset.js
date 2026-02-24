const express = require('express');
const router = express.Router();
const { verifyToken, roleCheck } = require('../middleware/authMiddleware');
const PasswordResetRequest = require('../models/PasswordResetRequest');

// Request password reset (organizer)
router.post('/request-reset', verifyToken, roleCheck('Organizer'), async (req, res) => {
  try {
    const { reason } = req.body;

    // Check if there's already a pending request
    const existingRequest = await PasswordResetRequest.findOne({
      organizerId: req.user.userId,
      status: 'Pending',
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending password reset request' });
    }

    const resetRequest = new PasswordResetRequest({
      organizerId: req.user.userId,
      reason,
    });

    await resetRequest.save();
    res.status(201).json({ message: 'Password reset request submitted', resetRequest });
  } catch (error) {
    console.error('Request reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get organizer's own reset requests
router.get('/my-reset-requests', verifyToken, roleCheck('Organizer'), async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ organizerId: req.user.userId })
      .sort({ requestedAt: -1 })
      .lean();
    res.json(requests);
  } catch (error) {
    console.error('Get reset requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
