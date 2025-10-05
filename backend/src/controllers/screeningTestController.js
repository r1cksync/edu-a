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

    // Prepare questions (shuffling disabled)
    let questions = [...screeningTest.questions];
    // Force disable shuffling for debugging
    // if (screeningTest.settings.shuffleQuestions) {
    //   questions = shuffleArray(questions);
    // }

    // Calculate total questions for dynamic difficulty tests
    let totalQuestions = questions.length;
    if (screeningTest.settings.dynamicDifficulty) {
      // For dynamic difficulty, calculate based on settings or use default
      const config = screeningTest.settings.dynamicConfig || {};
      const questionsPerBatch = config.questionsPerBatch || 5;
      const totalBatches = config.totalBatches || 12; // 3 categories × 4 batches each
      totalQuestions = questionsPerBatch * totalBatches;
    }

    // Create new attempt
    const attempt = new ScreeningTestAttempt({
      screeningTest: testId,
      student: req.user.id,
      attemptNumber,
      totalQuestions,
      questionAttempts: screeningTest.settings.dynamicDifficulty ? [] : questions.map((q, index) => ({
        question: q.question._id,
        maxPoints: q.points,
        timeSpent: 0
      })),
      // Initialize dynamic difficulty progress if enabled
      dynamicDifficultyProgress: screeningTest.settings.dynamicDifficulty ? {
        enabled: true,
        currentCategory: 'quantitative',
        currentDifficulty: 'easy',
        currentBatch: 1,
        batchHistory: [],
        categoryProgress: {
          quantitative: {
            currentDifficulty: 'easy',
            completedDifficulties: [],
            highestReached: 'easy'
          },
          logical: {
            currentDifficulty: 'easy',
            completedDifficulties: [],
            highestReached: 'easy'
          },
          verbal: {
            currentDifficulty: 'easy',
            completedDifficulties: [],
            highestReached: 'easy'
          }
        },
        isComplete: false
      } : undefined
    });

    await attempt.save();

    // For dynamic difficulty tests, get the first batch of questions
    let firstBatch = null;
    if (screeningTest.settings.dynamicDifficulty) {
      const questionsPerBatch = screeningTest.settings.dynamicConfig?.questionsPerBatch || 5;
      
      // Initialize used questions tracking
      attempt.dynamicDifficultyProgress.usedQuestions = [];
      
      const firstBatchQuestions = await getQuestionsForBatch('quantitative', 'easy', questionsPerBatch, []);
      
      if (firstBatchQuestions.length > 0) {
        // Track used questions
        const usedQuestionIds = firstBatchQuestions.map(q => q._id);
        attempt.dynamicDifficultyProgress.usedQuestions = usedQuestionIds;
        
        // Create first batch record
        const newBatch = {
          category: 'quantitative',
          difficulty: 'easy',
          batchNumber: 1,
          questions: usedQuestionIds,
          correctAnswers: 0,
          totalQuestions: firstBatchQuestions.length,
          completed: false,
          answers: new Map() // Use Map consistently like other batches
        };

        attempt.dynamicDifficultyProgress.batchHistory.push(newBatch);
        await attempt.save();

        firstBatch = {
          questions: firstBatchQuestions.map(q => ({
            _id: q._id,
            question: q.question,
            options: q.options, // Disabled shuffling for debugging
            points: 1, // Default points for dynamic questions
            timeLimit: q.timeLimit || 60, // Default time limit
            category: q.category,
            difficulty: q.difficulty
          })),
          batchInfo: {
            category: 'quantitative',
            difficulty: 'easy',
            batchNumber: 1,
            questionsCount: firstBatchQuestions.length
          }
        };
      }
    }

    // Return sanitized test data (without correct answers)
    const testData = {
      _id: screeningTest._id,
      title: screeningTest.title,
      description: screeningTest.description,
      totalTimeLimit: screeningTest.totalTimeLimit,
      totalQuestions: screeningTest.settings.dynamicDifficulty ? totalQuestions : questions.length,
      settings: screeningTest.settings,
      questions: screeningTest.settings.dynamicDifficulty ? [] : questions.map(q => ({
        _id: q.question._id,
        question: q.question.question,
        options: q.question.options, // Disabled shuffling for debugging
        points: q.points,
        timeLimit: q.timeLimit,
        category: q.question.category,
        difficulty: q.question.difficulty
      })),
      attemptId: attempt._id,
      attemptNumber,
      isDynamicDifficulty: screeningTest.settings.dynamicDifficulty,
      firstBatch: firstBatch
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

    // For dynamic difficulty tests, return only current batch questions
    let questionsToReturn = [];
    let isDynamicDifficulty = false;
    let currentBatchInfo = null;
    let batchAnswers = {};

    if (attempt.dynamicDifficultyProgress && attempt.dynamicDifficultyProgress.enabled) {
      isDynamicDifficulty = true;
      const progress = attempt.dynamicDifficultyProgress;
      
      // Get current active batch
      const currentBatchIndex = progress.batchHistory.length - 1;
      const currentBatch = progress.batchHistory[currentBatchIndex];
      
      if (currentBatch && !currentBatch.completed) {
        // Get questions for current batch
        const batchQuestions = await Question.find({
          _id: { $in: currentBatch.questions }
        });
        
        questionsToReturn = batchQuestions.map(q => ({
          _id: q._id,
          question: q.question,
          options: q.options, // Force disable option shuffling
          category: q.category,
          difficulty: q.difficulty,
          points: 1, // Dynamic questions have standard points
          timeLimit: q.timeLimit || 60
        }));

        currentBatchInfo = {
          category: currentBatch.category,
          difficulty: currentBatch.difficulty,
          batchNumber: currentBatch.batchNumber,
          questionsCount: currentBatch.totalQuestions,
          answeredQuestions: currentBatch.answers ? Object.keys(currentBatch.answers).length : 0
        };

        // Convert batch answers to frontend format (questionId -> selectedAnswer)
        if (currentBatch.answers && Object.keys(currentBatch.answers).length > 0) {
          for (const [questionId, answerData] of Object.entries(currentBatch.answers)) {
            if (typeof answerData === 'object' && answerData !== null && answerData.selectedAnswer) {
              batchAnswers[questionId] = answerData.selectedAnswer;
            }
          }
        }
      }
    } else {
      // Regular test - return all questions
      questionsToReturn = attempt.screeningTest.questions.map(q => ({
        _id: q.question._id,
        question: q.question.question,
        options: q.question.options, // Force disable option shuffling
        category: q.question.category,
        difficulty: q.question.difficulty,
        points: q.points
      }));
    }

    // Format the response data for the test interface
    const testData = {
      _id: attempt._id,
      screeningTest: {
        _id: attempt.screeningTest._id,
        title: attempt.screeningTest.title,
        description: attempt.screeningTest.description,
        timeLimit: attempt.screeningTest.totalTimeLimit,
        totalQuestions: isDynamicDifficulty ? attempt.totalQuestions : attempt.screeningTest.questions.length
      },
      student: attempt.student._id,
      attemptNumber: attempt.attemptNumber,
      questions: questionsToReturn,
      answers: isDynamicDifficulty ? batchAnswers : (attempt.answers || {}),
      flaggedQuestions: attempt.flaggedQuestions || [],
      startTime: attempt.startTime,
      timeSpent: attempt.timeSpent,
      isCompleted: attempt.isCompleted,
      navigationPattern: attempt.navigationPattern || [],
      isDynamicDifficulty,
      currentBatch: currentBatchInfo,
      dynamicProgress: isDynamicDifficulty ? attempt.dynamicDifficultyProgress : null
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

    // Check if this is a dynamic difficulty test
    const isDynamicTest = attempt.dynamicDifficultyProgress && attempt.dynamicDifficultyProgress.enabled;
    
    // Calculate detailed results
    let correctAnswers = 0;
    let totalQuestions = 0; // Will be calculated based on actual attempts
    let totalScore = 0;
    let maxScore = 0;
    let totalTimeSpent = 0;
    let skippedCount = 0; // Questions presented but not answered
    let questionResults = [];

    if (isDynamicTest) {
      // Handle dynamic difficulty test results
      const batchHistory = attempt.dynamicDifficultyProgress.batchHistory;
      const allQuestionIds = [];
      const allPresentedQuestionIds = []; // All questions that were shown to user
      
      // Collect all questions that were presented in batches
      batchHistory.forEach(batch => {
        if (batch.questions && Array.isArray(batch.questions)) {
          batch.questions.forEach(questionId => {
            allPresentedQuestionIds.push(questionId);
          });
        }
      });
      
      // Check for first batch answers in dedicated field
      if (attempt.firstBatchAnswers) {
        Object.keys(attempt.firstBatchAnswers).forEach(questionId => {
          allQuestionIds.push(questionId);
        });
      }
      
      // Collect all question IDs from regular batches (excluding first batch)
      batchHistory.forEach((batch, index) => {
        if (index > 0 && batch.answers) { // Skip first batch, handled above
          const answersObj = batch.answers || {};
          Object.keys(answersObj).forEach(questionId => {
            allQuestionIds.push(questionId);
          });
        }
      });

      // Calculate skipped questions: presented but not answered
      skippedCount = allPresentedQuestionIds.filter(qId => !allQuestionIds.includes(qId)).length;
      
      // Get all questions that were attempted
      const attemptedQuestions = await Question.find({ _id: { $in: allQuestionIds } });
      totalQuestions = allPresentedQuestionIds.length; // Total presented to user
      
      // Process first batch answers from dedicated field
      if (attempt.firstBatchAnswers) {
        for (const [questionId, answerData] of Object.entries(attempt.firstBatchAnswers)) {
          const question = attemptedQuestions.find(q => q._id.toString() === questionId);
          if (question) {
            if (answerData.isCorrect) {
              correctAnswers++;
              totalScore += 1; // Dynamic questions worth 1 point each
            }
            maxScore += 1;
            totalTimeSpent += answerData.timeSpent || 0;

            questionResults.push({
              questionId: question._id,
              question: question.question,
              options: question.options,
              correctAnswer: question.correctAnswer,
              userAnswer: answerData.selectedAnswer,
              isCorrect: answerData.isCorrect,
              points: answerData.isCorrect ? 1 : 0,
              maxPoints: 1,
              category: question.category,
              difficulty: question.difficulty,
              explanation: question.explanation || '',
              timeSpent: answerData.timeSpent || 0,
              batch: {
                category: batchHistory[0]?.category || 'quantitative',
                difficulty: batchHistory[0]?.difficulty || 'easy',
                batchNumber: 1
              }
            });
          }
        }
      }
      
      // Process regular batch answers (excluding first batch)
      for (let i = 1; i < batchHistory.length; i++) {
        const batch = batchHistory[i];
        if (batch.answers) {
          const answersObj = batch.answers || {};
          
          for (const [questionId, answerData] of Object.entries(answersObj)) {
            const question = attemptedQuestions.find(q => q._id.toString() === questionId);
            if (question) {
              if (answerData.isCorrect) {
                correctAnswers++;
                totalScore += 1; // Dynamic questions worth 1 point each
              }
              maxScore += 1;
              totalTimeSpent += answerData.timeSpent || 0;

              questionResults.push({
                questionId: question._id,
                question: question.question,
                options: question.options,
                correctAnswer: question.correctAnswer,
                userAnswer: answerData.selectedAnswer,
                isCorrect: answerData.isCorrect,
                points: answerData.isCorrect ? 1 : 0,
                maxPoints: 1,
                category: question.category,
                difficulty: question.difficulty,
                explanation: question.explanation || '',
                timeSpent: answerData.timeSpent || 0,
                batch: {
                  category: batch.category,
                  difficulty: batch.difficulty,
                  batchNumber: batch.batchNumber
                }
              });
            }
          }
        }
      }
    } else {
      // Handle regular test results
      totalQuestions = attempt.screeningTest.questions.length;
      questionResults = attempt.screeningTest.questions.map(q => {
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
    }

    // Create questionAttempts for frontend compatibility
    let questionAttempts = [];
    
    if (isDynamicTest) {
      // For dynamic tests, create attempts from question results
      questionAttempts = questionResults.map(result => ({
        question: {
          _id: result.questionId,
          question: result.question,
          category: result.category,
          difficulty: result.difficulty,
          correctAnswer: result.correctAnswer,
          points: result.maxPoints
        },
        selectedAnswer: result.userAnswer,
        isCorrect: result.isCorrect,
        timeSpent: result.timeSpent || 0,
        confidence: 1, // Dynamic tests don't track revisits
        batch: result.batch
      }));
    } else {
      // For regular tests, use existing question attempts
      questionAttempts = attempt.questionAttempts.map(qa => ({
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
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const resultData = {
      attemptId: attempt._id,
      testTitle: attempt.screeningTest.title,
      testDescription: attempt.screeningTest.description,
      studentName: attempt.student.name || attempt.student.firstName + ' ' + attempt.student.lastName,
      attemptNumber: attempt.attemptNumber,
      completedAt: attempt.endTime || attempt.updatedAt, // Use endTime or updatedAt
      createdAt: attempt.createdAt || attempt.startTime, // Frontend expects this field
      timeSpent: isDynamicTest ? totalTimeSpent : (attempt.totalTimeSpent || 0),
      totalTimeSpent: isDynamicTest ? totalTimeSpent : (attempt.totalTimeSpent || 0), // Add both field names
      totalTimeLimit: (attempt.screeningTest.totalTimeLimit || 60) * 60, // Convert to seconds
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers, // Add alternative field name
      skippedQuestions: isDynamicTest ? skippedCount : (attempt.skippedQuestions || 0),
      totalScore: totalScore || 0,
      maxScore: maxScore,
      score: totalScore || 0, // Add alternative field name
      maxPoints: maxScore, // Alternative field name for compatibility
      totalPoints: maxScore, // Another alternative field name
      // Force override any potential frontend hardcoding
      questionsAttempted: totalQuestions,
      totalQuestionsAttempted: totalQuestions,
      actualTotalQuestions: totalQuestions,
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
        totalQuestions: isDynamicTest ? totalQuestions : attempt.screeningTest.questions.length, // Use actual attempted for dynamic
        originalTotalQuestions: attempt.screeningTest.questions ? attempt.screeningTest.questions.length : 60,
        settings: attempt.screeningTest.settings || {},
        isDynamic: isDynamicTest
      },
      // Include performance data
      categoryPerformance: isDynamicTest ? calculateDynamicCategoryPerformance(questionResults) : attempt.categoryPerformance,
      difficultyPerformance: isDynamicTest ? calculateDynamicDifficultyPerformance(questionResults) : attempt.difficultyPerformance,
      dynamicProgress: isDynamicTest ? attempt.dynamicDifficultyProgress : undefined,
      analytics: isDynamicTest ? calculateDynamicTestInsights(questionResults, totalTimeSpent) : {
        ...attempt.analytics,
        // Ensure all required analytics fields exist
        timeSpentPerQuestion: attempt.analytics?.timeSpentPerQuestion || 0,
        averageTimePerQuestion: attempt.analytics?.averageTimePerQuestion || 0,
        accuracyTrends: {
          firstHalf: attempt.analytics?.accuracyTrends?.firstHalf || 0,
          secondHalf: attempt.analytics?.accuracyTrends?.secondHalf || 0,
          improvementRate: attempt.analytics?.accuracyTrends?.improvementRate || 0
        },
        testStrategy: {
          averageTimePerQuestion: attempt.analytics?.testStrategy?.averageTimePerQuestion || 0,
          questionsRevisited: attempt.analytics?.testStrategy?.questionsRevisited || 0,
          answerChanges: attempt.analytics?.testStrategy?.answerChanges || 0
        },
        confidenceMetrics: {
          questionsRevisited: attempt.analytics?.confidenceMetrics?.questionsRevisited || attempt.analytics?.testStrategy?.questionsRevisited || 0,
          answerChanges: attempt.analytics?.confidenceMetrics?.answerChanges || attempt.analytics?.testStrategy?.answerChanges || 0
        },
        speedMetrics: {
          averageTimePerCategory: attempt.analytics?.speedMetrics?.averageTimePerCategory || {
            quantitative: 0, logical: 0, verbal: 0
          },
          averageTimePerDifficulty: attempt.analytics?.speedMetrics?.averageTimePerDifficulty || {
            easy: 0, medium: 0, hard: 0
          }
        }
      }
    };

    // Debug log the result data to check for NaN values
    console.log('=== RESULT DATA DEBUG ===');
    console.log('getAttemptResult called for dynamic test');
    console.log('Full result data keys:', Object.keys(resultData));
    console.log('totalScore:', resultData.totalScore);
    console.log('maxScore:', resultData.maxScore);
    console.log('maxPoints:', resultData.maxPoints);
    console.log('totalPoints:', resultData.totalPoints);
    console.log('totalQuestions:', resultData.totalQuestions);
    console.log('correctAnswers:', resultData.correctAnswers);
    console.log('isDynamicTest:', isDynamicTest);
    console.log('questionResults.length:', questionResults.length);
    console.log('screeningTest.totalQuestions:', resultData.screeningTest.totalQuestions);
    console.log('screeningTest.originalTotalQuestions:', resultData.screeningTest.originalTotalQuestions);
    console.log('resultData.analytics:', JSON.stringify(resultData.analytics, null, 2));
    console.log('resultData.percentage:', resultData.percentage);
    console.log('resultData.categoryPerformance:', JSON.stringify(resultData.categoryPerformance, null, 2));
    console.log('resultData.difficultyPerformance:', JSON.stringify(resultData.difficultyPerformance, null, 2));
    console.log('Original attempt.screeningTest questions length:', attempt.screeningTest.questions?.length);
    console.log('========================');

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

// SIMPLIFIED handler specifically for first batch (first 5 questions)
const handleFirstBatchAnswer = async (req, res, attempt, questionId, selectedAnswer, timeSpent) => {
  try {
    console.log('=== SIMPLIFIED FIRST BATCH HANDLER ===');
    
    // Get the question directly from database
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    console.log(`Question: ${question.question}`);
    console.log(`Options:`, question.options);
    console.log(`Database Correct Answer: ${question.correctAnswer}`);
    console.log(`User Selected Answer: ${selectedAnswer}`);
    
    // Direct string comparison - no complexity
    const isCorrect = selectedAnswer === question.correctAnswer;
    console.log(`Direct comparison result: ${isCorrect}`);
    
    // Get fresh attempt
    const freshAttempt = await ScreeningTestAttempt.findById(attempt._id);
    const progress = freshAttempt.dynamicDifficultyProgress;
    const currentBatch = progress.batchHistory[0]; // Always first batch
    
    // Store first batch answers in a separate field to avoid nested object issues
    if (!freshAttempt.firstBatchAnswers) {
      freshAttempt.firstBatchAnswers = {};
    }
    
    // Store as simple key-value for first batch in top-level field (plain object, not Map)
    freshAttempt.firstBatchAnswers[questionId] = {
      selectedAnswer,
      isCorrect,
      timeSpent: timeSpent || 0,
      submittedAt: new Date()
    };
    
    // Also update the batch for consistency
    if (!currentBatch.answers) {
      currentBatch.answers = {};
    }
    currentBatch.answers[questionId] = {
      selectedAnswer,
      isCorrect,
      timeSpent: timeSpent || 0,
      submittedAt: new Date()
    };
    
    // Count correct answers manually for first batch from the top-level field
    let correctCount = 0;
    for (const qId of currentBatch.questions) {
      const answer = freshAttempt.firstBatchAnswers[qId];
      if (answer && answer.isCorrect) {
        correctCount++;
      }
    }
    
    currentBatch.correctAnswers = correctCount;
    
    console.log(`Correct count for first batch: ${correctCount}`);
    console.log(`Total answered: ${Object.keys(freshAttempt.firstBatchAnswers).length}`);
    console.log(`First batch answers (plain object):`, freshAttempt.firstBatchAnswers);
    console.log('=====================================');
    
    // Mark the nested path as modified so MongoDB saves it
    freshAttempt.markModified('dynamicDifficultyProgress.batchHistory');
    freshAttempt.markModified('firstBatchAnswers');
    
    // Force save with debug
    console.log('Saving attempt with firstBatchAnswers...');
    await freshAttempt.save();
    console.log('Saved successfully!');
    
    // Verify the data was saved by re-fetching
    const verifyAttempt = await ScreeningTestAttempt.findById(freshAttempt._id);
    console.log('Verification - firstBatchAnswers after save:', verifyAttempt.firstBatchAnswers);
    console.log('Verification - total saved answers:', Object.keys(verifyAttempt.firstBatchAnswers || {}).length);

    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || null,
        totalAnswered: Object.keys(currentBatch.answers).length,
        totalQuestions: currentBatch.questions.length,
        correctAnswers: correctCount
      }
    });
    
  } catch (error) {
    console.error('First batch handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message
    });
  }
};

// Handle individual answer submission for dynamic difficulty tests
const handleDynamicAnswer = async (req, res, attempt, questionId, selectedAnswer, timeSpent) => {
  try {
    // Use simplified handler for first batch (batch number 1)
    const progress = attempt.dynamicDifficultyProgress;
    const currentBatchIndex = progress.batchHistory.length - 1;
    const currentBatch = progress.batchHistory[currentBatchIndex];
    
    if (currentBatch && currentBatch.batchNumber === 1) {
      return await handleFirstBatchAnswer(req, res, attempt, questionId, selectedAnswer, timeSpent);
    }
    
    // Original handler for subsequent batches
    // Get the correct answer
    const question = await Question.findById(questionId);
    const isCorrect = selectedAnswer === question.correctAnswer;

    // Get a fresh copy of the attempt to ensure we have the latest data
    const freshAttempt = await ScreeningTestAttempt.findById(attempt._id);
    const freshProgress = freshAttempt.dynamicDifficultyProgress;
    
    // Get current active batch
    const freshCurrentBatchIndex = freshProgress.batchHistory.length - 1;
    const freshCurrentBatch = freshProgress.batchHistory[freshCurrentBatchIndex];

    if (!currentBatch || currentBatch.completed) {
      return res.status(400).json({
        success: false,
        message: 'No active batch found. Please get the next batch.'
      });
    }

    // Check if question belongs to current batch
    const isQuestionInBatch = currentBatch.questions.some(qId => qId.toString() === questionId);
    if (!isQuestionInBatch) {
      return res.status(400).json({
        success: false,
        message: 'Question not in current batch'
      });
    }

    // Initialize answers as a plain object if it doesn't exist
    if (!currentBatch.answers || typeof currentBatch.answers !== 'object') {
      currentBatch.answers = {};
    }
    
    // Convert Map to plain object if needed
    if (currentBatch.answers instanceof Map) {
      currentBatch.answers = Object.fromEntries(currentBatch.answers);
    }
    
    // Store the answer (use plain object for MongoDB compatibility)
    const answerData = {
      selectedAnswer,
      isCorrect,
      timeSpent: timeSpent || 0,
      submittedAt: new Date()
    };
    
    console.log(`=== INDIVIDUAL ANSWER SUBMISSION ===`);
    console.log(`Question ID: ${questionId}`);
    console.log(`Selected Answer: ${selectedAnswer}`);
    console.log(`Correct Answer: ${question.correctAnswer}`);
    console.log(`Is Correct: ${isCorrect}`);
    console.log(`Batch Number: ${currentBatch.batchNumber}`);
    console.log(`Answer Data:`, answerData);
    
    // Use MongoDB $set operation to directly update the nested field
    const updatePath = `dynamicDifficultyProgress.batchHistory.${currentBatchIndex}.answers.${questionId}`;
    const correctAnswersPath = `dynamicDifficultyProgress.batchHistory.${currentBatchIndex}.correctAnswers`;
    
    console.log('=== DIRECT MONGODB UPDATE ===');
    console.log('Update path:', updatePath);
    console.log('Answer data:', answerData);
    console.log('==============================');
    
    // Update the specific answer and recalculate correct count
    await ScreeningTestAttempt.updateOne(
      { _id: freshAttempt._id },
      { 
        $set: { 
          [updatePath]: answerData
        }
      }
    );
    
    // Get the updated batch to recalculate correct answers
    const updatedAttempt = await ScreeningTestAttempt.findById(freshAttempt._id);
    const updatedBatch = updatedAttempt.dynamicDifficultyProgress.batchHistory[currentBatchIndex];
    const answersArray = Object.values(updatedBatch.answers || {});
    const correctCount = answersArray.filter(a => a.isCorrect).length;
    
    // Update the correct count
    await ScreeningTestAttempt.updateOne(
      { _id: freshAttempt._id },
      { 
        $set: { 
          [correctAnswersPath]: correctCount
        }
      }
    );
    
    // Verify the save worked - reload and check
    const verifyAttempt = await ScreeningTestAttempt.findById(freshAttempt._id);
    const verifyBatch = verifyAttempt.dynamicDifficultyProgress.batchHistory[currentBatchIndex];
    console.log('=== SAVE VERIFICATION ===');
    console.log('Batch index:', currentBatchIndex);
    console.log('Saved answers:', verifyBatch.answers);
    console.log('Answer count after save:', Object.keys(verifyBatch.answers || {}).length);
    console.log('========================');

    // Debug logging for answer submission (remove this in production)
    console.log('=== ANSWER SUBMISSION DEBUG ===');
    console.log('Question ID:', questionId);
    console.log('Selected Answer:', selectedAnswer);
    console.log('Is Correct:', isCorrect);
    console.log('Batch answers after update:', currentBatch.answers);
    console.log('Answers as Object:', currentBatch.answers);
    console.log('Total answers in batch:', Object.keys(currentBatch.answers).length);
    console.log('==============================');

    res.json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        questionId,
        isCorrect,
        currentBatch: {
          category: currentBatch.category,
          difficulty: currentBatch.difficulty,
          answeredQuestions: Object.keys(currentBatch.answers).length,
          totalQuestions: currentBatch.totalQuestions,
          correctAnswers: correctCount
        }
      }
    });
  } catch (error) {
    console.error('Handle dynamic answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
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

    // Handle dynamic difficulty tests differently
    if (attempt.dynamicDifficultyProgress && attempt.dynamicDifficultyProgress.enabled) {
      return handleDynamicAnswer(req, res, attempt, questionId, selectedAnswer, timeSpent);
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

    // Check if this is a dynamic difficulty test and process accordingly
    const isDynamicTest = attempt.dynamicDifficultyProgress && attempt.dynamicDifficultyProgress.enabled;
    
    if (isDynamicTest) {
      // For dynamic tests, calculate actual attempted questions and adjust data
      let totalAttempted = 0;
      let totalCorrect = 0;
      let totalTimeSpent = 0;
      
      // Count from first batch answers
      if (attempt.firstBatchAnswers) {
        const firstBatchCount = Object.keys(attempt.firstBatchAnswers).length;
        totalAttempted += firstBatchCount;
        
        Object.values(attempt.firstBatchAnswers).forEach(answer => {
          if (answer.isCorrect) totalCorrect++;
          totalTimeSpent += answer.timeSpent || 0;
        });
      }
      
      // Count from regular batches (excluding first batch)
      if (attempt.dynamicDifficultyProgress.batchHistory) {
        for (let i = 1; i < attempt.dynamicDifficultyProgress.batchHistory.length; i++) {
          const batch = attempt.dynamicDifficultyProgress.batchHistory[i];
          if (batch.answers) {
            const answers = Object.values(batch.answers);
            totalAttempted += answers.length;
            
            answers.forEach(answer => {
              if (answer.isCorrect) totalCorrect++;
              totalTimeSpent += answer.timeSpent || 0;
            });
          }
        }
      }
      
      // Build question results for analytics calculation
      const questionResults = [];
      
      // Add first batch questions
      if (attempt.firstBatchAnswers) {
        const firstBatchQuestionIds = Object.keys(attempt.firstBatchAnswers);
        const firstBatchQuestions = await Question.find({ _id: { $in: firstBatchQuestionIds } });
        
        firstBatchQuestions.forEach(question => {
          const answer = attempt.firstBatchAnswers[question._id.toString()];
          if (answer) {
            questionResults.push({
              questionId: question._id,
              question: question.question,
              category: question.category,
              difficulty: question.difficulty,
              isCorrect: answer.isCorrect,
              timeSpent: answer.timeSpent || 0,
              userAnswer: answer.selectedAnswer
            });
          }
        });
      }
      
      // Add regular batch questions
      if (attempt.dynamicDifficultyProgress.batchHistory) {
        for (let i = 1; i < attempt.dynamicDifficultyProgress.batchHistory.length; i++) {
          const batch = attempt.dynamicDifficultyProgress.batchHistory[i];
          if (batch.answers && batch.questions) {
            const batchQuestions = await Question.find({ _id: { $in: batch.questions } });
            
            batchQuestions.forEach(question => {
              const answer = batch.answers[question._id.toString()];
              if (answer) {
                questionResults.push({
                  questionId: question._id,
                  question: question.question,
                  category: question.category,
                  difficulty: question.difficulty,
                  isCorrect: answer.isCorrect,
                  timeSpent: answer.timeSpent || 0,
                  userAnswer: answer.selectedAnswer
                });
              }
            });
          }
        }
      }
      
      // Calculate analytics using the same function
      const analytics = calculateDynamicTestInsights(questionResults, totalTimeSpent);
      
      // Override the screening test data with actual attempted values
      const processedAttempt = {
        ...attempt.toObject(),
        totalQuestions: totalAttempted,
        totalScore: totalCorrect,
        maxScore: totalAttempted,
        totalTimeSpent: totalTimeSpent,
        analytics: analytics, // Add proper analytics
        screeningTest: {
          ...attempt.screeningTest.toObject(),
          totalQuestions: totalAttempted,
          originalTotalQuestions: attempt.screeningTest.questions?.length || 60
        }
      };
      
      console.log('=== ANALYTICS API DEBUG ===');
      console.log('getAttemptAnalytics called for dynamic test');
      console.log('totalAttempted:', totalAttempted);
      console.log('totalCorrect:', totalCorrect);
      console.log('totalTimeSpent:', totalTimeSpent);
      console.log('questionResults.length:', questionResults.length);
      console.log('analytics calculated:', JSON.stringify(analytics, null, 2));
      console.log('============================');
      
      return res.json({
        success: true,
        data: processedAttempt
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

// Dynamic Difficulty Functions

// Get next batch of questions for dynamic difficulty
const getNextDynamicBatch = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate('screeningTest')
      .populate('student', 'name email');

    if (!attempt || attempt.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!attempt.dynamicDifficultyProgress.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Dynamic difficulty is not enabled for this test'
      });
    }

    // Get current progress
    const progress = attempt.dynamicDifficultyProgress;
    const config = attempt.screeningTest.settings.dynamicConfig;

    // Check if test is complete
    if (progress.isComplete) {
      return res.json({
        success: true,
        data: {
          isComplete: true,
          message: 'Dynamic difficulty test completed'
        }
      });
    }

    // Get questions for current batch, excluding already used questions
    const usedQuestionIds = progress.usedQuestions || [];
    const questions = await getQuestionsForBatch(
      progress.currentCategory,
      progress.currentDifficulty,
      config.questionsPerBatch,
      usedQuestionIds
    );

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No more questions available for current difficulty level'
      });
    }

    // Track new questions as used
    const newQuestionIds = questions.map(q => q._id);
    progress.usedQuestions = [...usedQuestionIds, ...newQuestionIds];

    // Create new batch record
    const newBatch = {
      category: progress.currentCategory,
      difficulty: progress.currentDifficulty,
      batchNumber: progress.currentBatch,
      questions: newQuestionIds,
      correctAnswers: 0,
      totalQuestions: questions.length,
      completed: false,
      answers: {}
    };

    progress.batchHistory.push(newBatch);
    await attempt.save();

    res.json({
      success: true,
      data: {
        questions,
        batchInfo: {
          category: progress.currentCategory,
          difficulty: progress.currentDifficulty,
          batchNumber: progress.currentBatch,
          questionsCount: questions.length
        },
        progress: {
          currentCategory: progress.currentCategory,
          currentDifficulty: progress.currentDifficulty,
          categoryProgress: progress.categoryProgress
        }
      }
    });
  } catch (error) {
    console.error('Get next dynamic batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next batch',
      error: error.message
    });
  }
};

