const ScreeningTest = require('../models/ScreeningTest');
const ScreeningTestAttempt = require('../models/ScreeningTestAttempt');
const Question = require('../models/Question');
const Classroom = require('../models/Classroom');
const User = require('../models/User');

// Create a new screening test
const createScreeningTest = async (req, res) => {
  try {
    const {
      title,
      description,
      classroom,
      totalTimeLimit,
      questionCriteria,
      selectedQuestions,
      settings
    } = req.body;

    // Validate teacher permissions
    const classroomDoc = await Classroom.findById(classroom);
    if (!classroomDoc || classroomDoc.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create tests for this classroom'
      });
    }

    let questions;

    // Handle different selection modes
    if (selectedQuestions && selectedQuestions.length > 0) {
      // Manual selection mode
      questions = await Question.find({ _id: { $in: selectedQuestions } });
    } else if (questionCriteria) {
      // Automatic selection mode
      questions = await generateQuestionsFromCriteria(questionCriteria);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either questionCriteria or selectedQuestions must be provided'
      });
    }
    
    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions found matching the specified criteria'
      });
    }

    const screeningTest = new ScreeningTest({
      title,
      description,
      teacher: req.user.id,
      classroom,
      questions: questions.map(q => ({
        question: q._id,
        points: questionCriteria ? (questionCriteria.pointsPerQuestion || 1) : 1,
        timeLimit: questionCriteria ? (questionCriteria.timePerQuestion || 60) : 60
      })),
      totalTimeLimit,
      settings: settings || {}
    });

    await screeningTest.save();
    await screeningTest.populate([
      { path: 'teacher', select: 'name email' },
      { path: 'classroom', select: 'name' },
      { path: 'questions.question', select: 'category difficulty question' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Screening test created successfully',
      data: screeningTest
    });
  } catch (error) {
    console.error('Create screening test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create screening test',
      error: error.message
    });
  }
};

// Helper function to generate questions based on criteria
const generateQuestionsFromCriteria = async (criteria) => {
  const questions = [];
  
  for (const categoryKey of Object.keys(criteria.distribution)) {
    const categoryName = getCategoryName(categoryKey);
    const difficulties = criteria.distribution[categoryKey];
    
    for (const difficultyKey of Object.keys(difficulties)) {
      const count = difficulties[difficultyKey];
      
      if (count > 0) {
        const categoryQuestions = await Question.aggregate([
          {
            $match: {
              category: categoryName,
              difficulty: difficultyKey
            }
          },
          { $sample: { size: count } }
        ]);
        
        questions.push(...categoryQuestions);
      }
    }
  }
  
  return questions;
};

// Helper function to get full category name
const getCategoryName = (key) => {
  const categoryMap = {
    quantitative: 'Quantitative Aptitude',
    logical: 'Logical Reasoning and Data Interpretation',
    verbal: 'Verbal Ability and Reading Comprehension'
  };
  return categoryMap[key] || key;
};

// Get all screening tests for a classroom
const getScreeningTests = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check access permissions
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isStudent = classroom.students.some(s => s.student.toString() === req.user.id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const screeningTests = await ScreeningTest.find({
      classroom: classroomId,
      isActive: true
    })
    .populate('teacher', 'name email')
    .populate('classroom', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Add attempt count for each student
    if (isStudent) {
      for (let test of screeningTests) {
        const attemptCount = await ScreeningTestAttempt.countDocuments({
          screeningTest: test._id,
          student: req.user.id
        });
        test.userAttemptCount = attemptCount;
      }
    }

    const total = await ScreeningTest.countDocuments({
      classroom: classroomId,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        screeningTests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get screening tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch screening tests',
      error: error.message
    });
  }
};

