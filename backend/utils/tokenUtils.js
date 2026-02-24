const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email || user.loginEmail,
    role: user.role,
    name: user.name || `${user.firstName} ${user.lastName}`,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });
};

const generateSecurePassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;

  // Guarantee at least one of each category
  let password = '';
  const randomBytes = crypto.randomBytes(16);
  password += upper[randomBytes[0] % upper.length];
  password += lower[randomBytes[1] % lower.length];
  password += digits[randomBytes[2] % digits.length];
  password += special[randomBytes[3] % special.length];

  for (let i = 4; i < 14; i++) {
    password += all[randomBytes[i] % all.length];
  }

  // Shuffle using Fisher-Yates with crypto randomness
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
};

module.exports = { generateToken, generateSecurePassword };