// Submit answers for current batch and determine next difficulty
const submitDynamicBatch = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body; // { questionId: selectedAnswer }

    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate('screeningTest');

    if (!attempt || attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const progress = attempt.dynamicDifficultyProgress;
    const config = attempt.screeningTest.settings.dynamicConfig;
    
    // Get current batch
    const currentBatchIndex = progress.batchHistory.length - 1;
    const currentBatch = progress.batchHistory[currentBatchIndex];

    if (!currentBatch || currentBatch.completed) {
      return res.status(400).json({
        success: false,
        message: 'No active batch found'
      });
    }

    // Calculate correct answers
    let correctAnswers = 0;
    const questionResults = [];

    // Debug logging
    console.log('=== BATCH COMPLETION DEBUG ===');
    console.log('Batch number:', currentBatch.batchNumber);
    console.log('Submitted answers from req.body:', answers);
    console.log('Current batch answers before processing:', currentBatch.answers);
    console.log('Current batch answers type:', typeof currentBatch.answers);
    console.log('Is Map?', currentBatch.answers instanceof Map);
    
    // Use simplified logic for first batch
    console.log('Checking batch number:', currentBatch.batchNumber, 'Type:', typeof currentBatch.batchNumber);
    console.log('Comparison result:', currentBatch.batchNumber === 1);
    console.log('Loose comparison result:', currentBatch.batchNumber == 1);
    
    if (currentBatch.batchNumber == 1) {
      console.log('=== USING SIMPLIFIED FIRST BATCH COMPLETION ===');
      console.log('First batch answers from currentBatch:', currentBatch.answers);
      console.log('First batch answers from top-level field:', attempt.firstBatchAnswers);
      
      // For first batch, read answers from the top-level field
      const firstBatchAnswers = attempt.firstBatchAnswers || {};
      let correctAnswers = 0;
      const questionResults = [];
      
      for (const questionId of currentBatch.questions) {
        const question = await Question.findById(questionId);
        const storedAnswer = firstBatchAnswers[questionId];
        
        if (storedAnswer) {
          const userAnswer = storedAnswer.selectedAnswer;
          const isCorrect = storedAnswer.isCorrect;
          
          if (isCorrect) correctAnswers++;
          
          questionResults.push({
            questionId,
            userAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect
          });
          
          console.log(`Question ${questionId}: ${userAnswer} vs ${question.correctAnswer} = ${isCorrect}`);
        } else {
          console.log(`No stored answer found for question ${questionId}`);
        }
      }
      
      console.log(`First batch final correct count: ${correctAnswers}`);
      
      // Mark batch as completed
      currentBatch.completed = true;
      currentBatch.completedAt = new Date();
      currentBatch.correctAnswers = correctAnswers;
      
      await attempt.save();
      
        // Continue with difficulty progression logic same as before
      const nextDifficulty = determineNextDifficulty(currentBatch.difficulty, correctAnswers, currentBatch.totalQuestions);
      
      console.log('=== DIFFICULTY PROGRESSION DEBUG ===');
      console.log('Current difficulty:', currentBatch.difficulty);
      console.log('Correct answers:', correctAnswers);
      console.log('Total questions:', currentBatch.totalQuestions);
      console.log('Pass threshold:', 4);
      console.log('Fail threshold:', 2);
      console.log('Next difficulty:', nextDifficulty);
      console.log('====================================');
      
      const progress = attempt.dynamicDifficultyProgress;
      progress.categoryProgress[progress.currentCategory].currentDifficulty = nextDifficulty;
      
      if (nextDifficulty !== currentBatch.difficulty) {
        if (!progress.categoryProgress[progress.currentCategory].completedDifficulties.includes(currentBatch.difficulty)) {
          progress.categoryProgress[progress.currentCategory].completedDifficulties.push(currentBatch.difficulty);
        }
        progress.categoryProgress[progress.currentCategory].highestReached = 
          getDifficultyLevel(nextDifficulty) > getDifficultyLevel(progress.categoryProgress[progress.currentCategory].highestReached) 
            ? nextDifficulty 
            : progress.categoryProgress[progress.currentCategory].highestReached;
      }
      
      const isCategoryComplete = checkCategoryComplete(progress.currentCategory, progress.batchHistory);
      
      if (isCategoryComplete) {
        progress.categoryProgress[progress.currentCategory].completedDifficulties = ['easy', 'medium', 'hard'];
        
        const nextCategory = getNextCategory(progress.currentCategory);
        if (nextCategory) {
          progress.currentCategory = nextCategory;
          progress.currentDifficulty = 'easy';
        } else {
          progress.isComplete = true;
        }
      } else {
        progress.currentDifficulty = nextDifficulty;
      }

      progress.currentBatch += 1;
      await attempt.save();

      return res.json({
        success: true,
        data: {
          batchResults: {
            correctAnswers,
            totalQuestions: currentBatch.questions.length,
            percentage: (correctAnswers / currentBatch.questions.length) * 100,
            nextDifficulty
          },
          questionResults,
          progress: {
            currentCategory: progress.currentCategory,
            currentDifficulty: progress.currentDifficulty,
            isComplete: progress.isComplete,
            categoryProgress: progress.categoryProgress
          }
        }
      });
    }

    // Convert answers object to Map for storage if it's not already a Map
    if (!(currentBatch.answers instanceof Map)) {
      if (!currentBatch.answers) {
        currentBatch.answers = new Map();
      } else {
        // Convert plain object to Map
        const answersMap = new Map();
        for (const [key, value] of Object.entries(currentBatch.answers)) {
          answersMap.set(key, value);
        }
        currentBatch.answers = answersMap;
      }
    }

    // Store the submitted answers in the batch (only if not already stored from individual submissions)
    for (const [questionId, answer] of Object.entries(answers)) {
      if (!currentBatch.answers[questionId]) {
        // Store as simple answer if not already stored by handleDynamicAnswer
        currentBatch.answers[questionId] = answer;
      }
    }

    for (const questionId of currentBatch.questions) {
      const question = await Question.findById(questionId);
      
      // Check if answer was stored by handleDynamicAnswer (complex object) or batch submission (simple string)
      const storedAnswer = currentBatch.answers[questionId.toString()];
      let userAnswer, isCorrect;
      
      if (storedAnswer && typeof storedAnswer === 'object' && storedAnswer.selectedAnswer !== undefined) {
        // Answer was stored by handleDynamicAnswer
        userAnswer = storedAnswer.selectedAnswer;
        isCorrect = storedAnswer.isCorrect;
        console.log(`Question ${questionId}: Using stored complex answer -`, storedAnswer);
      } else {
        // Answer was stored by batch submission or needs to be calculated
        userAnswer = storedAnswer || answers[questionId.toString()];
        isCorrect = userAnswer === question.correctAnswer;
        console.log(`Question ${questionId}: Using simple answer - userAnswer:${userAnswer}, correct:${question.correctAnswer}, isCorrect:${isCorrect}`);
      }
      
      if (isCorrect) correctAnswers++;
      
      questionResults.push({
        questionId,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect
      });

      // Save individual question attempt
      const questionAttempt = {
        question: questionId,
        selectedAnswer: userAnswer,
        isCorrect,
        timeSpent: 30, // Default time, can be tracked more precisely
        pointsEarned: isCorrect ? 1 : 0,
        maxPoints: 1,
        visitCount: 1,
        firstVisitTime: new Date(),
        lastVisitTime: new Date(),
        answerChanges: []
      };
      
      attempt.questionAttempts.push(questionAttempt);
    }

    // Update current batch
    currentBatch.correctAnswers = correctAnswers;
    currentBatch.completed = true;

    // Determine next difficulty
    const nextDifficulty = determineNextDifficulty(
      progress.currentDifficulty,
      correctAnswers,
      currentBatch.totalQuestions,
      config.passThreshold,
      config.failThreshold
    );

    currentBatch.nextDifficulty = nextDifficulty;

    // Update progress
    progress.categoryProgress[progress.currentCategory].currentDifficulty = nextDifficulty;
    
    // Update highest reached difficulty
    const difficultyLevels = ['easy', 'medium', 'hard'];
    const currentHighest = progress.categoryProgress[progress.currentCategory].highestReached;
    const currentHighestIndex = difficultyLevels.indexOf(currentHighest);
    const nextDifficultyIndex = difficultyLevels.indexOf(nextDifficulty);
    
    if (nextDifficultyIndex > currentHighestIndex) {
      progress.categoryProgress[progress.currentCategory].highestReached = nextDifficulty;
    }

    // Check if category is complete (completed hard difficulty)
    const isCategoryComplete = checkCategoryComplete(progress.currentCategory, progress.batchHistory);
    
    if (isCategoryComplete) {
      progress.categoryProgress[progress.currentCategory].completedDifficulties = ['easy', 'medium', 'hard'];
      
      // Move to next category
      const nextCategory = getNextCategory(progress.currentCategory);
      if (nextCategory) {
        progress.currentCategory = nextCategory;
        progress.currentDifficulty = 'easy';
      } else {
        // All categories completed
        progress.isComplete = true;
      }
    } else {
      progress.currentDifficulty = nextDifficulty;
    }

    progress.currentBatch += 1;
    await attempt.save();

    res.json({
      success: true,
      data: {
        batchResults: {
          correctAnswers,
          totalQuestions: currentBatch.questions.length,
          percentage: (correctAnswers / currentBatch.questions.length) * 100,
          nextDifficulty
        },
        questionResults,
        progress: {
          currentCategory: progress.currentCategory,
          currentDifficulty: progress.currentDifficulty,
          isComplete: progress.isComplete,
          categoryProgress: progress.categoryProgress
        }
      }
    });
  } catch (error) {
    console.error('Submit dynamic batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit batch',
      error: error.message
    });
  }
};

