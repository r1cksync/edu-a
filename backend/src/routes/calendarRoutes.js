const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getCalendarEvents,
  getUpcomingEvents,
  getEventsForDate
} = require('../controllers/calendarController');

// All calendar routes require authentication
router.use(auth);

// Get all calendar events with optional date range and classroom filter
// Query params: startDate, endDate, classroomId
router.get('/events', getCalendarEvents);

// Get upcoming events (next 7 days)
// Query params: limit (default: 10)
router.get('/upcoming', getUpcomingEvents);

// Get events for a specific date
router.get('/date/:date', getEventsForDate);

module.exports = router;