// Get specific screening test details
const getScreeningTest = async (req, res) => {
  try {
    const { testId } = req.params;

    const screeningTest = await ScreeningTest.findById(testId)
      .populate('teacher', 'name email')
      .populate('classroom', 'name')
      .populate({
        path: 'questions.question',
        select: 'category difficulty question options explanation tags'
      });

    if (!screeningTest) {
      return res.status(404).json({
        success: false,
        message: 'Screening test not found'
      });
    }

    // Check access permissions
    const classroom = await Classroom.findById(screeningTest.classroom);
    const isTeacher = classroom.teacher.toString() === req.user.id;
    const isStudent = classroom.students.some(s => s.student.toString() === req.user.id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // For students, get their attempt history
    if (isStudent) {
      const attempts = await ScreeningTestAttempt.find({
        screeningTest: testId,
        student: req.user.id
      }).sort({ attemptNumber: -1 });

      screeningTest.userAttempts = attempts;
    }

    // For teachers, get overall analytics
    if (isTeacher) {
      const analytics = await getTestAnalytics(testId);
      screeningTest.analytics = analytics;
    }

    res.json({
      success: true,
      data: screeningTest
    });
  } catch (error) {
    console.error('Get screening test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch screening test',
      error: error.message
    });
  }
};

// Start a new screening test attempt
const startScreeningTest = async (req, res) => {
  try {
    const { testId } = req.params;

    const screeningTest = await ScreeningTest.findById(testId)
      .populate('questions.question');

    if (!screeningTest) {
      return res.status(404).json({
        success: false,
        message: 'Screening test not found'
      });
    }

    // Check if student has access
    const classroom = await Classroom.findById(screeningTest.classroom);
    if (!classroom.students.some(s => s.student.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get next attempt number
    const lastAttempt = await ScreeningTestAttempt.findOne({
      screeningTest: testId,
      student: req.user.id
    }).sort({ attemptNumber: -1 });

    const attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

    // Prepare questions (shuffle if enabled)
    let questions = [...screeningTest.questions];
    if (screeningTest.settings.shuffleQuestions) {
      questions = shuffleArray(questions);
    }

    // Create new attempt
    const attempt = new ScreeningTestAttempt({
      screeningTest: testId,
      student: req.user.id,
      attemptNumber,
      totalQuestions: questions.length,
      questionAttempts: questions.map((q, index) => ({
        question: q.question._id,
        maxPoints: q.points,
        timeSpent: 0
      }))
    });

    await attempt.save();

    // Return sanitized test data (without correct answers)
    const testData = {
      _id: screeningTest._id,
      title: screeningTest.title,
      description: screeningTest.description,
      totalTimeLimit: screeningTest.totalTimeLimit,
      totalQuestions: questions.length,
      settings: screeningTest.settings,
      questions: questions.map(q => ({
        _id: q.question._id,
        question: q.question.question,
        options: screeningTest.settings.shuffleOptions ? 
          shuffleObjectValues(q.question.options) : q.question.options,
        points: q.points,
        timeLimit: q.timeLimit,
        category: q.question.category,
        difficulty: q.question.difficulty
      })),
      attemptId: attempt._id,
      attemptNumber
    };

    res.json({
      success: true,
      message: 'Screening test started successfully',
      data: testData
    });
  } catch (error) {
    console.error('Start screening test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start screening test',
      error: error.message
    });
  }
};

// Get attempt data for test interface
const getAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate({
        path: 'screeningTest',
        select: 'title description totalTimeLimit settings',
        populate: {
          path: 'questions.question',
          model: 'Question'
        }
      })
      .populate('student', 'name email');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    // Check if user has access to this attempt
    if (attempt.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Format the response data for the test interface
    const testData = {
      _id: attempt._id,
      screeningTest: {
        _id: attempt.screeningTest._id,
        title: attempt.screeningTest.title,
        description: attempt.screeningTest.description,
        timeLimit: attempt.screeningTest.totalTimeLimit,
        totalQuestions: attempt.screeningTest.questions.length
      },
      student: attempt.student._id,
      attemptNumber: attempt.attemptNumber,
      questions: attempt.screeningTest.questions.map(q => ({
        _id: q.question._id,
        question: q.question.question,
        options: attempt.screeningTest.settings.shuffleOptions ? 
          shuffleObjectValues(q.question.options) : q.question.options,
        category: q.question.category,
        difficulty: q.question.difficulty,
        points: q.points
      })),
      answers: attempt.answers || {},
      flaggedQuestions: attempt.flaggedQuestions || [],
      startTime: attempt.startTime,
      timeSpent: attempt.timeSpent,
      isCompleted: attempt.isCompleted,
      navigationPattern: attempt.navigationPattern || []
    };

    res.json({
      success: true,
      data: testData
    });
  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attempt data',
      error: error.message
    });
  }
};

