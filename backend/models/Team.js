const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  joinedAt: Date,
});

const teamSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  teamName: { type: String, required: true },
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  maxSize: { type: Number, required: true },
  inviteCode: { type: String, unique: true, required: true },
  members: [teamMemberSchema],
  status: { type: String, enum: ['Forming', 'Complete', 'Cancelled'], default: 'Forming' },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Team', teamSchema);
