const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  participantName: String,
  participantEmail: String,
  eventName: String,
  eventDate: Date,
  eventVenue: String,
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // For hackathon teams
  qrCode: String, // Base64 encoded QR code PNG
  attendanceMarked: { type: Boolean, default: false },
  attendanceTimestamp: Date,
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' },
  auditLog: [
    {
      action: String,
      timestamp: { type: Date, default: Date.now },
      performedBy: mongoose.Schema.Types.ObjectId,
      reason: String,
    }
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ticket', ticketSchema);
