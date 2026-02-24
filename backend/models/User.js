const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const participantSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  participantType: { type: String, enum: ['IIIT', 'Non-IIIT'], required: true },
  collegeOrg: String,
  contactNumber: String,
  password: { type: String, required: true },
  interests: [String], // Areas of interest
  followedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' }],
  createdAt: { type: Date, default: Date.now },
}, { discriminatorKey: 'role', collection: 'users' });

const organizerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  description: String,
  contactEmail: String,
  loginEmail: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  discordWebhook: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, { discriminatorKey: 'role', collection: 'users' });

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { discriminatorKey: 'role', collection: 'users' });

// Base User schema
const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['Participant', 'Organizer', 'Admin'], required: true },
}, { discriminatorKey: 'role', collection: 'users' });

// Hash password before save
const hashPassword = async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || 12));
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
};

// Only attach to base schema - discriminators inherit middleware automatically
userSchema.pre('save', hashPassword);

// Method to compare passwords
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
const Participant = User.discriminator('Participant', participantSchema);
const Organizer = User.discriminator('Organizer', organizerSchema);
const Admin = User.discriminator('Admin', adminSchema);

module.exports = { User, Participant, Organizer, Admin };