// Get dynamic difficulty progress
const getDynamicProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate('student', 'name email');

    if (!attempt || attempt.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        progress: attempt.dynamicDifficultyProgress,
        analytics: calculateDynamicAnalytics(attempt.dynamicDifficultyProgress)
      }
    });
  } catch (error) {
    console.error('Get dynamic progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get progress',
      error: error.message
    });
  }
};

// Complete current batch and get next batch
const completeDynamicBatch = async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Fetch the latest attempt data to ensure we have the most up-to-date batch answers
    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate('screeningTest');

    if (!attempt || attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const progress = attempt.dynamicDifficultyProgress;
    const config = attempt.screeningTest.settings.dynamicConfig;
    
    // Get current batch
    const currentBatchIndex = progress.batchHistory.length - 1;
    const currentBatch = progress.batchHistory[currentBatchIndex];

    if (!currentBatch) {
      return res.status(400).json({
        success: false,
        message: 'No active batch found'
      });
    }

    if (currentBatch.completed) {
      return res.status(400).json({
        success: false,
        message: 'Current batch already completed'
      });
    }

    // Ensure answers is a plain object
    if (!currentBatch.answers || typeof currentBatch.answers !== 'object') {
      currentBatch.answers = {};
    }
    
    // Convert Map to plain object if needed
    if (currentBatch.answers instanceof Map) {
      currentBatch.answers = Object.fromEntries(currentBatch.answers);
    }
    
    // Check if all questions in current batch have been answered
    const totalAnswered = Object.keys(currentBatch.answers).length;
    
    // Recalculate correct answers to ensure accuracy
    const answersArray = Object.values(currentBatch.answers);
    const correctCount = answersArray.filter(a => a.isCorrect).length;
    currentBatch.correctAnswers = correctCount;
    
    // Debug logging (remove this in production)
    console.log('=== COMPLETE BATCH DEBUG ===');
    console.log('Attempt ID:', attemptId);
    console.log('Current batch index:', currentBatchIndex);
    console.log('Total batches:', progress.batchHistory.length);
    console.log('Current batch data:', JSON.stringify(currentBatch, null, 2));
    console.log('Answers Object:', currentBatch.answers);
    console.log('Answers as Object:', currentBatch.answers || {});
    console.log('Total answered:', totalAnswered);
    console.log('Total questions:', currentBatch.totalQuestions);
    console.log('Recalculated correct answers:', correctCount);
    console.log('============================');
    
    // Use simplified logic for first batch
    console.log('Checking batch number:', currentBatch.batchNumber, 'Type:', typeof currentBatch.batchNumber);
    
    if (currentBatch.batchNumber == 1) {
      console.log('=== USING SIMPLIFIED FIRST BATCH COMPLETION ===');
      
      // For first batch, read answers from the top-level field
      const firstBatchAnswers = attempt.firstBatchAnswers || {};
      const totalFirstBatchAnswered = Object.keys(firstBatchAnswers).length;
      
      console.log('First batch answers from top-level field:', firstBatchAnswers);
      console.log('Total first batch answered:', totalFirstBatchAnswered);
      
      if (totalFirstBatchAnswered < currentBatch.totalQuestions) {
        return res.status(400).json({
          success: false,
          message: `Please answer all questions. ${totalFirstBatchAnswered}/${currentBatch.totalQuestions} answered.`
        });
      }
      
      let correctAnswers = 0;
      const questionResults = [];
      
      for (const questionId of currentBatch.questions) {
        const question = await Question.findById(questionId);
        const storedAnswer = firstBatchAnswers[questionId];
        
        if (storedAnswer) {
          const userAnswer = storedAnswer.selectedAnswer;
          const isCorrect = storedAnswer.isCorrect;
          
          if (isCorrect) correctAnswers++;
          
          questionResults.push({
            questionId,
            userAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect
          });
          
          console.log(`Question ${questionId}: ${userAnswer} vs ${question.correctAnswer} = ${isCorrect}`);
        }
      }
      
      console.log(`First batch final correct count: ${correctAnswers}`);
      
      // Mark batch as completed
      currentBatch.completed = true;
      currentBatch.completedAt = new Date();
      currentBatch.correctAnswers = correctAnswers;
      
      await attempt.save();
      
      console.log('=== STARTING DIFFICULTY PROGRESSION ===');
      
      // Handle difficulty progression for first batch
      const passThreshold = 4; // Need 4 out of 5 correct to advance
      const failThreshold = 2; // Need 2 or fewer to decrease difficulty
      const nextDifficulty = determineNextDifficulty(currentBatch.difficulty, correctAnswers, currentBatch.totalQuestions, passThreshold, failThreshold);
      console.log('Next difficulty determined:', nextDifficulty, 'with', correctAnswers, 'correct out of', currentBatch.totalQuestions);
      
      const progress = attempt.dynamicDifficultyProgress;
      progress.categoryProgress[progress.currentCategory].currentDifficulty = nextDifficulty;
      
      if (nextDifficulty !== currentBatch.difficulty) {
        if (!progress.categoryProgress[progress.currentCategory].completedDifficulties.includes(currentBatch.difficulty)) {
          progress.categoryProgress[progress.currentCategory].completedDifficulties.push(currentBatch.difficulty);
        }
        console.log('Updating highest reached...');
        progress.categoryProgress[progress.currentCategory].highestReached = 
          getDifficultyLevel(nextDifficulty) > getDifficultyLevel(progress.categoryProgress[progress.currentCategory].highestReached) 
            ? nextDifficulty 
            : progress.categoryProgress[progress.currentCategory].highestReached;
      }
      
      console.log('Checking category completion...');
      const isCategoryComplete = checkCategoryComplete(progress.currentCategory, progress.batchHistory);
      console.log('Category complete:', isCategoryComplete);
      
      if (isCategoryComplete) {
        progress.categoryProgress[progress.currentCategory].completedDifficulties = ['easy', 'medium', 'hard'];
        
        const nextCategory = getNextCategory(progress.currentCategory);
        if (nextCategory) {
          progress.currentCategory = nextCategory;
          progress.currentDifficulty = 'easy';
        } else {
          progress.isComplete = true;
        }
      } else {
        progress.currentDifficulty = nextDifficulty;
      }

      progress.currentBatch += 1;
      console.log('Progress updated, saving...');
      await attempt.save();
      console.log('=== DIFFICULTY PROGRESSION COMPLETE ===');

      console.log('=== SENDING FIRST BATCH RESPONSE ===');
      
      // Check if test is complete
      if (progress.isComplete) {
        return res.json({
          success: true,
          data: {
            testCompleted: true,
            batchResults: {
              correctAnswers,
              totalQuestions: currentBatch.totalQuestions,
              percentage: (correctAnswers / currentBatch.totalQuestions) * 100,
              nextDifficulty
            },
            questionResults,
            progress: {
              currentCategory: progress.currentCategory,
              currentDifficulty: progress.currentDifficulty,
              isComplete: progress.isComplete,
              categoryProgress: progress.categoryProgress
            }
          }
        });
      }
      
      // Get next batch of questions for continued testing
      const usedQuestionIds = progress.usedQuestions || [];
      const nextBatchQuestions = await getQuestionsForBatch(
        progress.currentCategory,
        progress.currentDifficulty,
        5, // questionsPerBatch
        usedQuestionIds
      );

      if (nextBatchQuestions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No more questions available for next difficulty level'
        });
      }

      // Track new questions as used
      const newQuestionIds = nextBatchQuestions.map(q => q._id);
      progress.usedQuestions = [...usedQuestionIds, ...newQuestionIds];

      // Create new batch record
      const newBatch = {
        category: progress.currentCategory,
        difficulty: progress.currentDifficulty,
        batchNumber: progress.currentBatch,
        questions: newQuestionIds,
        correctAnswers: 0,
        totalQuestions: nextBatchQuestions.length,
        completed: false,
        answers: {}
      };

      progress.batchHistory.push(newBatch);
      await attempt.save();

      const responseData = {
        success: true,
        data: {
          testCompleted: false,
          batchResults: {
            correctAnswers,
            totalQuestions: currentBatch.totalQuestions,
            percentage: (correctAnswers / currentBatch.totalQuestions) * 100,
            nextDifficulty
          },
          nextBatch: {
            questions: nextBatchQuestions.map(q => ({
              _id: q._id,
              question: q.question,
              options: q.options,
              category: q.category,
              difficulty: q.difficulty,
              timeLimit: q.timeLimit || 60,
              points: q.points || 1
            })),
            batchInfo: {
              category: progress.currentCategory,
              difficulty: progress.currentDifficulty,
              batchNumber: progress.currentBatch,
              questionsCount: nextBatchQuestions.length,
              answeredQuestions: 0
            }
          },
          progress: {
            currentCategory: progress.currentCategory,
            currentDifficulty: progress.currentDifficulty,
            isComplete: progress.isComplete,
            categoryProgress: progress.categoryProgress
          }
        }
      };
      console.log('Response data:', JSON.stringify(responseData, null, 2));
      
      return res.json(responseData);
    }
    
    if (totalAnswered < currentBatch.totalQuestions) {
      return res.status(400).json({
        success: false,
        message: `Please answer all questions. ${totalAnswered}/${currentBatch.totalQuestions} answered.`
      });
    }

    // Mark current batch as completed
    currentBatch.completed = true;
    const correctAnswers = correctCount; // Use recalculated value

    // Debug logging for difficulty progression
    console.log('=== DIFFICULTY PROGRESSION DEBUG ===');
    console.log('Current difficulty:', progress.currentDifficulty);
    console.log('Correct answers:', correctAnswers);
    console.log('Total questions:', currentBatch.totalQuestions);
    console.log('Pass threshold:', config.passThreshold);
    console.log('Fail threshold:', config.failThreshold);

    // Determine next difficulty
    const nextDifficulty = determineNextDifficulty(
      progress.currentDifficulty,
      correctAnswers,
      currentBatch.totalQuestions,
      config.passThreshold,
      config.failThreshold
    );

    console.log('Next difficulty:', nextDifficulty);
    console.log('====================================');

    // Update category progress
    const categoryProgress = progress.categoryProgress[progress.currentCategory];
    categoryProgress.currentDifficulty = nextDifficulty;
    
    if (!categoryProgress.completedDifficulties.includes(progress.currentDifficulty)) {
      categoryProgress.completedDifficulties.push(progress.currentDifficulty);
    }
    
    if (getDifficultyLevel(nextDifficulty) > getDifficultyLevel(categoryProgress.highestReached)) {
      categoryProgress.highestReached = nextDifficulty;
    }

    // Check if category is completed (all difficulties completed or back to easy after hard)
    const isCategoryComplete = checkCategoryCompletion(categoryProgress, nextDifficulty);
    
    if (isCategoryComplete) {
      // Move to next category
      const nextCategory = getNextCategory(progress.currentCategory);
      if (nextCategory) {
        progress.currentCategory = nextCategory;
        progress.currentDifficulty = 'easy';
      } else {
        // All categories completed
        progress.isComplete = true;
        await attempt.save();
        
        return res.json({
          success: true,
          data: {
            batchCompleted: true,
            testCompleted: true,
            message: 'Dynamic difficulty test completed!',
            finalProgress: progress
          }
        });
      }
    } else {
      progress.currentDifficulty = nextDifficulty;
    }

    // Increment batch number
    progress.currentBatch += 1;

    await attempt.save();

    // Get next batch of questions, excluding already used questions
    const usedQuestionIds = progress.usedQuestions || [];
    const nextBatchQuestions = await getQuestionsForBatch(
      progress.currentCategory,
      progress.currentDifficulty,
      config.questionsPerBatch,
      usedQuestionIds
    );

    if (nextBatchQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No more questions available for next difficulty level'
      });
    }

    // Track new questions as used
    const newQuestionIds = nextBatchQuestions.map(q => q._id);
    progress.usedQuestions = [...usedQuestionIds, ...newQuestionIds];

    // Create new batch record
    const newBatch = {
      category: progress.currentCategory,
      difficulty: progress.currentDifficulty,
      batchNumber: progress.currentBatch,
      questions: newQuestionIds,
      correctAnswers: 0,
      totalQuestions: nextBatchQuestions.length,
      completed: false,
      answers: {}
    };

    progress.batchHistory.push(newBatch);
    await attempt.save();

    res.json({
      success: true,
      data: {
        batchCompleted: true,
        testCompleted: false,
        previousBatch: {
          category: currentBatch.category,
          difficulty: currentBatch.difficulty,
          correctAnswers: correctAnswers,
          totalQuestions: currentBatch.totalQuestions
        },
        nextBatch: {
          questions: nextBatchQuestions.map(q => ({
            _id: q._id,
            question: q.question,
            options: q.options,
            category: q.category,
            difficulty: q.difficulty,
            timeLimit: q.timeLimit || 60
          })),
          batchInfo: {
            category: progress.currentCategory,
            difficulty: progress.currentDifficulty,
            batchNumber: progress.currentBatch,
            questionsCount: nextBatchQuestions.length
          }
        },
        progress: {
          currentCategory: progress.currentCategory,
          currentDifficulty: progress.currentDifficulty,
          categoryProgress: progress.categoryProgress
        }
      }
    });
  } catch (error) {
    console.error('Complete dynamic batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete batch',
      error: error.message
    });
  }
};

