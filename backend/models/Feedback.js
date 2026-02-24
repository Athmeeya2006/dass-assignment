const mongoose = require('mongoose');
const crypto = require('crypto');

const feedbackSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  // Anonymous: store a one-way hash of participantId+eventId to prevent duplicates
  // but never store the actual participantId
  submitterHash: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

// One feedback per anonymous submitter per event (hash ensures uniqueness)
feedbackSchema.index({ eventId: 1, submitterHash: 1 }, { unique: true });

// Static helper to generate the hash
feedbackSchema.statics.generateSubmitterHash = function(participantId, eventId) {
  return crypto.createHash('sha256').update(`${participantId}:${eventId}`).digest('hex');
};

module.exports = mongoose.model('Feedback', feedbackSchema);
