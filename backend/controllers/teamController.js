const Team = require('../models/Team');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { Participant } = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { generateQRCode } = require('../utils/qrGenerator');
const { sendRegistrationConfirmation } = require('../utils/emailService');

// Create a team (leader creates it)
const createTeam = async (req, res) => {
  const { eventId } = req.params;
  const { teamName } = req.body;

  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.teamRegistration) return res.status(400).json({ error: 'This event does not support team registration' });

  // Check if already in a team for this event
  const existingTeam = await Team.findOne({
    eventId,
    $or: [{ leaderId: req.user.userId }, { 'members.participantId': req.user.userId }],
    status: { $ne: 'Cancelled' }
  });
  if (existingTeam) return res.status(400).json({ error: 'You are already in a team for this event' });

  // Check deadline
  if (new Date() > event.registrationDeadline) {
    return res.status(400).json({ error: 'Registration deadline has passed' });
  }

  const inviteCode = uuidv4().split('-')[0].toUpperCase();

  const team = new Team({
    eventId,
    teamName,
    leaderId: req.user.userId,
    maxSize: event.teamSize,
    inviteCode,
    members: [],
  });

  await team.save();
  await team.populate('leaderId', 'firstName lastName email');
  res.status(201).json({ message: 'Team created', team });
};

// Get my team for an event
const getMyTeam = async (req, res) => {
  const { eventId } = req.params;

  const team = await Team.findOne({
    eventId,
    $or: [{ leaderId: req.user.userId }, { 'members.participantId': req.user.userId }],
    status: { $ne: 'Cancelled' }
  })
    .populate('leaderId', 'firstName lastName email')
    .populate('members.participantId', 'firstName lastName email');

  if (!team) return res.status(404).json({ error: 'No team found for this event' });
  res.json(team);
};

// Join a team via invite code
const joinTeam = async (req, res) => {
  const { inviteCode } = req.body;

  const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!team) return res.status(404).json({ error: 'Invalid invite code' });
  if (team.status !== 'Forming') return res.status(400).json({ error: 'Team is no longer accepting members' });

  const event = await Event.findById(team.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (new Date() > event.registrationDeadline) {
    return res.status(400).json({ error: 'Registration deadline has passed' });
  }

  // Check if already in team
  const alreadyMember = team.members.some(m => m.participantId.toString() === req.user.userId);
  if (team.leaderId.toString() === req.user.userId || alreadyMember) {
    return res.status(400).json({ error: 'You are already in this team' });
  }

  // Check if already in another team for this event
  const existingTeam = await Team.findOne({
    eventId: team.eventId,
    $or: [{ leaderId: req.user.userId }, { 'members.participantId': req.user.userId }],
    status: { $ne: 'Cancelled' }
  });
  if (existingTeam) return res.status(400).json({ error: 'You are already in a team for this event' });

  // Check team size
  const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1; // +1 for leader
  if (acceptedCount >= team.maxSize) {
    return res.status(400).json({ error: 'Team is full' });
  }

  team.members.push({ participantId: req.user.userId, status: 'Pending' });
  await team.save();

  await team.populate('leaderId', 'firstName lastName email');
  await team.populate('members.participantId', 'firstName lastName email');
  res.json({ message: 'Join request sent', team });
};

