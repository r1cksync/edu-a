const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { auth, requireTeacher, requireStudent } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Teacher routes
router.post('/classroom/:classroomId', auth, requireTeacher, validateRequest(schemas.createAssignment), assignmentController.createAssignment);
router.put('/:assignmentId', auth, requireTeacher, assignmentController.updateAssignment);
router.put('/:assignmentId/publish', auth, requireTeacher, assignmentController.publishAssignment);
router.delete('/:assignmentId', auth, requireTeacher, assignmentController.deleteAssignment);
router.get('/:assignmentId/submissions', auth, requireTeacher, assignmentController.getAssignmentSubmissions);
router.put('/submissions/:submissionId/grade', auth, requireTeacher, assignmentController.gradeSubmission);

// Student routes
router.post('/:assignmentId/submit', auth, requireStudent, assignmentController.submitAssignment);

// Common routes
router.get('/classroom/:classroomId', auth, assignmentController.getClassroomAssignments);
router.get('/:assignmentId', auth, assignmentController.getAssignment);

module.exports = router;