// Save attempt progress (auto-save functionality)
const saveAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, flaggedQuestions, timeSpent } = req.body;

    const attempt = await ScreeningTestAttempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    // Check if user has access to this attempt
    if (attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update attempt data
    if (answers) attempt.answers = answers;
    if (flaggedQuestions) attempt.flaggedQuestions = flaggedQuestions;
    if (timeSpent !== undefined) attempt.timeSpent = timeSpent;

    await attempt.save();

    res.json({
      success: true,
      message: 'Progress saved successfully'
    });
  } catch (error) {
    console.error('Save attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save progress',
      error: error.message
    });
  }
};

// Record navigation pattern
const recordNavigation = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, action, timestamp } = req.body;

    const attempt = await ScreeningTestAttempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    // Check if user has access to this attempt
    if (attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add navigation record
    if (!attempt.navigationPattern) {
      attempt.navigationPattern = [];
    }

    attempt.navigationPattern.push({
      questionId,
      action,
      timestamp: timestamp || new Date()
    });

    await attempt.save();

    res.json({
      success: true,
      message: 'Navigation recorded successfully'
    });
  } catch (error) {
    console.error('Record navigation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record navigation',
      error: error.message
    });
  }
};

// Get attempt result data
const getAttemptResult = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate({
        path: 'screeningTest',
        select: 'title description totalTimeLimit questions',
        populate: {
          path: 'questions.question',
          model: 'Question',
          select: 'question options correctAnswer category difficulty explanation'
        }
      })
      .populate('student', 'name email');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    // Check if user has access to this attempt
    if (attempt.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if attempt is completed
    if (!attempt.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Test attempt is not yet completed'
      });
    }

    // Calculate detailed results
    let correctAnswers = 0;
    let totalQuestions = attempt.screeningTest.questions.length;
    let totalScore = 0;
    let maxScore = 0;

    const questionResults = attempt.screeningTest.questions.map(q => {
      // Handle both populated and non-populated question references
      const question = q.question || q;
      const questionId = question._id || question;
      
      if (!question || typeof question === 'string') {
        console.error('Question not properly populated:', q);
        return null;
      }

      // Find the corresponding question attempt
      const questionAttempt = attempt.questionAttempts.find(qa => 
        qa.question._id.toString() === questionId.toString()
      );

      const userAnswer = questionAttempt?.selectedAnswer || null;
      const isCorrect = questionAttempt?.isCorrect || false;
      
      if (isCorrect) {
        correctAnswers++;
        totalScore += questionAttempt?.pointsEarned || 0;
      }
      maxScore += questionAttempt?.maxPoints || 1;

      return {
        questionId: question._id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        userAnswer: userAnswer,
        isCorrect,
        points: questionAttempt?.pointsEarned || 0,
        maxPoints: questionAttempt?.maxPoints || 1,
        category: question.category,
        difficulty: question.difficulty,
        explanation: question.explanation || ''
      };
    }).filter(Boolean); // Remove null entries

    // Create questionAttempts for frontend compatibility
    const questionAttempts = attempt.questionAttempts.map(qa => ({
      question: {
        _id: qa.question._id,
        question: qa.question.question,
        category: qa.question.category,
        difficulty: qa.question.difficulty,
        correctAnswer: qa.question.correctAnswer,
        points: qa.maxPoints
      },
      selectedAnswer: qa.selectedAnswer,
      isCorrect: qa.isCorrect,
      timeSpent: qa.timeSpent,
      confidence: qa.visitCount > 1 ? 0.5 : 1 // Simple confidence metric
    }));

    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const resultData = {
      attemptId: attempt._id,
      testTitle: attempt.screeningTest.title,
      testDescription: attempt.screeningTest.description,
      studentName: attempt.student.name || attempt.student.firstName + ' ' + attempt.student.lastName,
      attemptNumber: attempt.attemptNumber,
      completedAt: attempt.endTime || attempt.updatedAt, // Use endTime or updatedAt
      createdAt: attempt.createdAt || attempt.startTime, // Frontend expects this field
      timeSpent: attempt.totalTimeSpent || 0,
      totalTimeSpent: attempt.totalTimeSpent || 0, // Add both field names
      totalTimeLimit: (attempt.screeningTest.totalTimeLimit || 60) * 60, // Convert to seconds
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers, // Add alternative field name
      skippedQuestions: attempt.skippedQuestions || 0, // Use calculated value from analytics
      totalScore: totalScore || 0,
      maxScore: maxScore || totalQuestions,
      score: totalScore || 0, // Add alternative field name
      percentage: Math.round(percentage * 100) / 100,
      passed: percentage >= (attempt.screeningTest.passingScore || 60),
      questionResults,
      questionAttempts, // Frontend expects this field name
      // Include screening test data for frontend
      screeningTest: {
        title: attempt.screeningTest.title,
        description: attempt.screeningTest.description,
        passingScore: attempt.screeningTest.passingScore || 60,
        totalTimeLimit: attempt.screeningTest.totalTimeLimit || 60,
        timeLimit: attempt.screeningTest.totalTimeLimit || 60, // Frontend uses this field name
        totalQuestions: totalQuestions,
        settings: attempt.screeningTest.settings || {}
      },
      // Include performance data
      categoryPerformance: attempt.categoryPerformance,
      difficultyPerformance: attempt.difficultyPerformance,
      analytics: {
        ...attempt.analytics,
        // Ensure all required analytics fields exist
        timeSpentPerQuestion: attempt.analytics.timeSpentPerQuestion || 0,
        speedMetrics: {
          ...attempt.analytics.speedMetrics,
          averageTimePerCategory: attempt.analytics.speedMetrics?.averageTimePerCategory || {
            quantitative: 0, logical: 0, verbal: 0
          },
          averageTimePerDifficulty: attempt.analytics.speedMetrics?.averageTimePerDifficulty || {
            easy: 0, medium: 0, hard: 0
          }
        }
      }
    };

    // Debug log the result data to check for NaN values
    console.log('Sending result data:', {
      totalScore: resultData.totalScore,
      maxScore: resultData.maxScore,
      totalTimeSpent: resultData.totalTimeSpent,
      totalQuestions: resultData.totalQuestions,
      screeningTestTotalQuestions: resultData.screeningTest.totalQuestions,
      timeLimit: resultData.screeningTest.timeLimit,
      createdAt: resultData.createdAt
    });

    res.json({
      success: true,
      data: resultData
    });
  } catch (error) {
    console.error('Get attempt result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attempt result',
      error: error.message
    });
  }
};

