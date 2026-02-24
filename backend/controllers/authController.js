const { User, Participant, Organizer, Admin } = require('../models/User');
const { generateToken } = require('../utils/tokenUtils');

// Signup - Participant only
const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, participantType, collegeOrg, contactNumber } = req.body;

    // Input validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['IIIT', 'Non-IIIT'].includes(participantType)) {
      return res.status(400).json({ error: 'Participant type must be IIIT or Non-IIIT' });
    }

    // Validate IIIT email
    if (participantType === 'IIIT') {
      if (!email.endsWith('@students.iiit.ac.in') && !email.endsWith('@iiit.ac.in') && !email.endsWith('@research.iiit.ac.in')) {
        return res.status(400).json({ error: 'IIIT participants must use @students.iiit.ac.in, @iiit.ac.in, or @research.iiit.ac.in email' });
      }
    }

    // Check if user exists across all user types (email + loginEmail)
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { loginEmail: email.toLowerCase() }]
    });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Create participant
    const participant = new Participant({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      participantType,
      collegeOrg,
      contactNumber,
      interests: [],
      followedOrganizers: [],
    });

    await participant.save();

    const token = generateToken(participant);
    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        _id: participant._id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        role: 'Participant',
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email or loginEmail
    let user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { loginEmail: email.toLowerCase() }],
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // For Organizers, check if active
    if (user.role === 'Organizer' && !user.isActive) {
      return res.status(401).json({ error: 'Your account is inactive' });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    
    let userData = {
      _id: user._id,
      email: user.email || user.loginEmail,
      role: user.role,
    };

    if (user.role === 'Participant') {
      userData.firstName = user.firstName;
      userData.lastName = user.lastName;
    } else if (user.role === 'Organizer') {
      userData.name = user.name;
    }

    res.json({
      message: 'Login successful',
      token,
      user: userData,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { signup, login, getCurrentUser, changePassword };