// Accept/reject member (leader action)
const respondToMember = async (req, res) => {
  const { teamId, memberId } = req.params;
  const { status: memberStatus, action } = req.body; // accept 'Accepted'/'Rejected' or legacy 'accept'/'reject'

  const team = await Team.findById(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.leaderId.toString() !== req.user.userId) {
    return res.status(403).json({ error: 'Only team leader can respond to members' });
  }

  // Find member by memberId (either the sub-document _id or participantId)
  const member = team.members.id(memberId) || team.members.find(m => m.participantId.toString() === memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const resolvedStatus = memberStatus || (action === 'accept' ? 'Accepted' : 'Rejected');

  // Re-check capacity before accepting
  if (resolvedStatus === 'Accepted') {
    const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1; // +1 for leader
    if (acceptedCount >= team.maxSize) {
      return res.status(400).json({ error: 'Team is already full' });
    }
    member.joinedAt = new Date();
  }

  member.status = resolvedStatus;

  await team.save();
  await team.populate('leaderId', 'firstName lastName email');
  await team.populate('members.participantId', 'firstName lastName email');
  res.json({ message: `Member ${resolvedStatus}`, team });
};

// Finalize team registration - create tickets for all (internal helper)
const doFinalizeTeam = async (team) => {
  const event = await Event.findById(team.eventId);
  const allParticipantIds = [team.leaderId, ...team.members.filter(m => m.status === 'Accepted').map(m => m.participantId)];

  for (const participantId of allParticipantIds) {
    const existing = await Registration.findOne({ eventId: team.eventId, participantId });
    if (existing) continue;

    const registration = new Registration({
      eventId: team.eventId,
      participantId,
      status: 'Registered',
      formResponses: { teamId: team._id.toString(), teamName: team.teamName },
    });
    await registration.save();

    const ticketId = uuidv4();
    const qrCode = await generateQRCode(ticketId);
    const participant = await Participant.findById(participantId);

    const ticket = new Ticket({
      ticketId,
      eventId: team.eventId,
      participantId,
      registrationId: registration._id,
      participantName: participant ? `${participant.firstName} ${participant.lastName}` : '',
      participantEmail: participant ? participant.email : '',
      eventName: event.name,
      eventDate: event.startDate,
      eventVenue: event.venue,
      qrCode,
      teamId: team._id,
    });
    await ticket.save();

    registration.ticketId = ticket._id;
    await registration.save();

    await Event.findByIdAndUpdate(team.eventId, { $inc: { totalRegistrations: 1 } });

    const regCount = await Registration.countDocuments({ eventId: team.eventId });
    if (regCount === 1) {
      await Event.findByIdAndUpdate(team.eventId, { formLocked: true });
    }

    if (participant && participant.email) {
      try { await sendRegistrationConfirmation(participant.email, event.name, ticketId, qrCode); } catch (emailErr) { console.error('Team registration email error:', emailErr); }
    }
  }

  const leaderReg = await Registration.findOne({ eventId: team.eventId, participantId: team.leaderId });
  if (leaderReg) {
    team.registrationId = leaderReg._id;
    await team.save();
  }
};

// Route handler: Finalize team registration (leader explicitly calls this)
const finalizeTeamRegistration = async (req, res) => {
  const { teamId } = req.params;
  const team = await Team.findById(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.leaderId.toString() !== req.user.userId) {
    return res.status(403).json({ error: 'Only team leader can finalize the team' });
  }
  if (team.status === 'Complete') return res.status(400).json({ error: 'Team already finalized' });

  const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1; // +1 for leader
  if (acceptedCount < team.maxSize) return res.status(400).json({ error: `Need ${team.maxSize - acceptedCount} more accepted member(s) to finalize` });

  team.status = 'Complete';
  await team.save();
  await doFinalizeTeam(team);

  await team.populate('leaderId', 'firstName lastName email');
  await team.populate('members.participantId', 'firstName lastName email');
  res.json({ message: 'Team registration finalized! All members will receive tickets.', team });
};

// Get team by ID (for team chat page)
const getTeamById = async (req, res) => {
  const { teamId } = req.params;
  const team = await Team.findById(teamId)
    .populate('leaderId', 'firstName lastName email')
    .populate('members.participantId', 'firstName lastName email');
  if (!team) return res.status(404).json({ error: 'Team not found' });

  // Verify requester is a member
  const isMember = team.leaderId._id.toString() === req.user.userId ||
    team.members.some(m => m.participantId._id?.toString() === req.user.userId && m.status === 'Accepted');
  if (!isMember) return res.status(403).json({ error: 'Not a team member' });

  res.json({ team });
};

// Leave a team
const leaveTeam = async (req, res) => {
  const { teamId } = req.params;

  const team = await Team.findById(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.status === 'Complete') return res.status(400).json({ error: 'Cannot leave a complete team' });

  if (team.leaderId.toString() === req.user.userId) {
    // Leader dissolves the team
    team.status = 'Cancelled';
  } else {
    team.members = team.members.filter(m => m.participantId.toString() !== req.user.userId);
  }

  await team.save();
  res.json({ message: 'Left team successfully' });
};

// Get all teams for an event (organizer view)
const getEventTeams = async (req, res) => {
  const { eventId } = req.params;

  const teams = await Team.find({ eventId })
    .populate('leaderId', 'firstName lastName email')
    .populate('members.participantId', 'firstName lastName email')
    .lean();

  res.json(teams);
};

module.exports = { createTeam, getMyTeam, joinTeam, respondToMember, leaveTeam, getEventTeams, finalizeTeamRegistration, getTeamById };