// Helper functions

const getQuestionsForBatch = async (category, difficulty, count, usedQuestionIds = []) => {
  const categoryName = getCategoryName(category);
  
  // Get questions sequentially (not randomly) to avoid repetition
  return await Question.find({ 
    category: categoryName, 
    difficulty,
    _id: { $nin: usedQuestionIds } // Exclude already used questions
  })
  .sort({ _id: 1 }) // Sequential order by MongoDB ObjectId
  .limit(count);
};

const determineNextDifficulty = (currentDifficulty, correctAnswers, totalQuestions, passThreshold, failThreshold) => {
  if (correctAnswers >= passThreshold) {
    // Advance difficulty
    if (currentDifficulty === 'easy') return 'medium';
    if (currentDifficulty === 'medium') return 'hard';
    return 'hard'; // Stay at hard if already there
  } else if (correctAnswers <= failThreshold) {
    // Decrease difficulty
    if (currentDifficulty === 'hard') return 'medium';
    if (currentDifficulty === 'medium') return 'easy';
    return 'easy'; // Stay at easy if already there
  } else {
    // Stay at current difficulty
    return currentDifficulty;
  }
};

const checkCategoryComplete = (category, batchHistory) => {
  // Check if we've completed at least one hard difficulty batch
  return batchHistory.some(batch => 
    batch.category === category && 
    batch.difficulty === 'hard' && 
    batch.completed
  );
};