// Submit answer for a question
const submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedAnswer, timeSpent } = req.body;

    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate('screeningTest');

    if (!attempt || attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (attempt.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: 'Test already submitted'
      });
    }

    // Find the question attempt
    const questionAttemptIndex = attempt.questionAttempts.findIndex(
      qa => qa.question.toString() === questionId
    );

    if (questionAttemptIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in this attempt'
      });
    }

    // Get the correct answer
    const question = await Question.findById(questionId);
    const isCorrect = selectedAnswer === question.correctAnswer;

    // Update question attempt
    const questionAttempt = attempt.questionAttempts[questionAttemptIndex];
    
    // Track answer changes
    if (questionAttempt.selectedAnswer && questionAttempt.selectedAnswer !== selectedAnswer) {
      questionAttempt.answerChanges.push({
        previousAnswer: questionAttempt.selectedAnswer,
        newAnswer: selectedAnswer
      });
    }

    questionAttempt.selectedAnswer = selectedAnswer;
    questionAttempt.isCorrect = isCorrect;
    questionAttempt.timeSpent = timeSpent;
    questionAttempt.pointsEarned = isCorrect ? questionAttempt.maxPoints : 0;
    questionAttempt.visitCount += 1;
    questionAttempt.lastVisitTime = new Date();

    // Track navigation
    attempt.analytics.questionNavigationPattern.push({
      questionIndex: questionAttemptIndex,
      timestamp: new Date(),
      action: 'answered'
    });

    await attempt.save();

    res.json({
      success: true,
      message: 'Answer submitted successfully'
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message
    });
  }
};

