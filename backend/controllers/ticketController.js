const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const ical = require('ical-generator');

// Get ticket details for modal
const getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOne({ ticketId })
      .populate('eventId')
      .populate('participantId', 'firstName lastName email')
      .lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify ownership - ticket owner or event organizer can view
    const isOwner = ticket.participantId._id.toString() === req.user.userId;
    const isOrganizer = ticket.eventId?.organizerId?.toString() === req.user.userId;
    if (!isOwner && !isOrganizer && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized to view this ticket' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get event start/end dates from ticket or populated event
const getEventDates = (ticket) => {
  const rawStart = ticket.eventId?.startDate || ticket.eventDate;
  const startDate = rawStart ? new Date(rawStart) : new Date();
  // If date is invalid, fall back to now
  if (isNaN(startDate.getTime())) {
    const now = new Date();
    return { startDate: now, endDate: new Date(now.getTime() + 2 * 60 * 60 * 1000) };
  }
  const endDate = ticket.eventId?.endDate
    ? new Date(ticket.eventId.endDate)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  return { startDate, endDate };
};

// Generate .ics calendar file
const generateCalendarFile = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOne({ ticketId })
      .populate('eventId')
      .lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { startDate, endDate } = getEventDates(ticket);

    const cal = ical({
      name: 'Felicity Event',
      description: 'Event Calendar',
    });

    cal.createEvent({
      start: startDate,
      end: endDate,
      summary: ticket.eventName || ticket.eventId?.name || 'Event',
      description: `Ticket ID: ${ticket.ticketId}\nVenue: ${ticket.eventVenue || ticket.eventId?.venue || 'TBA'}`,
      location: ticket.eventVenue || ticket.eventId?.venue || '',
      organizer: { name: 'Felicity Event Management' },
    });

    const eventName = ticket.eventName || ticket.eventId?.name || 'Event';
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${eventName}.ics"`);
    res.send(cal.toString());
  } catch (error) {
    console.error('Generate calendar file error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get Google Calendar URL
const getGoogleCalendarUrl = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOne({ ticketId })
      .populate('eventId')
      .lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { startDate, endDate } = getEventDates(ticket);
    const eventName = ticket.eventName || ticket.eventId?.name || 'Event';
    const eventVenue = ticket.eventVenue || ticket.eventId?.venue || '';

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      eventName
    )}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0]}Z&details=${encodeURIComponent(
      `Ticket ID: ${ticket.ticketId}\nVenue: ${eventVenue || 'TBA'}`
    )}&location=${encodeURIComponent(eventVenue)}`;

    res.json({ url: googleUrl });
  } catch (error) {
    console.error('Get Google Calendar URL error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get Outlook Calendar URL
const getOutlookCalendarUrl = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOne({ ticketId })
      .populate('eventId')
      .lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { startDate, endDate } = getEventDates(ticket);
    const eventName = ticket.eventName || ticket.eventId?.name || 'Event';
    const eventVenue = ticket.eventVenue || ticket.eventId?.venue || '';

    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
      eventName
    )}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&location=${encodeURIComponent(
      eventVenue
    )}&body=${encodeURIComponent(`Ticket ID: ${ticket.ticketId}`)}`;

    res.json({ url: outlookUrl });
  } catch (error) {
    console.error('Get Outlook Calendar URL error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getTicketDetails,
  generateCalendarFile,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
};
