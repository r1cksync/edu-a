const express = require('express');
const router = express.Router();
const {
  createScreeningTest,
  getScreeningTests,
  getScreeningTest,
  startScreeningTest,
  getAttempt,
  saveAttempt,
  recordNavigation,
  getAttemptResult,
  submitAnswer,
  submitScreeningTest,
  getStudentHistory,
  getAttemptAnalytics
} = require('../controllers/screeningTestController');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body, param } = require('express-validator');

// Validation rules
const createScreeningTestValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('classroom')
    .notEmpty()
    .withMessage('Classroom is required')
    .isMongoId()
    .withMessage('Invalid classroom ID'),
  body('totalTimeLimit')
    .isInt({ min: 1, max: 300 })
    .withMessage('Total time limit must be between 1 and 300 minutes'),
  body('questionCriteria.distribution')
    .optional()
    .isObject()
    .withMessage('Question distribution must be an object'),
  body('questionCriteria.pointsPerQuestion')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Points per question must be between 1 and 10'),
  body('questionCriteria.timePerQuestion')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Time per question must be between 30 and 300 seconds'),
  body('selectedQuestions')
    .optional()
    .isArray()
    .withMessage('Selected questions must be an array'),
  body('selectedQuestions.*')
    .optional()
    .isMongoId()
    .withMessage('Each selected question must be a valid MongoDB ID')
];

const submitAnswerValidation = [
  param('attemptId')
    .isMongoId()
    .withMessage('Invalid attempt ID'),
  body('questionId')
    .isMongoId()
    .withMessage('Invalid question ID'),
  body('selectedAnswer')
    .optional()
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Selected answer must be A, B, C, or D'),
  body('timeSpent')
    .isInt({ min: 0 })
    .withMessage('Time spent must be a non-negative number')
];

// Routes

// Create a new screening test (teachers only)
router.post(
  '/',
  auth,
  requireRole('teacher'),
  createScreeningTestValidation,
  validate,
  createScreeningTest
);

// Get all screening tests for a classroom
router.get(
  '/classroom/:classroomId',
  auth,
  param('classroomId').isMongoId().withMessage('Invalid classroom ID'),
  validate,
  getScreeningTests
);

// Get specific screening test details
router.get(
  '/:testId',
  auth,
  param('testId').isMongoId().withMessage('Invalid test ID'),
  validate,
  getScreeningTest
);

// Start a new screening test attempt (students only)
router.post(
  '/:testId/start',
  auth,
  requireRole('student'),
  param('testId').isMongoId().withMessage('Invalid test ID'),
  validate,
  startScreeningTest
);

// Get attempt data for test interface (students only)
router.get(
  '/attempt/:attemptId',
  auth,
  requireRole('student'),
  param('attemptId').isMongoId().withMessage('Invalid attempt ID'),
  validate,
  getAttempt
);

// Save attempt progress (auto-save)
router.post(
  '/attempt/:attemptId/save',
  auth,
  requireRole('student'),
  param('attemptId').isMongoId().withMessage('Invalid attempt ID'),
  validate,
  saveAttempt
);

// Record navigation pattern
router.post(
  '/attempt/:attemptId/navigation',
  auth,
  requireRole('student'),
  param('attemptId').isMongoId().withMessage('Invalid attempt ID'),
  validate,
  recordNavigation
);

// Get attempt result data
router.get(
  '/attempt/:attemptId/result',
  auth,
  requireRole('student'),
  param('attemptId').isMongoId().withMessage('Invalid attempt ID'),
  validate,
  getAttemptResult
);

// Submit answer for a question during attempt
router.post(
  '/attempt/:attemptId/answer',
  auth,
  requireRole('student'),
  submitAnswerValidation,
  validate,
  submitAnswer
);

// Submit entire screening test
router.post(
  '/attempt/:attemptId/submit',
  auth,
  requireRole('student'),
  param('attemptId').isMongoId().withMessage('Invalid attempt ID'),
  validate,
  submitScreeningTest
);

// Get student's screening test history
router.get(
  '/student/:studentId/history',
  auth,
  param('studentId').isMongoId().withMessage('Invalid student ID'),
  validate,
  getStudentHistory
);

// Get detailed analytics for a specific attempt
router.get(
  '/attempt/:attemptId/analytics',
  auth,
  param('attemptId').isMongoId().withMessage('Invalid attempt ID'),
  validate,
  getAttemptAnalytics
);

// Additional routes for teachers

