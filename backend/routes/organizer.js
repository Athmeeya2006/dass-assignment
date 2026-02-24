const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizerController');
const { verifyToken, roleCheck } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, roleCheck('Organizer'), organizerController.getProfile);
router.put('/profile', verifyToken, roleCheck('Organizer'), organizerController.updateProfile);

router.post('/create-event', verifyToken, roleCheck('Organizer'), organizerController.createEvent);
router.get('/events', verifyToken, roleCheck('Organizer'), organizerController.getOrganizerEvents);
router.get('/event/:eventId', verifyToken, roleCheck('Organizer'), organizerController.getEventDetail);
router.put('/event/:eventId', verifyToken, roleCheck('Organizer'), organizerController.updateEvent);
router.post('/publish-event/:eventId', verifyToken, roleCheck('Organizer'), organizerController.publishEvent);

router.get('/pending-merchandise-approvals', verifyToken, roleCheck('Organizer'), organizerController.getPendingMerchandiseApprovals);
router.post('/approve-merchandise/:registrationId', verifyToken, roleCheck('Organizer'), organizerController.approveMerchandisePurchase);
router.post('/reject-merchandise/:registrationId', verifyToken, roleCheck('Organizer'), organizerController.rejectMerchandisePurchase);

router.get('/export-participants/:eventId', verifyToken, roleCheck('Organizer'), organizerController.exportParticipantsCSV);

module.exports = router;
