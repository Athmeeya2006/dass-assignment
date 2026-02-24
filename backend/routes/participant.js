const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const { verifyToken, roleCheck } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/profile', verifyToken, roleCheck('Participant'), participantController.getProfile);
router.put('/profile', verifyToken, roleCheck('Participant'), participantController.updateProfile);
router.post('/onboarding', verifyToken, roleCheck('Participant'), participantController.saveOnboarding);

router.get('/upcoming-events', verifyToken, roleCheck('Participant'), participantController.getUpcomingEvents);
router.get('/registration-history', verifyToken, roleCheck('Participant'), participantController.getRegistrationHistory);
router.get('/ticket/:ticketId', verifyToken, roleCheck('Participant'), participantController.getTicket);

router.post('/register/:eventId', verifyToken, roleCheck('Participant'), upload.any(), participantController.registerForEvent);
router.post('/follow-organizer/:organizerId', verifyToken, roleCheck('Participant'), participantController.followOrganizer);
router.post('/unfollow-organizer/:organizerId', verifyToken, roleCheck('Participant'), participantController.unfollowOrganizer);

router.post('/purchase-merchandise/:eventId', verifyToken, roleCheck('Participant'), participantController.purchaseMerchandise);
router.post('/upload-payment-proof/:registrationId', verifyToken, roleCheck('Participant'), upload.single('paymentProof'), participantController.uploadPaymentProof);

module.exports = router;
