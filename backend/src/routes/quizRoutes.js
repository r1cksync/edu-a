const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const quizSessionController = require('../controllers/quizSessionController');
const { auth } = require('../middleware/auth');

// Quiz Management Routes

// Create a new quiz
router.post('/classrooms/:classroomId/quizzes', auth, quizController.createQuiz);

// Get quizzes for a classroom
router.get('/classrooms/:classroomId/quizzes', auth, quizController.getClassroomQuizzes);

// Get active quizzes for a classroom
router.get('/classrooms/:classroomId/quizzes/active', auth, quizController.getActiveQuizzes);

// Get specific quiz details
router.get('/quizzes/:quizId', auth, quizController.getQuiz);

// Update quiz
router.put('/quizzes/:quizId', auth, quizController.updateQuiz);

// Delete quiz
router.delete('/quizzes/:quizId', auth, quizController.deleteQuiz);

// Quiz Session Routes

// Start a new quiz session
router.post('/quizzes/:quizId/sessions', auth, quizSessionController.startQuizSession);

// Get current active session
router.get('/quizzes/:quizId/sessions/current', auth, quizSessionController.getCurrentSession);

// Submit answer for a question
router.post('/sessions/:sessionId/answers', auth, quizSessionController.submitAnswer);

// Save multiple answers (bulk save)
router.put('/sessions/:sessionId/answers', auth, quizSessionController.saveQuizAnswers);

// Submit entire quiz session
router.post('/sessions/:sessionId/submit', auth, quizSessionController.submitQuizSession);

// Update proctoring data
router.put('/sessions/:sessionId/proctoring', auth, quizSessionController.updateProctoringData);

// Report violation
router.post('/sessions/:sessionId/violations', auth, quizSessionController.reportViolation);

// Get session results (for students)
router.get('/sessions/:sessionId/results', auth, quizSessionController.getQuizResults);

// Get student's quiz sessions for a classroom
router.get('/classrooms/:classroomId/sessions/student', auth, quizSessionController.getStudentSessions);

// Get session details for students
router.get('/sessions/:sessionId/student-details', auth, quizSessionController.getStudentSessionDetails);

// Review and Monitoring Routes (for teachers)

// Get sessions for review
router.get('/classrooms/:classroomId/sessions/review', auth, quizSessionController.getSessionsForReview);

// Review a specific session
router.post('/sessions/:sessionId/review', auth, quizSessionController.reviewSession);

// Get detailed session data
router.get('/sessions/:sessionId/details', auth, quizSessionController.getSessionDetails);

module.exports = router;