const getDifficultyLevel = (difficulty) => {
  const levels = { 'easy': 1, 'medium': 2, 'hard': 3 };
  return levels[difficulty] || 1;
};

const checkCategoryCompletion = (categoryProgress, nextDifficulty) => {
  // A category is complete if we've reached hard difficulty and completed it,
  // or if we're going back to easy after being at a higher level
  const completedDifficulties = categoryProgress.completedDifficulties || [];
  const highestReached = categoryProgress.highestReached || 'easy';
  
  // If we've completed hard difficulty, category is done
  if (completedDifficulties.includes('hard')) {
    return true;
  }
  
  // If we reached medium/hard but are going back to easy, category might be complete
  if (getDifficultyLevel(highestReached) > 1 && nextDifficulty === 'easy') {
    return true;
  }
  
  return false;
};

const getNextCategory = (currentCategory) => {
  const categories = ['quantitative', 'logical', 'verbal'];
  const currentIndex = categories.indexOf(currentCategory);
  return currentIndex < categories.length - 1 ? categories[currentIndex + 1] : null;
};

// Map database category names to standard format
const mapCategory = (category) => {
  const categoryMap = {
    'Quantitative Aptitude': 'quantitative',
    'Logical Reasoning': 'logical', 
    'Verbal Reasoning': 'verbal',
    'quantitative': 'quantitative',
    'logical': 'logical',
    'verbal': 'verbal'
  };
  return categoryMap[category] || category.toLowerCase();
};



