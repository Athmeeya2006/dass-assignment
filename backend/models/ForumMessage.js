const mongoose = require('mongoose');

const forumMessageSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: String,
  authorRole: String, // 'Participant' or 'Organizer'
  content: String,
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumMessage' },
  isPinned: { type: Boolean, default: false },
  reactions: {
    type: Map,
    of: [mongoose.Schema.Types.ObjectId], // emoji: [userIds]
  },
  deletedAt: Date,
  deletedBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

forumMessageSchema.index({ eventId: 1, createdAt: 1 });

module.exports = mongoose.model('ForumMessage', forumMessageSchema);
