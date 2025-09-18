const express = require('express');
const router = express.Router();
const { auth: authMiddleware, requireTeacher } = require('../middleware/auth');
const {
  analyzeStudentEngagement,
  getClassEngagementHistory,
  getStudentEngagementHistory,
  getClassStudents,
  checkEngagementApiHealth
} = require('../controllers/engagementController');

// Health check (no auth required)
router.get('/health', checkEngagementApiHealth);

// All other routes require teacher authentication
router.use(authMiddleware);
router.use(requireTeacher);

// Analyze student engagement (upload image + select student)
router.post('/analyze', analyzeStudentEngagement);

// Get engagement history for a class
router.get('/class/:classId/history', getClassEngagementHistory);

// Get engagement history for a specific student
router.get('/student/:studentId/history', getStudentEngagementHistory);

// Get students enrolled in a class (for dropdown)
router.get('/class/:classId/students', getClassStudents);

// Check engagement API health
router.get('/api/health', checkEngagementApiHealth);

module.exports = router;