const calculateDynamicCategoryPerformance = (questionResults) => {
  const categoryPerformance = {
    quantitative: { total: 0, correct: 0, wrong: 0, skipped: 0, averageTime: 0, accuracy: 0, score: 0 },
    logical: { total: 0, correct: 0, wrong: 0, skipped: 0, averageTime: 0, accuracy: 0, score: 0 },
    verbal: { total: 0, correct: 0, wrong: 0, skipped: 0, averageTime: 0, accuracy: 0, score: 0 }
  };

  questionResults.forEach(result => {
    const category = mapCategory(result.category);
    if (categoryPerformance[category]) {
      categoryPerformance[category].total++;
      if (result.isCorrect) {
        categoryPerformance[category].correct++;
        categoryPerformance[category].score += result.points;
      } else {
        categoryPerformance[category].wrong++;
      }
      categoryPerformance[category].averageTime += result.timeSpent || 0;
    }
  });

  // Calculate averages and accuracy
  Object.keys(categoryPerformance).forEach(category => {
    const perf = categoryPerformance[category];
    if (perf.total > 0) {
      const accuracy = (perf.correct / perf.total) * 100;
      const averageTime = perf.averageTime / perf.total;
      
      perf.accuracy = isNaN(accuracy) ? 0 : Math.round(accuracy);
      perf.averageTime = isNaN(averageTime) ? 0 : Math.round(averageTime);
    } else {
      // Ensure all fields are 0, not undefined
      perf.accuracy = 0;
      perf.averageTime = 0;
    }
  });

  return categoryPerformance;
};

