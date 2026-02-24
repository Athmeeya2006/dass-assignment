const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { verifyToken, roleCheck } = require('../middleware/authMiddleware');

// Participant routes
router.post('/:eventId/create', verifyToken, roleCheck('Participant'), teamController.createTeam);
router.get('/:eventId/my-team', verifyToken, roleCheck('Participant'), teamController.getMyTeam);
router.post('/join', verifyToken, roleCheck('Participant'), teamController.joinTeam);
router.get('/by-id/:teamId', verifyToken, teamController.getTeamById);
router.post('/:teamId/respond/:memberId', verifyToken, roleCheck('Participant'), teamController.respondToMember);
router.post('/:teamId/leave', verifyToken, roleCheck('Participant'), teamController.leaveTeam);
router.post('/:teamId/finalize', verifyToken, roleCheck('Participant'), teamController.finalizeTeamRegistration);

// Organizer route
router.get('/event/:eventId/teams', verifyToken, roleCheck('Organizer'), teamController.getEventTeams);

module.exports = router;
