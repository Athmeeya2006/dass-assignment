const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['Normal', 'Merchandise'], required: true },
  eligibility: String,
  registrationDeadline: { type: Date, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  venue: String,
  registrationLimit: Number,
  fee: { type: Number, default: 0 },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  tags: [String],
  status: { 
    type: String, 
    enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Closed'], 
    default: 'Draft' 
  },
  customForm: [
    {
      fieldId: String,
      type: { type: String, enum: ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number'], required: true },
      label: String,
      required: Boolean,
      options: [String], // For dropdown/radio
      order: Number,
    }
  ],
  merchandiseDetails: {
    sizes: [String],
    colors: [String],
    variants: [
      {
        variantId: String,
        size: String,
        color: String,
        stock: Number,
        price: Number,
      }
    ],
    purchaseLimitPerParticipant: Number,
  },
  totalRegistrations: { type: Number, default: 0 },
  totalAttendance: { type: Number, default: 0 },
  // Form locking: locked after first registration
  formLocked: { type: Boolean, default: false },
  // Team registration (Hackathon feature)
  teamRegistration: { type: Boolean, default: false },
  teamSize: { type: Number, default: 2 },
  // Analytics helpers for trending
  viewCount: { type: Number, default: 0 },
  viewTimestamps: [{ type: Date }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for common queries
eventSchema.index({ organizerId: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ organizerId: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);
