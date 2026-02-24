const Feedback = require('../models/Feedback');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

const submitFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rating, comment } = req.body;
    // Verify the participant attended / is registered
    const registration = await Registration.findOne({
      eventId,
      participantId: req.user.userId,
      status: { $in: ['Registered', 'Successful'] },
    });
    if (!registration) return res.status(403).json({ error: 'You must be registered for this event to give feedback.' });

    // Anonymous submission: use hash for dedup, never store participantId
    const submitterHash = Feedback.generateSubmitterHash(req.user.userId, eventId);
    const feedback = new Feedback({ eventId, submitterHash, rating, comment: comment || '' });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'You already submitted feedback for this event.' });
    console.error('Submit feedback error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getMyFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const submitterHash = Feedback.generateSubmitterHash(req.user.userId, eventId);
    const feedback = await Feedback.findOne({ eventId, submitterHash });
    res.json(feedback || null);
  } catch (err) {
    console.error('Get my feedback error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getFeedbackSummary = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify organizer owns the event
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized: not the event organizer' });
    }

    const feedbacks = await Feedback.find({ eventId }).select('-submitterHash').lean();
    if (feedbacks.length === 0) return res.json({ count: 0, averageRating: 0, distribution: {}, comments: [] });
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    feedbacks.forEach(f => { totalRating += f.rating; distribution[f.rating] = (distribution[f.rating] || 0) + 1; });
    const averageRating = (totalRating / feedbacks.length).toFixed(1);
    const comments = feedbacks.filter(f => f.comment).map(f => ({ rating: f.rating, comment: f.comment, createdAt: f.createdAt }));
    res.json({ count: feedbacks.length, averageRating: parseFloat(averageRating), distribution, comments });
  } catch (err) {
    console.error('Get feedback summary error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { submitFeedback, getMyFeedback, getFeedbackSummary };
