const express = require('express');
const router = express.Router();
const { Organizer, Participant } = require('../models/User');
const Event = require('../models/Event');
const { verifyToken, roleCheck } = require('../middleware/authMiddleware');

// GET /api/organizers - List all active organizers (public)
router.get('/', async (req, res) => {
  try {
    const organizers = await Organizer.find({ isActive: true })
      .select('-password -loginEmail')
      .lean();
    res.json(organizers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizers/:id - Organizer detail page (public)
router.get('/:id', async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .select('-password -loginEmail')
      .lean();

    if (!organizer) return res.status(404).json({ error: 'Organizer not found' });

    const upcomingEvents = await Event.find({
      organizerId: req.params.id,
      status: { $in: ['Published', 'Ongoing'] },
      startDate: { $gte: new Date() },
    }).sort({ startDate: 1 }).lean();

    const pastEvents = await Event.find({
      organizerId: req.params.id,
      status: { $in: ['Completed', 'Closed'] },
    }).sort({ endDate: -1 }).lean();

    res.json({ organizer, upcomingEvents, pastEvents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/organizers/:id/follow - Follow organizer (participant)
router.post('/:id/follow', verifyToken, roleCheck('Participant'), async (req, res) => {
  try {
    const participant = await Participant.findById(req.user.userId);
    if (!participant.followedOrganizers.includes(req.params.id)) {
      participant.followedOrganizers.push(req.params.id);
      await participant.save();
    }
    res.json({ message: 'Organizer followed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/organizers/:id/follow - Unfollow organizer (participant)
router.delete('/:id/follow', verifyToken, roleCheck('Participant'), async (req, res) => {
  try {
    await Participant.findByIdAndUpdate(req.user.userId, {
      $pull: { followedOrganizers: req.params.id },
    });
    res.json({ message: 'Organizer unfollowed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
