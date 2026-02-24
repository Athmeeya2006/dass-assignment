const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, roleCheck } = require('../middleware/authMiddleware');

router.get('/dashboard-stats', verifyToken, roleCheck('Admin'), adminController.getDashboardStats);

router.post('/create-organizer', verifyToken, roleCheck('Admin'), adminController.createOrganizer);
router.get('/organizers', verifyToken, roleCheck('Admin'), adminController.getAllOrganizers);
router.patch('/toggle-organizer/:organizerId', verifyToken, roleCheck('Admin'), adminController.toggleOrganizerStatus);
router.delete('/delete-organizer/:organizerId', verifyToken, roleCheck('Admin'), adminController.deleteOrganizer);

router.get('/password-reset-requests', verifyToken, roleCheck('Admin'), adminController.getPasswordResetRequests);
router.post('/approve-password-reset/:requestId', verifyToken, roleCheck('Admin'), adminController.approvePasswordReset);
router.post('/reject-password-reset/:requestId', verifyToken, roleCheck('Admin'), adminController.rejectPasswordReset);

module.exports = router;