// Map database difficulty names to standard format
const mapDifficulty = (difficulty) => {
  const difficultyMap = {
    'easy': 'easy',
    'medium': 'medium', 
    'hard': 'hard',
    'Easy': 'easy',
    'Medium': 'medium',
    'Hard': 'hard'
  };
  return difficultyMap[difficulty] || difficulty.toLowerCase();
};

const calculateDynamicDifficultyPerformance = (questionResults) => {
  const difficultyPerformance = {
    easy: { total: 0, correct: 0, wrong: 0, skipped: 0, averageTime: 0, accuracy: 0, score: 0 },
    medium: { total: 0, correct: 0, wrong: 0, skipped: 0, averageTime: 0, accuracy: 0, score: 0 },
    hard: { total: 0, correct: 0, wrong: 0, skipped: 0, averageTime: 0, accuracy: 0, score: 0 }
  };

  questionResults.forEach(result => {
    const difficulty = mapDifficulty(result.difficulty);
    if (difficultyPerformance[difficulty]) {
      difficultyPerformance[difficulty].total++;
      if (result.isCorrect) {
        difficultyPerformance[difficulty].correct++;
        difficultyPerformance[difficulty].score += result.points;
      } else {
        difficultyPerformance[difficulty].wrong++;
      }
      difficultyPerformance[difficulty].averageTime += result.timeSpent || 0;
    }
  });

  // Calculate averages and accuracy
  Object.keys(difficultyPerformance).forEach(difficulty => {
    const perf = difficultyPerformance[difficulty];
    if (perf.total > 0) {
      const accuracy = (perf.correct / perf.total) * 100;
      const averageTime = perf.averageTime / perf.total;
      
      perf.accuracy = isNaN(accuracy) ? 0 : Math.round(accuracy);
      perf.averageTime = isNaN(averageTime) ? 0 : Math.round(averageTime);
    } else {
      // Ensure all fields are 0, not undefined
      perf.accuracy = 0;
      perf.averageTime = 0;
    }
  });

  return difficultyPerformance;
};

