const ForumMessage = require('../models/ForumMessage');
const { Participant, Organizer } = require('../models/User');

// Get all messages for an event
const getEventMessages = async (req, res) => {
  try {
    const { eventId } = req.params;

    const messages = await ForumMessage.find({ 
      eventId,
      deletedAt: null 
    })
      .populate('authorId', '-password')
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  } catch (error) {
    console.error('Get event messages error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Post new message
const postMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content, replyTo } = req.body;

    // Check if user is registered for event (if participant) - only active registrations
    if (req.user.role === 'Participant') {
      const Registration = require('../models/Registration');
      const registration = await Registration.findOne({
        eventId,
        participantId: req.user.userId,
        status: { $in: ['Registered', 'Successful'] }
      });

      if (!registration) {
        return res.status(403).json({ error: 'Only registered participants can post' });
      }
    }

    const user = req.user.role === 'Participant' 
      ? await Participant.findById(req.user.userId)
      : await Organizer.findById(req.user.userId);

    const message = new ForumMessage({
      eventId,
      authorId: req.user.userId,
      authorName: user.firstName ? `${user.firstName} ${user.lastName}` : user.name,
      authorRole: req.user.role,
      content,
      replyTo: replyTo || null,
    });

    await message.save();
    await message.populate('authorId', '-password');

    res.status(201).json(message);
  } catch (error) {
    console.error('Post message error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Edit message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.authorId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Can only edit own messages' });
    }

    message.content = content;
    message.updatedAt = new Date();
    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete message (organizer only or own message)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is author or organizer
    const Event = require('../models/Event');
    const event = await Event.findById(message.eventId);

    const isAuthor = message.authorId.toString() === req.user.userId;
    const isOrganizer = event.organizerId.toString() === req.user.userId;

    if (!isAuthor && !isOrganizer) {
      return res.status(403).json({ error: 'Cannot delete this message' });
    }

    message.deletedAt = new Date();
    message.deletedBy = req.user.userId;
    await message.save();

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Pin/unpin message (organizer only)
const togglePin = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if organizer
    const Event = require('../models/Event');
    const event = await Event.findById(message.eventId);

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only organizer can pin messages' });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    res.json({ message: `Message ${message.isPinned ? 'pinned' : 'unpinned'}` });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add reaction
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.reactions) {
      message.reactions = new Map();
    }

    if (!message.reactions.has(emoji)) {
      message.reactions.set(emoji, []);
    }

    const reactions = message.reactions.get(emoji);
    if (!reactions.includes(req.user.userId)) {
      reactions.push(req.user.userId);
      message.reactions.set(emoji, reactions);
      await message.save();
    }

    res.json(message);
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Remove reaction
const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.reactions && message.reactions.has(emoji)) {
      const reactions = message.reactions.get(emoji);
      message.reactions.set(
        emoji,
        reactions.filter(id => id.toString() !== req.user.userId)
      );
      
      if (message.reactions.get(emoji).length === 0) {
        message.reactions.delete(emoji);
      }
      
      await message.save();
    }

    res.json(message);
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getEventMessages,
  postMessage,
  editMessage,
  deleteMessage,
  togglePin,
  addReaction,
  removeReaction,
};
