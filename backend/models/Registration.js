const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  status: { 
    type: String, 
    enum: ['Registered', 'Pending Approval', 'Successful', 'Rejected', 'Cancelled'], 
    default: 'Registered' 
  },
  paymentProof: String, // File path for merchandise purchase proof
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  formResponses: {
    type: Map,
    of: mongoose.Schema.Types.Mixed, // Key is fieldId, value is response
  },
  purchasedVariant: {
    variantId: String,
    size: String,
    color: String,
    quantity: Number,
    price: Number,
  },
  rejectionReason: String, // For rejected merchandise purchases
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound unique index to prevent duplicate registrations
registrationSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
