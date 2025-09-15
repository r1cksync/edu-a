const express = require('express');
const router = express.Router();
const videoClassController = require('../controllers/videoClassController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Schedule a new video class
router.post('/schedule', videoClassController.scheduleClass);

// Start an instant class
router.post('/instant', videoClassController.startInstantClass);

// Start a scheduled class
router.put('/:classId/start', videoClassController.startClass);

// End a class
router.put('/:classId/end', videoClassController.endClass);

// Join a class (for students)
router.post('/:classId/join', videoClassController.joinClass);

// Leave a class (for students)
router.put('/:classId/leave', videoClassController.leaveClass);

// Get all classes for a classroom
router.get('/classroom/:classroomId', videoClassController.getClassroomClasses);

// Get upcoming classes for a classroom
router.get('/classroom/:classroomId/upcoming', videoClassController.getUpcomingClasses);

// Get live classes for a classroom
router.get('/classroom/:classroomId/live', videoClassController.getLiveClasses);

// Get class details
router.get('/:classId', videoClassController.getClass);

// Update class (for teachers)
router.put('/:classId', videoClassController.updateClass);

// Delete/Cancel class (for teachers)
router.delete('/:classId', videoClassController.deleteClass);

module.exports = router;