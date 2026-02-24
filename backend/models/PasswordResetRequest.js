const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  reason: String,
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  newPassword: String, // Hashed password when approved
  rejectionComment: String,
  requestedAt: { type: Date, default: Date.now },
  respondedAt: Date,
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
});

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