// Submit entire screening test
const submitScreeningTest = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate({
        path: 'screeningTest',
        populate: {
          path: 'questions.question',
          model: 'Question'
        }
      })
      .populate('questionAttempts.question');

    if (!attempt || attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (attempt.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: 'Test already submitted'
      });
    }

    // Calculate detailed analytics
    await calculateDetailedAnalytics(attempt);

    // Mark as completed and submitted
    attempt.isCompleted = true;
    attempt.isSubmitted = true;
    attempt.endTime = new Date();

    await attempt.save();

    // Update screening test analytics
    await updateScreeningTestAnalytics(attempt.screeningTest._id);

    // Prepare result data
    const resultData = {
      attemptId: attempt._id,
      score: attempt.score,
      percentage: attempt.percentage,
      totalQuestions: attempt.totalQuestions,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers: attempt.wrongAnswers,
      skippedQuestions: attempt.skippedQuestions,
      totalTimeSpent: attempt.totalTimeSpent,
      categoryPerformance: attempt.categoryPerformance,
      difficultyPerformance: attempt.difficultyPerformance,
      analytics: attempt.analytics
    };

    // Add correct answers if allowed
    if (attempt.screeningTest.settings.showCorrectAnswers) {
      resultData.questionResults = attempt.questionAttempts.map(qa => ({
        question: qa.question._id,
        selectedAnswer: qa.selectedAnswer,
        correctAnswer: attempt.screeningTest.questions.find(
          q => q.question._id.toString() === qa.question._id.toString()
        )?.question.correctAnswer,
        isCorrect: qa.isCorrect,
        explanation: attempt.screeningTest.questions.find(
          q => q.question._id.toString() === qa.question._id.toString()
        )?.question.explanation
      }));
    }

    res.json({
      success: true,
      message: 'Screening test submitted successfully',
      data: resultData
    });
  } catch (error) {
    console.error('Submit screening test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit screening test',
      error: error.message
    });
  }
};

// Get detailed analytics for a screening test (teacher only)
const getTestAnalytics = async (testId) => {
  const attempts = await ScreeningTestAttempt.find({
    screeningTest: testId,
    isCompleted: true
  }).populate('student', 'name email');

  const analytics = {
    totalAttempts: attempts.length,
    uniqueStudents: [...new Set(attempts.map(a => a.student._id.toString()))].length,
    averageScore: attempts.length > 0 ? 
      attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length : 0,
    averageTimeSpent: attempts.length > 0 ? 
      attempts.reduce((sum, a) => sum + a.totalTimeSpent, 0) / attempts.length : 0,
    completionRate: attempts.length > 0 ? 
      (attempts.filter(a => a.isCompleted).length / attempts.length) * 100 : 0,
    
    // Performance distribution
    performanceDistribution: {
      excellent: attempts.filter(a => a.percentage >= 90).length,
      good: attempts.filter(a => a.percentage >= 70 && a.percentage < 90).length,
      average: attempts.filter(a => a.percentage >= 50 && a.percentage < 70).length,
      poor: attempts.filter(a => a.percentage < 50).length
    },

    // Category-wise performance
    categoryAnalytics: calculateCategoryAnalytics(attempts),
    
    // Difficulty-wise performance
    difficultyAnalytics: calculateDifficultyAnalytics(attempts),
    
    // Time analytics
    timeAnalytics: calculateTimeAnalytics(attempts),
    
    // Top performers
    topPerformers: attempts
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10)
      .map(a => ({
        student: a.student,
        score: a.score,
        percentage: a.percentage,
        timeSpent: a.totalTimeSpent,
        attemptNumber: a.attemptNumber
      }))
  };

  return analytics;
};

// Helper functions for analytics calculations
const calculateCategoryAnalytics = (attempts) => {
  const categories = ['quantitative', 'logical', 'verbal'];
  const analytics = {};

  categories.forEach(category => {
    const categoryData = attempts.map(a => a.categoryPerformance[category]);
    analytics[category] = {
      averageAccuracy: categoryData.length > 0 ? 
        categoryData.reduce((sum, c) => sum + c.accuracy, 0) / categoryData.length : 0,
      averageTime: categoryData.length > 0 ? 
        categoryData.reduce((sum, c) => sum + c.averageTime, 0) / categoryData.length : 0,
      totalQuestions: categoryData.length > 0 ? categoryData[0].total : 0
    };
  });

  return analytics;
};

