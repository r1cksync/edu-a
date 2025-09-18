const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Mark attendance when joining a class
router.post('/classes/:classId/mark', attendanceController.markAttendance);

// Update attendance when leaving a class
router.put('/classes/:classId/leave', attendanceController.updateAttendanceOnLeave);

// Get student attendance statistics for a classroom
router.get('/classrooms/:classroomId/students/stats', attendanceController.getStudentAttendanceStats);

// Get all students' attendance statistics for a classroom (teacher only)
router.get('/classrooms/:classroomId/stats', attendanceController.getClassroomAttendanceStats);

// Get detailed attendance records for a classroom (teacher only)
router.get('/classrooms/:classroomId/records', attendanceController.getDetailedAttendanceRecords);

// Get student's attendance history
router.get('/classrooms/:classroomId/students/history', attendanceController.getStudentAttendanceHistory);

// Bulk mark attendance (teacher only)
router.post('/classes/:classId/bulk-mark', attendanceController.bulkMarkAttendance);

// Get attendance dashboard data
router.get('/classrooms/:classroomId/dashboard', attendanceController.getAttendanceDashboard);

// Sync absences for ended classes (utility endpoint)
router.post('/classrooms/:classroomId/sync-absences', attendanceController.syncAbsencesForEndedClasses);

module.exports = router;