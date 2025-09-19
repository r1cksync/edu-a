const express = require('express');
const router = express.Router();
const { auth, requireTeacher, requireStudent } = require('../middleware/auth');
const {
  createDPP,
  getClassroomDPPs,
  getDPP,
  updateDPP,
  deleteDPP,
  togglePublishDPP,
  submitMCQAnswers,
  submitFiles,
  gradeSubmission,
  getDPPAnalytics,
  getSubmission,
  getMySubmission
} = require('../controllers/dppController');

// All routes require authentication
router.use(auth);

// Teacher-only routes
router.post('/', requireTeacher, createDPP);
router.put('/:dppId', requireTeacher, updateDPP);
router.delete('/:dppId', requireTeacher, deleteDPP);
router.patch('/:dppId/publish', requireTeacher, togglePublishDPP);
router.put('/:dppId/submissions/:submissionId/grade', requireTeacher, gradeSubmission);
router.get('/:dppId/analytics', requireTeacher, getDPPAnalytics);

// Submission viewing routes
router.get('/:dppId/submissions/:submissionId', auth, getSubmission);
router.get('/:dppId/my-submission', requireStudent, getMySubmission);

// Routes accessible by both teachers and students
router.get('/classroom/:classroomId', getClassroomDPPs);
router.get('/:dppId', getDPP);

// Student-only routes
router.post('/:dppId/submit/mcq', requireStudent, submitMCQAnswers);
router.post('/:dppId/submit/files', requireStudent, submitFiles);

module.exports = router;