const calculateDifficultyAnalytics = (attempts) => {
  const difficulties = ['easy', 'medium', 'hard'];
  const analytics = {};

  difficulties.forEach(difficulty => {
    const difficultyData = attempts.map(a => a.difficultyPerformance[difficulty]);
    analytics[difficulty] = {
      averageAccuracy: difficultyData.length > 0 ? 
        difficultyData.reduce((sum, d) => sum + d.accuracy, 0) / difficultyData.length : 0,
      averageTime: difficultyData.length > 0 ? 
        difficultyData.reduce((sum, d) => sum + d.averageTime, 0) / difficultyData.length : 0,
      totalQuestions: difficultyData.length > 0 ? difficultyData[0].total : 0
    };
  });

  return analytics;
};

const calculateTimeAnalytics = (attempts) => {
  if (attempts.length === 0) return {};

  const times = attempts.map(a => a.totalTimeSpent);
  times.sort((a, b) => a - b);

  return {
    averageTime: times.reduce((sum, t) => sum + t, 0) / times.length,
    medianTime: times[Math.floor(times.length / 2)],
    minTime: times[0],
    maxTime: times[times.length - 1],
    timeDistribution: {
      fast: times.filter(t => t < times[Math.floor(times.length * 0.25)]).length,
      average: times.filter(t => t >= times[Math.floor(times.length * 0.25)] && 
                               t <= times[Math.floor(times.length * 0.75)]).length,
      slow: times.filter(t => t > times[Math.floor(times.length * 0.75)]).length
    }
  };
};

