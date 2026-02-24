const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { verifyToken, roleCheck } = require('../middleware/authMiddleware');

// Participant: submit and check own feedback
router.post('/:eventId', verifyToken, roleCheck('Participant'), feedbackController.submitFeedback);
router.get('/:eventId/my-feedback', verifyToken, roleCheck('Participant'), feedbackController.getMyFeedback);

// Organizer: view feedback summary for their event
router.get('/:eventId/summary', verifyToken, roleCheck('Organizer'), feedbackController.getFeedbackSummary);

module.exports = router;