const calculateDynamicTestInsights = (questionResults, totalTimeSpent) => {
  console.log('=== CALCULATE DYNAMIC INSIGHTS DEBUG ===');
  console.log('questionResults length:', questionResults?.length || 0);
  console.log('totalTimeSpent:', totalTimeSpent);
  
  const totalQuestions = questionResults?.length || 0;
  const safeTimeSpent = totalTimeSpent || 0;
  
  if (totalQuestions === 0) {
    console.log('No questions, returning zero analytics');
    return {
      timeSpentPerQuestion: 0,
      averageTimePerQuestion: 0,
      accuracyTrends: {
        firstHalf: 0,
        secondHalf: 0,
        improvementRate: 0
      },
      testStrategy: {
        averageTimePerQuestion: 0,
        questionsRevisited: 0,
        answerChanges: 0
      },
      speedMetrics: {
        averageTimePerCategory: { quantitative: 0, logical: 0, verbal: 0 },
        averageTimePerDifficulty: { easy: 0, medium: 0, hard: 0 }
      }
    };
  }
  
  // Calculate average time per question
  const averageTimePerQuestion = safeTimeSpent / totalQuestions;
  
  // Calculate first half vs second half accuracy
  const halfPoint = Math.ceil(totalQuestions / 2);
  const firstHalf = questionResults.slice(0, halfPoint);
  const secondHalf = questionResults.slice(halfPoint);
  
  const firstHalfCorrect = firstHalf.filter(q => q && q.isCorrect).length;
  const secondHalfCorrect = secondHalf.filter(q => q && q.isCorrect).length;
  
  const firstHalfAccuracy = firstHalf.length > 0 ? (firstHalfCorrect / firstHalf.length) * 100 : 0;
  const secondHalfAccuracy = secondHalf.length > 0 ? (secondHalfCorrect / secondHalf.length) * 100 : 0;
  const accuracyImprovement = secondHalfAccuracy - firstHalfAccuracy;
  
  console.log('First half accuracy:', firstHalfAccuracy);
  console.log('Second half accuracy:', secondHalfAccuracy);
  console.log('Accuracy improvement:', accuracyImprovement);
  
  // Calculate speed metrics by category and difficulty
  const categoryTimes = { quantitative: [], logical: [], verbal: [] };
  const difficultyTimes = { easy: [], medium: [], hard: [] };
  
  questionResults.forEach(result => {
    const category = mapCategory(result.category);
    const difficulty = mapDifficulty(result.difficulty);
    const timeSpent = result.timeSpent || 0;
    
    if (categoryTimes[category]) {
      categoryTimes[category].push(timeSpent);
    }
    if (difficultyTimes[difficulty]) {
      difficultyTimes[difficulty].push(timeSpent);
    }
  });
  
  // Calculate averages
  const averageTimePerCategory = {};
  Object.keys(categoryTimes).forEach(category => {
    const times = categoryTimes[category];
    averageTimePerCategory[category] = times.length > 0 ? 
      Math.round(times.reduce((sum, time) => sum + time, 0) / times.length) : 0;
  });
  
  const averageTimePerDifficulty = {};
  Object.keys(difficultyTimes).forEach(difficulty => {
    const times = difficultyTimes[difficulty];
    averageTimePerDifficulty[difficulty] = times.length > 0 ? 
      Math.round(times.reduce((sum, time) => sum + time, 0) / times.length) : 0;
  });
  
  const result = {
    timeSpentPerQuestion: Math.round(averageTimePerQuestion) || 0,
    averageTimePerQuestion: Math.round(averageTimePerQuestion) || 0,
    // Structure expected by frontend
    accuracyTrends: {
      firstHalf: isNaN(firstHalfAccuracy) ? 0 : Math.round(firstHalfAccuracy * 100) / 100,
      secondHalf: isNaN(secondHalfAccuracy) ? 0 : Math.round(secondHalfAccuracy * 100) / 100,
      improvementRate: isNaN(accuracyImprovement) ? 0 : Math.round(accuracyImprovement * 100) / 100
    },
    testStrategy: {
      averageTimePerQuestion: Math.round(averageTimePerQuestion) || 0,
      questionsRevisited: 0, // Dynamic tests don't allow revisiting
      answerChanges: 0 // Dynamic tests don't allow answer changes
    },
    confidenceMetrics: {
      questionsRevisited: 0, // Dynamic tests don't allow revisiting
      answerChanges: 0 // Dynamic tests don't allow answer changes
    },
    speedMetrics: {
      averageTimePerCategory: averageTimePerCategory || { quantitative: 0, logical: 0, verbal: 0 },
      averageTimePerDifficulty: averageTimePerDifficulty || { easy: 0, medium: 0, hard: 0 }
    }
  };
  
  console.log('Final analytics result:', JSON.stringify(result, null, 2));
  console.log('=========================================');
  
  return result;
};

const calculateDynamicAnalytics = (progress) => {
  const analytics = {
    totalBatches: progress.batchHistory.length,
    categoriesCompleted: 0,
    highestDifficulties: {},
    performanceByDifficulty: {
      easy: { attempted: 0, correct: 0, accuracy: 0 },
      medium: { attempted: 0, correct: 0, accuracy: 0 },
      hard: { attempted: 0, correct: 0, accuracy: 0 }
    }
  };

  // Calculate category completion
  Object.keys(progress.categoryProgress).forEach(category => {
    if (progress.categoryProgress[category].completedDifficulties.length === 3) {
      analytics.categoriesCompleted++;
    }
    analytics.highestDifficulties[category] = progress.categoryProgress[category].highestReached;
  });

  // Calculate performance by difficulty
  progress.batchHistory.forEach(batch => {
    if (batch.completed) {
      const difficulty = batch.difficulty;
      analytics.performanceByDifficulty[difficulty].attempted += batch.totalQuestions;
      analytics.performanceByDifficulty[difficulty].correct += batch.correctAnswers;
    }
  });

  // Calculate accuracy percentages
  Object.keys(analytics.performanceByDifficulty).forEach(difficulty => {
    const data = analytics.performanceByDifficulty[difficulty];
    data.accuracy = data.attempted > 0 ? (data.correct / data.attempted) * 100 : 0;
  });

  return analytics;
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
  getAttemptAnalytics,
  getNextDynamicBatch,
  submitDynamicBatch,
  getDynamicProgress,
  completeDynamicBatch
};