// Calculate detailed analytics for a single attempt
const calculateDetailedAnalytics = async (attempt) => {
  // Populate question data for analysis
  await attempt.populate('questionAttempts.question');
  
  const questionAttempts = attempt.questionAttempts;
  
  // Debug log to check if questions are populated
  console.log('Question attempts for analytics:', questionAttempts.map(qa => ({
    questionId: qa.question?._id,
    hasQuestion: !!qa.question,
    category: qa.question?.category,
    difficulty: qa.question?.difficulty,
    selectedAnswer: qa.selectedAnswer,
    isCorrect: qa.isCorrect
  })));
  
  // Reset performance metrics
  ['quantitative', 'logical', 'verbal'].forEach(category => {
    attempt.categoryPerformance[category] = {
      total: 0, correct: 0, wrong: 0, skipped: 0,
      averageTime: 0, accuracy: 0, score: 0
    };
  });
  
  ['easy', 'medium', 'hard'].forEach(difficulty => {
    attempt.difficultyPerformance[difficulty] = {
      total: 0, correct: 0, wrong: 0, skipped: 0,
      averageTime: 0, accuracy: 0, score: 0
    };
  });

  // Analyze each question attempt
  const categoryTimes = { quantitative: [], logical: [], verbal: [] };
  const difficultyTimes = { easy: [], medium: [], hard: [] };
  
  questionAttempts.forEach(qa => {
    const question = qa.question;
    
    console.log('Processing question attempt in analytics:', {
      questionId: question?._id,
      hasQuestion: !!question,
      category: question?.category,
      difficulty: question?.difficulty,
      selectedAnswer: qa.selectedAnswer,
      isCorrect: qa.isCorrect
    });
    
    // Skip if question is not populated
    if (!question || !question.category || !question.difficulty) {
      console.log('Skipping question attempt - missing question data:', qa);
      return;
    }
    
    const categoryKey = getCategoryKey(question.category);
    const difficulty = question.difficulty;
    
    console.log('Mapped category:', categoryKey, 'from', question.category);
    
    // Update category performance
    if (categoryKey && attempt.categoryPerformance[categoryKey]) {
      attempt.categoryPerformance[categoryKey].total++;
      categoryTimes[categoryKey].push(qa.timeSpent);
      
      if (qa.selectedAnswer === null) {
        attempt.categoryPerformance[categoryKey].skipped++;
      } else if (qa.isCorrect) {
        attempt.categoryPerformance[categoryKey].correct++;
        attempt.categoryPerformance[categoryKey].score += qa.pointsEarned;
      } else {
        attempt.categoryPerformance[categoryKey].wrong++;
      }
    }
    
    // Update difficulty performance
    if (attempt.difficultyPerformance[difficulty]) {
      attempt.difficultyPerformance[difficulty].total++;
      difficultyTimes[difficulty].push(qa.timeSpent);
      
      if (qa.selectedAnswer === null) {
        attempt.difficultyPerformance[difficulty].skipped++;
      } else if (qa.isCorrect) {
        attempt.difficultyPerformance[difficulty].correct++;
        attempt.difficultyPerformance[difficulty].score += qa.pointsEarned;
      } else {
        attempt.difficultyPerformance[difficulty].wrong++;
      }
    }
  });
  
  // Calculate averages and accuracies
  ['quantitative', 'logical', 'verbal'].forEach(category => {
    const perf = attempt.categoryPerformance[category];
    if (perf.total > 0) {
      perf.accuracy = (perf.correct / perf.total) * 100;
      perf.averageTime = categoryTimes[category].reduce((a, b) => a + b, 0) / categoryTimes[category].length;
    }
  });
  
  ['easy', 'medium', 'hard'].forEach(difficulty => {
    const perf = attempt.difficultyPerformance[difficulty];
    if (perf.total > 0) {
      perf.accuracy = (perf.correct / perf.total) * 100;
      perf.averageTime = difficultyTimes[difficulty].reduce((a, b) => a + b, 0) / difficultyTimes[difficulty].length;
    }
  });

  // Update speed metrics
  attempt.analytics.speedMetrics.averageTimePerCategory = {
    quantitative: categoryTimes.quantitative.length > 0 ? 
      categoryTimes.quantitative.reduce((a, b) => a + b, 0) / categoryTimes.quantitative.length : 0,
    logical: categoryTimes.logical.length > 0 ? 
      categoryTimes.logical.reduce((a, b) => a + b, 0) / categoryTimes.logical.length : 0,
    verbal: categoryTimes.verbal.length > 0 ? 
      categoryTimes.verbal.reduce((a, b) => a + b, 0) / categoryTimes.verbal.length : 0
  };

  attempt.analytics.speedMetrics.averageTimePerDifficulty = {
    easy: difficultyTimes.easy.length > 0 ? 
      difficultyTimes.easy.reduce((a, b) => a + b, 0) / difficultyTimes.easy.length : 0,
    medium: difficultyTimes.medium.length > 0 ? 
      difficultyTimes.medium.reduce((a, b) => a + b, 0) / difficultyTimes.medium.length : 0,
    hard: difficultyTimes.hard.length > 0 ? 
      difficultyTimes.hard.reduce((a, b) => a + b, 0) / difficultyTimes.hard.length : 0
  };

  // Calculate basic metrics manually (don't call calculatePerformanceMetrics as it resets our category/difficulty data)
  let totalScore = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let skippedQuestions = 0;
  let totalTime = 0;
  
  questionAttempts.forEach(qa => {
    totalScore += qa.pointsEarned;
    totalTime += qa.timeSpent;
    
    if (qa.selectedAnswer === null) {
      skippedQuestions++;
    } else if (qa.isCorrect) {
      correctAnswers++;
    } else {
      wrongAnswers++;
    }
  });
  
  // Update basic metrics
  attempt.score = totalScore;
  attempt.correctAnswers = correctAnswers;
  attempt.wrongAnswers = wrongAnswers;
  attempt.skippedQuestions = skippedQuestions;
  attempt.totalTimeSpent = totalTime;
  attempt.percentage = attempt.totalQuestions > 0 ? (correctAnswers / attempt.totalQuestions) * 100 : 0;
  
  // Calculate speed metrics
  if (questionAttempts.length > 0) {
    attempt.analytics.timeSpentPerQuestion = totalTime / questionAttempts.length;
    
    const times = questionAttempts.map(a => a.timeSpent).sort((a, b) => a - b);
    attempt.analytics.speedMetrics.fastestQuestion = { time: times[0] };
    attempt.analytics.speedMetrics.slowestQuestion = { time: times[times.length - 1] };
  }
  
  // Calculate accuracy trends
  if (questionAttempts.length >= 2) {
    const halfPoint = Math.floor(questionAttempts.length / 2);
    const firstHalf = questionAttempts.slice(0, halfPoint);
    const secondHalf = questionAttempts.slice(halfPoint);
    
    const firstHalfCorrect = firstHalf.filter(qa => qa.isCorrect).length;
    const secondHalfCorrect = secondHalf.filter(qa => qa.isCorrect).length;
    
    attempt.analytics.accuracyTrends.firstHalf = firstHalf.length > 0 ? 
      (firstHalfCorrect / firstHalf.length) * 100 : 0;
    attempt.analytics.accuracyTrends.secondHalf = secondHalf.length > 0 ? 
      (secondHalfCorrect / secondHalf.length) * 100 : 0;
    attempt.analytics.accuracyTrends.improvementRate = 
      attempt.analytics.accuracyTrends.secondHalf - attempt.analytics.accuracyTrends.firstHalf;
  }
  
  // Calculate confidence metrics
  attempt.analytics.confidenceMetrics.questionsRevisited = 
    questionAttempts.filter(qa => qa.visitCount > 1).length;
  attempt.analytics.confidenceMetrics.answerChanges = 
    questionAttempts.reduce((total, qa) => total + qa.answerChanges.length, 0);
  
  // Debug log final performance metrics
  console.log('Final category performance after analytics:', JSON.stringify(attempt.categoryPerformance, null, 2));
  console.log('Final difficulty performance after analytics:', JSON.stringify(attempt.difficultyPerformance, null, 2));
};

