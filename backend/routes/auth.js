const express = require('express');
const router = express.Router();
const { signup, login, getCurrentUser, changePassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', verifyToken, getCurrentUser);
router.post('/change-password', verifyToken, changePassword);

module.exports = router;
