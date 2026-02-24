const mongoose = require('mongoose');

const teamChatMessageSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 2000 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Index for fast history retrieval ordered by time
teamChatMessageSchema.index({ teamId: 1, timestamp: 1 });

module.exports = mongoose.model('TeamChatMessage', teamChatMessageSchema);
