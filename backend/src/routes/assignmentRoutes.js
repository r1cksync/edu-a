const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { auth, optionalAuth, requireTeacher, requireStudent } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { assignmentUpload, teacherAttachmentUpload } = require('../services/s3Service');

// Global routes
router.get('/', auth, assignmentController.getAllAssignments);

// Teacher routes
router.post('/classroom/:classroomId', auth, requireTeacher, validateRequest(schemas.createAssignment), assignmentController.createAssignment);
router.post('/:assignmentId/attachments', auth, requireTeacher, teacherAttachmentUpload.array('attachments', 5), assignmentController.addAssignmentAttachments);
router.put('/:assignmentId', auth, requireTeacher, assignmentController.updateAssignment);
router.put('/:assignmentId/publish', auth, requireTeacher, assignmentController.publishAssignment);
router.delete('/:assignmentId', auth, requireTeacher, assignmentController.deleteAssignment);
router.get('/:assignmentId/submissions', auth, requireTeacher, assignmentController.getAssignmentSubmissions);
router.put('/submissions/:submissionId/grade', auth, requireTeacher, assignmentController.gradeSubmission);

// Student routes
router.post('/:assignmentId/submit', auth, requireStudent, assignmentController.submitAssignment);
router.post('/:assignmentId/submit-mcq', auth, requireStudent, assignmentController.submitMCQAssignment);
router.post('/:assignmentId/submit-files', auth, requireStudent, assignmentUpload.array('files', 10), assignmentController.submitFileAssignment);

// Common routes
router.get('/classroom/:classroomId', auth, assignmentController.getClassroomAssignments);
router.get('/:assignmentId', auth, assignmentController.getAssignment);
router.get('/:assignmentId/attachments/:attachmentId/download', optionalAuth, assignmentController.downloadAttachment);

module.exports = router;