// Get category key from category name
const getCategoryKey = (categoryName) => {
  const categoryMap = {
    'Quantitative Aptitude': 'quantitative',
    'Logical Reasoning and Data Interpretation': 'logical',
    'Verbal Ability and Reading Comprehension': 'verbal'
  };
  return categoryMap[categoryName];
};

// Update screening test analytics
const updateScreeningTestAnalytics = async (testId) => {
  const attempts = await ScreeningTestAttempt.find({
    screeningTest: testId,
    isCompleted: true
  });

  if (attempts.length === 0) return;

  const analytics = {
    totalAttempts: attempts.length,
    averageScore: attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length,
    averageTimeSpent: attempts.reduce((sum, a) => sum + a.totalTimeSpent, 0) / attempts.length / 60, // in minutes
    completionRate: (attempts.filter(a => a.isCompleted).length / attempts.length) * 100,
    participantCount: [...new Set(attempts.map(a => a.student.toString()))].length
  };

  await ScreeningTest.findByIdAndUpdate(testId, { analytics });
};

// Utility functions
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const shuffleObjectValues = (obj) => {
  const entries = Object.entries(obj);
  const values = entries.map(([key, value]) => value);
  const shuffledValues = shuffleArray(values);
  
  const result = {};
  entries.forEach(([key], index) => {
    result[key] = shuffledValues[index];
  });
  
  return result;
};

// Get student's screening test history
const getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check permissions
    if (req.user.id !== studentId && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const attempts = await ScreeningTestAttempt.find({
      student: studentId,
      isCompleted: true
    })
    .populate({
      path: 'screeningTest',
      select: 'title description classroom totalTimeLimit',
      populate: {
        path: 'classroom',
        select: 'name'
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await ScreeningTestAttempt.countDocuments({
      student: studentId,
      isCompleted: true
    });

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get student history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student history',
      error: error.message
    });
  }
};

// Get detailed attempt analytics
const getAttemptAnalytics = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate({
        path: 'screeningTest',
        populate: {
          path: 'teacher',
          select: 'name'
        }
      })
      .populate('student', 'name email')
      .populate('questionAttempts.question');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Check permissions
    const isStudent = attempt.student._id.toString() === req.user.id;
    const isTeacher = attempt.screeningTest.teacher._id.toString() === req.user.id;

    if (!isStudent && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: attempt
    });
  } catch (error) {
    console.error('Get attempt analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempt analytics',
      error: error.message
    });
  }
};

module.exports = {
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
};