const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const { Organizer } = require('../models/User');
const Fuse = require('fuse.js');

// Get all published events with search and filters
const getPublishedEvents = async (req, res) => {
  try {
    const { search, type, eligibility, startDate, endDate, followedOnly } = req.query;

    let query = { status: { $in: ['Published', 'Ongoing'] } };

    if (type) query.type = type;
    if (eligibility) query.eligibility = eligibility;

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    let events = await Event.find(query)
      .populate('organizerId', 'name category')
      .lean();

    // Filter by followed organizers if needed
    if (followedOnly && req.user) {
      const { Participant } = require('../models/User');
      const participant = await Participant.findById(req.user.userId).select('followedOrganizers');
      const followedIds = participant?.followedOrganizers || [];
      events = events.filter(e => followedIds.some(id => id.toString() === e.organizerId._id.toString()));
    }

    // Handle search
    if (search) {
      const fuse = new Fuse(events, {
        keys: ['name', 'organizerId.name'],
        threshold: 0.3,
      });
      events = fuse.search(search).map(result => result.item);
    }

    // Reorder: followed clubs first, then interest-matched
    if (req.user) {
      const { Participant } = require('../models/User');
      const participant = await Participant.findById(req.user.userId);
      const followedIds = participant?.followedOrganizers?.map(id => id.toString()) || [];
      const interests = participant?.interests || [];

      events.sort((a, b) => {
        const aFollowed = followedIds.includes(a.organizerId._id.toString());
        const bFollowed = followedIds.includes(b.organizerId._id.toString());
        if (aFollowed && !bFollowed) return -1;
        if (!aFollowed && bFollowed) return 1;
        // Secondary sort: interest tag match
        if (interests.length > 0) {
          const aTags = (a.tags || []).some(t => interests.includes(t)) ? 1 : 0;
          const bTags = (b.tags || []).some(t => interests.includes(t)) ? 1 : 0;
          if (aTags !== bTags) return bTags - aTags;
        }
        return 0;
      });
    }

    res.json(events);
  } catch (error) {
    console.error('Get published events error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get trending events (top 5 most-registered events in last 24 hours)
const getTrendingEvents = async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Aggregate registrations created in last 24h, grouped by event
    const trendingRegistrations = await Registration.aggregate([
      { $match: { createdAt: { $gte: last24h }, status: { $in: ['Registered', 'Successful', 'Pending Approval'] } } },
      { $group: { _id: '$eventId', recentRegistrations: { $sum: 1 } } },
      { $sort: { recentRegistrations: -1 } },
      { $limit: 5 },
    ]);

    const eventIds = trendingRegistrations.map(t => t._id);
    const events = await Event.find({ _id: { $in: eventIds }, status: { $in: ['Published', 'Ongoing'] } })
      .populate('organizerId', 'name category')
      .lean();

    // Merge registration counts and maintain order
    const regMap = {};
    trendingRegistrations.forEach(t => { regMap[t._id.toString()] = t.recentRegistrations; });
    
    const populated = events
      .map(e => ({ ...e, recentRegistrations: regMap[e._id.toString()] || 0 }))
      .sort((a, b) => b.recentRegistrations - a.recentRegistrations);

    // Fallback: if no registrations in last 24h, return top 5 by total registrations
    if (populated.length === 0) {
      const fallback = await Event.find({ status: { $in: ['Published', 'Ongoing'] } })
        .sort({ totalRegistrations: -1 })
        .limit(5)
        .populate('organizerId', 'name category')
        .lean();
      return res.json(fallback);
    }

    res.json(populated);
  } catch (error) {
    console.error('Get trending events error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get event detail (public view)
const getEventDetail = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('organizerId', 'name category description contactEmail')
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!['Published', 'Ongoing', 'Completed', 'Closed'].includes(event.status)) {
      return res.status(403).json({ error: 'Event not available' });
    }

    // Increment view count and push timestamp only for public events (after status check)
    await Event.findByIdAndUpdate(eventId, {
      $inc: { viewCount: 1 },
      $push: { viewTimestamps: { $each: [new Date()], $slice: -1000 } },
    });

    // Get participant count
    const participantCount = await Registration.countDocuments({
      eventId,
      status: { $in: ['Registered', 'Successful'] },
    });

    res.json({
      ...event,
      participantCount,
    });
  } catch (error) {
    console.error('Get event detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get organizer detail
const getOrganizerDetail = async (req, res) => {
  try {
    const { organizerId } = req.params;

    const organizer = await Organizer.findById(organizerId)
      .select('-password -loginEmail')
      .lean();

    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    // Get upcoming events
    const upcomingEvents = await Event.find({
      organizerId,
      status: 'Published',
      startDate: { $gte: new Date() },
    })
      .sort({ startDate: 1 })
      .lean();

    // Get past events
    const pastEvents = await Event.find({
      organizerId,
      status: { $in: ['Completed', 'Closed'] },
      endDate: { $lt: new Date() },
    })
      .sort({ endDate: -1 })
      .lean();

    res.json({
      organizer,
      upcomingEvents,
      pastEvents,
    });
  } catch (error) {
    console.error('Get organizer detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Mark attendance via QR code
const markAttendance = async (req, res) => {
  try {
    const { ticketId } = req.body;

    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify organizer ownership
    const event = await Event.findById(ticket.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized: not the event organizer' });
    }

    if (ticket.attendanceMarked) {
      return res.status(400).json({ error: 'Ticket already scanned' });
    }

    ticket.attendanceMarked = true;
    ticket.attendanceTimestamp = new Date();
    ticket.markedBy = req.user.userId;
    ticket.auditLog.push({
      action: 'Scanned',
      performedBy: req.user.userId,
    });

    await ticket.save();

    // Increment event attendance atomically
    await Event.findByIdAndUpdate(ticket.eventId, { $inc: { totalAttendance: 1 } });

    res.json({ message: 'Attendance marked', ticket });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Manual attendance marking with reason
const markAttendanceManual = async (req, res) => {
  try {
    const { ticketId, reason } = req.body;

    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify organizer ownership
    const event = await Event.findById(ticket.eventId);
    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    ticket.attendanceMarked = true;
    ticket.attendanceTimestamp = new Date();
    ticket.markedBy = req.user.userId;
    ticket.auditLog.push({
      action: 'Manually Marked',
      performedBy: req.user.userId,
      reason: reason || 'Manual marking by organizer',
    });

    await ticket.save();

    res.json({ message: 'Attendance marked manually', ticket });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get event attendance data
const getAttendanceData = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const tickets = await Ticket.find({ eventId })
      .populate('participantId', 'firstName lastName email')
      .lean();

    const scannedCount = tickets.filter(t => t.attendanceMarked).length;
    const unscannedTickets = tickets.filter(t => !t.attendanceMarked);

    res.json({
      totalTickets: tickets.length,
      scannedCount,
      unscannedCount: tickets.length - scannedCount,
      scannedPercentage: tickets.length > 0 ? ((scannedCount / tickets.length) * 100).toFixed(2) : '0.00',
      tickets: tickets.map(t => ({
        _id: t._id,
        ticketId: t.ticketId,
        participantId: t.participantId,
        participantName: t.participantId ? `${t.participantId.firstName} ${t.participantId.lastName}` : 'Unknown',
        participantEmail: t.participantId?.email,
        attended: t.attendanceMarked,
        scanned: t.attendanceMarked,
        checkedInAt: t.attendanceTimestamp,
        scannedAt: t.attendanceTimestamp,
      })),
    });
  } catch (error) {
    console.error('Get attendance data error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Export attendance CSV
const exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const tickets = await Ticket.find({ eventId })
      .populate('participantId', 'firstName lastName email')
      .lean();

    const json2csv = require('json2csv').Parser;
    const csvData = tickets.map(t => ({
      'Ticket ID': t.ticketId,
      'Participant Name': t.participantId ? `${t.participantId.firstName} ${t.participantId.lastName}` : 'Unknown',
      'Email': t.participantId?.email || 'N/A',
      'Scanned': t.attendanceMarked ? 'Yes' : 'No',
      'Scanned At': t.attendanceTimestamp ? new Date(t.attendanceTimestamp).toLocaleString() : 'N/A',
    }));

    const parser = new json2csv({
      fields: ['Ticket ID', 'Participant Name', 'Email', 'Scanned', 'Scanned At'],
    });
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${eventId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export attendance CSV error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPublishedEvents,
  getTrendingEvents,
  getEventDetail,
  getOrganizerDetail,
  markAttendance,
  markAttendanceManual,
  getAttendanceData,
  exportAttendanceCSV,
};
