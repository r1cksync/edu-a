const express = require('express');
const router = express.Router();
const { auth, requireStudent } = require('../middleware/auth');
const {
  getAvailableDPPs,
  startRefresherSession,
  submitBatchAnswers,
  generateMoreQuestions,
  concludeSession,
  getActiveSession,
  getSessionHistory
} = require('../controllers/refresherController');

// All refresher routes require authentication and student access
router.use(auth);

// Get available DPPs for refresher (student can select which DPP/quiz to use for practice)
router.get('/classroom/:classroomId/available-dpps', requireStudent, getAvailableDPPs);

// Get student's refresher session history for a classroom
router.get('/classroom/:classroomId/history', requireStudent, getSessionHistory);

// Start a new refresher session based on selected DPP submission
router.post('/classroom/:classroomId/start', requireStudent, startRefresherSession);

// Get details of active refresher session
router.get('/session/:sessionId', requireStudent, getActiveSession);

// Submit answers for current batch in refresher session
router.post('/session/:sessionId/submit-batch', requireStudent, submitBatchAnswers);

// Generate more questions based on current batch mistakes (dynamic follow-up)
router.post('/session/:sessionId/generate-more', requireStudent, generateMoreQuestions);

// Conclude refresher session and get final results
router.post('/session/:sessionId/conclude', requireStudent, concludeSession);

module.exports = router;