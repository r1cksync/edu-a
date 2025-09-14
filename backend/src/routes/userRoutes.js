const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, requireTeacher } = require('../middleware/auth');

// User dashboard and profile routes
router.get('/dashboard', auth, userController.getDashboard);
router.get('/search', auth, requireTeacher, userController.searchUsers);
router.get('/submissions', auth, userController.getSubmissionHistory);
router.get('/grades', auth, userController.getGradesSummary);
router.post('/profile-picture', auth, userController.uploadProfilePicture);

module.exports = router;