// Get comprehensive analytics for a screening test (teachers only)
router.get(
  '/:testId/analytics',
  auth,
  requireRole('teacher'),
  param('testId').isMongoId().withMessage('Invalid test ID'),
  validate,
  async (req, res) => {
    try {
      const { testId } = req.params;
      const ScreeningTest = require('../models/ScreeningTest');
      const ScreeningTestAttempt = require('../models/ScreeningTestAttempt');
      
      // Verify ownership
      const test = await ScreeningTest.findById(testId);
      if (!test || test.teacher.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get all attempts with detailed data
      const attempts = await ScreeningTestAttempt.find({
        screeningTest: testId,
        isCompleted: true
      })
      .populate('student', 'name email')
      .populate('questionAttempts.question', 'category difficulty')
      .sort({ createdAt: -1 });

      // Calculate comprehensive analytics
      const analytics = await calculateComprehensiveAnalytics(attempts, testId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get comprehensive analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }
);

// Get leaderboard for a screening test
router.get(
  '/:testId/leaderboard',
  auth,
  param('testId').isMongoId().withMessage('Invalid test ID'),
  validate,
  async (req, res) => {
    try {
      const { testId } = req.params;
      const { limit = 50 } = req.query;
      
      const ScreeningTest = require('../models/ScreeningTest');
      const ScreeningTestAttempt = require('../models/ScreeningTestAttempt');
      const Classroom = require('../models/Classroom');
      
      // Check access permissions
      const test = await ScreeningTest.findById(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      const classroom = await Classroom.findById(test.classroom);
      const isTeacher = classroom.teacher.toString() === req.user.id;
      const isStudent = classroom.students.some(s => s.student.toString() === req.user.id);

      if (!isTeacher && !isStudent) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get best attempt for each student
      const pipeline = [
        {
          $match: {
            screeningTest: test._id,
            isCompleted: true
          }
        },
        {
          $sort: { student: 1, percentage: -1, totalTimeSpent: 1 }
        },
        {
          $group: {
            _id: '$student',
            bestAttempt: { $first: '$$ROOT' }
          }
        },
        {
          $replaceRoot: { newRoot: '$bestAttempt' }
        },
        {
          $sort: { percentage: -1, totalTimeSpent: 1 }
        },
        {
          $limit: parseInt(limit)
        }
      ];

      const topAttempts = await ScreeningTestAttempt.aggregate(pipeline);
      
      // Populate student details
      await ScreeningTestAttempt.populate(topAttempts, {
        path: 'student',
        select: 'name email'
      });

      // Add rankings
      const leaderboard = topAttempts.map((attempt, index) => ({
        rank: index + 1,
        student: attempt.student,
        score: attempt.score,
        percentage: attempt.percentage,
        totalTimeSpent: attempt.totalTimeSpent,
        attemptNumber: attempt.attemptNumber,
        createdAt: attempt.createdAt
      }));

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard',
        error: error.message
      });
    }
  }
);

// Update screening test (teachers only)
router.put(
  '/:testId',
  auth,
  requireRole('teacher'),
  param('testId').isMongoId().withMessage('Invalid test ID'),
  validate,
  async (req, res) => {
    try {
      const { testId } = req.params;
      const updates = req.body;
      
      const ScreeningTest = require('../models/ScreeningTest');
      
      const test = await ScreeningTest.findById(testId);
      if (!test || test.teacher.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Don't allow updates if there are completed attempts
      const ScreeningTestAttempt = require('../models/ScreeningTestAttempt');
      const attemptCount = await ScreeningTestAttempt.countDocuments({
        screeningTest: testId,
        isCompleted: true
      });

      if (attemptCount > 0 && (updates.questions || updates.totalTimeLimit || updates.totalPoints)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify test structure after students have completed attempts'
        });
      }

      const updatedTest = await ScreeningTest.findByIdAndUpdate(
        testId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate([
        { path: 'teacher', select: 'name email' },
        { path: 'classroom', select: 'name' }
      ]);

      res.json({
        success: true,
        message: 'Screening test updated successfully',
        data: updatedTest
      });
    } catch (error) {
      console.error('Update screening test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update screening test',
        error: error.message
      });
    }
  }
);

// Delete screening test (teachers only)
router.delete(
  '/:testId',
  auth,
  requireRole('teacher'),
  param('testId').isMongoId().withMessage('Invalid test ID'),
  validate,
  async (req, res) => {
    try {
      const { testId } = req.params;
      
      const ScreeningTest = require('../models/ScreeningTest');
      const ScreeningTestAttempt = require('../models/ScreeningTestAttempt');
      
      const test = await ScreeningTest.findById(testId);
      if (!test || test.teacher.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Check if there are any attempts
      const attemptCount = await ScreeningTestAttempt.countDocuments({
        screeningTest: testId
      });

      if (attemptCount > 0) {
        // Soft delete - just mark as inactive
        await ScreeningTest.findByIdAndUpdate(testId, { isActive: false });
        
        res.json({
          success: true,
          message: 'Screening test deactivated successfully (attempts preserved)'
        });
      } else {
        // Hard delete if no attempts exist
        await ScreeningTest.findByIdAndDelete(testId);
        
        res.json({
          success: true,
          message: 'Screening test deleted successfully'
        });
      }
    } catch (error) {
      console.error('Delete screening test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete screening test',
        error: error.message
      });
    }
  }
);

// Helper function for comprehensive analytics
const calculateComprehensiveAnalytics = async (attempts, testId) => {
  if (attempts.length === 0) {
    return {
      summary: {
        totalAttempts: 0,
        uniqueStudents: 0,
        averageScore: 0,
        completionRate: 0
      }
    };
  }

  // Summary statistics
  const summary = {
    totalAttempts: attempts.length,
    uniqueStudents: [...new Set(attempts.map(a => a.student._id.toString()))].length,
    averageScore: attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length,
    averageTimeSpent: attempts.reduce((sum, a) => sum + a.totalTimeSpent, 0) / attempts.length,
    completionRate: 100, // All attempts in this query are completed
    highestScore: Math.max(...attempts.map(a => a.percentage)),
    lowestScore: Math.min(...attempts.map(a => a.percentage))
  };

  // Performance distribution
  const performanceDistribution = {
    excellent: { count: 0, percentage: 0 }, // 90-100%
    good: { count: 0, percentage: 0 },      // 70-89%
    average: { count: 0, percentage: 0 },   // 50-69%
    poor: { count: 0, percentage: 0 }       // 0-49%
  };

  attempts.forEach(attempt => {
    if (attempt.percentage >= 90) performanceDistribution.excellent.count++;
    else if (attempt.percentage >= 70) performanceDistribution.good.count++;
    else if (attempt.percentage >= 50) performanceDistribution.average.count++;
    else performanceDistribution.poor.count++;
  });

  Object.keys(performanceDistribution).forEach(key => {
    performanceDistribution[key].percentage = 
      (performanceDistribution[key].count / attempts.length) * 100;
  });

  // Question-level analysis
  const questionAnalysis = {};
  const ScreeningTest = require('../models/ScreeningTest');
  const test = await ScreeningTest.findById(testId).populate('questions.question');
  
  test.questions.forEach(q => {
    questionAnalysis[q.question._id] = {
      question: q.question.question,
      category: q.question.category,
      difficulty: q.question.difficulty,
      correctAnswers: 0,
      totalAttempts: 0,
      averageTime: 0,
      accuracy: 0
    };
  });

  attempts.forEach(attempt => {
    attempt.questionAttempts.forEach(qa => {
      const qId = qa.question._id.toString();
      if (questionAnalysis[qId]) {
        questionAnalysis[qId].totalAttempts++;
        questionAnalysis[qId].averageTime += qa.timeSpent;
        if (qa.isCorrect) {
          questionAnalysis[qId].correctAnswers++;
        }
      }
    });
  });

  // Calculate final question statistics
  Object.keys(questionAnalysis).forEach(qId => {
    const qa = questionAnalysis[qId];
    if (qa.totalAttempts > 0) {
      qa.accuracy = (qa.correctAnswers / qa.totalAttempts) * 100;
      qa.averageTime = qa.averageTime / qa.totalAttempts;
    }
  });

  // Time-based analytics
  const timeAnalytics = {
    averageTimePerCategory: {
      quantitative: 0,
      logical: 0,
      verbal: 0
    },
    averageTimePerDifficulty: {
      easy: 0,
      medium: 0,
      hard: 0
    }
  };

  // Calculate category and difficulty averages
  const categoryTotals = { quantitative: { time: 0, count: 0 }, logical: { time: 0, count: 0 }, verbal: { time: 0, count: 0 } };
  const difficultyTotals = { easy: { time: 0, count: 0 }, medium: { time: 0, count: 0 }, hard: { time: 0, count: 0 } };

  attempts.forEach(attempt => {
    ['quantitative', 'logical', 'verbal'].forEach(category => {
      const perf = attempt.categoryPerformance[category];
      if (perf.total > 0) {
        categoryTotals[category].time += perf.averageTime * perf.total;
        categoryTotals[category].count += perf.total;
      }
    });

    ['easy', 'medium', 'hard'].forEach(difficulty => {
      const perf = attempt.difficultyPerformance[difficulty];
      if (perf.total > 0) {
        difficultyTotals[difficulty].time += perf.averageTime * perf.total;
        difficultyTotals[difficulty].count += perf.total;
      }
    });
  });

  Object.keys(categoryTotals).forEach(category => {
    const total = categoryTotals[category];
    timeAnalytics.averageTimePerCategory[category] = 
      total.count > 0 ? total.time / total.count : 0;
  });

  Object.keys(difficultyTotals).forEach(difficulty => {
    const total = difficultyTotals[difficulty];
    timeAnalytics.averageTimePerDifficulty[difficulty] = 
      total.count > 0 ? total.time / total.count : 0;
  });

  return {
    summary,
    performanceDistribution,
    questionAnalysis: Object.values(questionAnalysis),
    timeAnalytics,
    recentAttempts: attempts.slice(0, 10).map(a => ({
      student: a.student,
      score: a.score,
      percentage: a.percentage,
      timeSpent: a.totalTimeSpent,
      createdAt: a.createdAt
    }))
  };
};

module.exports = router;