const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const { auth, requireTeacher, requireStudent } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Teacher routes
router.post('/', auth, requireTeacher, validateRequest(schemas.createClassroom), classroomController.createClassroom);
router.put('/:classroomId', auth, requireTeacher, classroomController.updateClassroom);
router.delete('/:classroomId/students/:studentId', auth, requireTeacher, classroomController.removeStudent);
router.put('/:classroomId/archive', auth, requireTeacher, classroomController.archiveClassroom);
router.put('/:classroomId/students/:studentId/level', auth, requireTeacher, classroomController.updateStudentLevel);

// Student routes
router.post('/join', auth, requireStudent, validateRequest(schemas.joinClassroom), classroomController.joinClassroom);
router.delete('/:classroomId/leave', auth, requireStudent, classroomController.leaveClassroom);

// Common routes (both teachers and students)
router.get('/', auth, classroomController.getClassrooms);
router.get('/:classroomId', auth, classroomController.getClassroom);
router.get('/:classroomId/students', auth, classroomController.getClassroomStudents);

module.exports = router;