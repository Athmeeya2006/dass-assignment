const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const ticketController = require('../controllers/ticketController');
const forumController = require('../controllers/forumController');
const { verifyToken, roleCheck, optionalAuth } = require('../middleware/authMiddleware');

// --- Static/specific routes MUST come before parameterized /:eventId ---

// Public event browsing (optionalAuth for personalized sorting)
router.get('/published', optionalAuth, eventController.getPublishedEvents);
router.get('/trending', eventController.getTrendingEvents);

// Organizer detail (must come before /:eventId)
router.get('/organizer/:organizerId', eventController.getOrganizerDetail);

// Ticket endpoints (must come before /:eventId)
router.get('/ticket/:ticketId/details', verifyToken, ticketController.getTicketDetails);
router.get('/ticket/:ticketId/calendar', verifyToken, ticketController.generateCalendarFile);
router.get('/ticket/:ticketId/google-calendar', verifyToken, ticketController.getGoogleCalendarUrl);
router.get('/ticket/:ticketId/outlook-calendar', verifyToken, ticketController.getOutlookCalendarUrl);

// QR Scanner & Attendance
router.post('/mark-attendance', verifyToken, roleCheck('Organizer'), eventController.markAttendance);
router.post('/mark-attendance-manual', verifyToken, roleCheck('Organizer'), eventController.markAttendanceManual);

// Forum static routes (must come before /:eventId)
router.put('/message/:messageId', verifyToken, forumController.editMessage);
router.delete('/message/:messageId', verifyToken, forumController.deleteMessage);
router.post('/message/:messageId/pin', verifyToken, forumController.togglePin);
router.post('/message/:messageId/react', verifyToken, forumController.addReaction);
router.delete('/message/:messageId/react', verifyToken, forumController.removeReaction);

// --- Parameterized /:eventId routes ---
router.get('/:eventId', eventController.getEventDetail);
router.get('/:eventId/attendance-data', verifyToken, roleCheck('Organizer'), eventController.getAttendanceData);
router.get('/:eventId/export-attendance', verifyToken, roleCheck('Organizer'), eventController.exportAttendanceCSV);
router.get('/:eventId/messages', verifyToken, forumController.getEventMessages);
router.post('/:eventId/messages', verifyToken, forumController.postMessage);

module.exports = router;
