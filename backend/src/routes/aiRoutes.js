const express = require('express');
const router = express.Router();
const { auth, requireTeacher } = require('../middleware/auth');
const {
  generateMCQQuestions,
  generateMCQQuestionsFromPDF,
  previewQuestions,
  testGroqConnection,
  upload
} = require('../controllers/aiController');

// All AI routes require authentication and teacher role
router.use(auth);
router.use(requireTeacher);

// Test Groq API connection
router.get('/test', testGroqConnection);

// Generate MCQ questions using AI
router.post('/generate/mcq', generateMCQQuestions);

// Generate MCQ questions from PDF upload
router.post('/generate/mcq/pdf', upload.single('pdf'), generateMCQQuestionsFromPDF);

// Preview questions (for future enhancements)
router.post('/preview', previewQuestions);

module.exports = router;