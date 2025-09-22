const RefresherSession = require('../models/Refresher');
const DailyPracticeProblem = require('../models/DailyPracticeProblem');
const aiService = require('../services/aiService');
const analysisService = require('../services/analysisService');

/**
 * Get student's completed DPP submissions for refresher selection
 */
const getAvailableDPPs = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { classroomId } = req.params;

    console.log('DEBUG: Getting available DPPs for student:', studentId, 'in classroom:', classroomId);

    // First, let's get MCQ DPPs in this classroom that have student submissions
    const allDPPs = await DailyPracticeProblem.find({
      classroom: classroomId,
      type: 'mcq', // Only MCQ DPPs for now
      'submissions.student': studentId
    })
    .populate('classroom', 'name')
    .sort({ createdAt: -1 });

    console.log('DEBUG: Found', allDPPs.length, 'total MCQ DPPs with student submissions');

    // Process DPPs to extract submissions for this student
    const availableDPPs = [];

    for (const dpp of allDPPs) {
      console.log('DEBUG: Checking DPP:', dpp.title, 'with', dpp.submissions?.length || 0, 'submissions');
      
      // Find student's submissions for this DPP that have answers (indicating completion)
      const studentSubmissions = dpp.submissions.filter(sub => {
        const isStudentMatch = sub.student.toString() === studentId;
        const hasAnswers = sub.answers && sub.answers.length > 0;
        console.log('DEBUG: Submission check - student match:', isStudentMatch, 'has answers:', hasAnswers, 'answers count:', sub.answers?.length || 0);
        return isStudentMatch && hasAnswers;
      });

      console.log('DEBUG: Found', studentSubmissions.length, 'submissions for student');

      // For each submission, calculate stats
      for (const submission of studentSubmissions) {
        const totalQuestions = dpp.questions?.length || 0;
        const incorrectAnswers = submission.answers.filter((answer, index) => {
          const question = dpp.questions[index];
          if (!question) return false;
          const selectedOption = question.options.find(opt => opt.text === answer.selectedOption);
          return !selectedOption || !selectedOption.isCorrect;
        });

        console.log('DEBUG: Total questions:', totalQuestions, 'Incorrect answers:', incorrectAnswers.length);

        const dppData = {
          submissionId: submission._id,
          dpp: {
            id: dpp._id,
            title: dpp.title,
            description: dpp.description,
            type: dpp.type,
            maxScore: dpp.maxScore,
            createdAt: dpp.createdAt
          },
          submissionStats: {
            score: submission.score,
            totalQuestions,
            incorrectCount: incorrectAnswers.length,
            accuracy: totalQuestions > 0 ? ((totalQuestions - incorrectAnswers.length) / totalQuestions) * 100 : 0,
            submittedAt: submission.submittedAt
          },
          canUseForRefresher: incorrectAnswers.length > 0 // Only show if there are mistakes to learn from
        };

        console.log('DEBUG: Can use for refresher:', dppData.canUseForRefresher);

        if (dppData.canUseForRefresher) {
          availableDPPs.push(dppData);
        }
      }
    }

    console.log('DEBUG: Final available DPPs count:', availableDPPs.length);

    res.json({
      success: true,
      data: {
        availableDPPs,
        totalCount: availableDPPs.length
      }
    });

  } catch (error) {
    console.error('Error getting available DPPs for refresher:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get available DPPs'
    });
  }
};

/**
 * Start a new refresher session
 */
const startRefresherSession = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { classroomId } = req.params;
    const { submissionId, questionsPerBatch } = req.body;

    // Validate input
    if (!submissionId || !questionsPerBatch) {
      return res.status(400).json({
        success: false,
        error: 'Submission ID and questions per batch are required'
      });
    }

    if (questionsPerBatch < 1 || questionsPerBatch > 20) {
      return res.status(400).json({
        success: false,
        error: 'Questions per batch must be between 1 and 20'
      });
    }

    // Get the DPP and find the specific submission
    const dpp = await DailyPracticeProblem.findOne({
      'submissions._id': submissionId
    })
    .populate('classroom', 'name')
    .populate('submissions.student', 'name email');

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP submission not found'
      });
    }

    // Find the specific submission within the DPP
    const submission = dpp.submissions.id(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'DPP submission not found'
      });
    }

    if (submission.student._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only create refresher sessions for your own submissions'
      });
    }

    // Check if there's already an active refresher session for this submission
    const existingSession = await RefresherSession.findOne({
      student: studentId,
      sourceSubmission: submissionId,
      status: 'active'
    });

    if (existingSession) {
      // Automatically abandon the existing session and start a new one
      console.log('Found existing active session, abandoning it to start new one...');
      existingSession.status = 'abandoned';
      existingSession.completedAt = new Date();
      await existingSession.save();
    }

    // Analyze incorrect answers
    console.log('Analyzing incorrect answers for refresher session...');
    const analysis = await analysisService.analyzeIncorrectAnswers(studentId, submissionId);

    if (analysis.incorrectAnswers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No incorrect answers found in this submission. Refresher not needed!'
      });
    }

    // Generate initial questions based on analysis
    console.log('Generating initial refresher questions...');
    const initialQuestions = await aiService.generateRefresherQuestions(
      analysis,
      questionsPerBatch,
      'medium' // Start with medium difficulty
    );

    // Create refresher session
    const refresherSession = new RefresherSession({
      student: studentId,
      classroom: classroomId,
      sourceDPP: dpp._id,
      sourceSubmission: submissionId,
      totalQuestionsRequested: questionsPerBatch,
      incorrectTopics: analysis.topicAnalysis,
      questionBatches: []
    });

    // Add first batch of questions
    refresherSession.addNewBatch(initialQuestions);
    await refresherSession.save();

    console.log(`Refresher session created with ${initialQuestions.length} initial questions`);

    res.json({
      success: true,
      data: {
        sessionId: refresherSession._id,
        analysis: {
          sourceDPP: analysis.submission.dppTitle,
          totalIncorrectAnswers: analysis.incorrectAnswers.length,
          topicAreas: analysis.topicAnalysis.slice(0, 3).map(t => t.topic),
          improvementAreas: analysis.improvementAreas
        },
        currentBatch: {
          batchNumber: 0,
          questions: initialQuestions,
          questionsCount: initialQuestions.length
        }
      }
    });

  } catch (error) {
    console.error('Error starting refresher session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start refresher session'
    });
  }
};

/**
 * Submit answers for current batch and get options for next steps
 */
const submitBatchAnswers = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { sessionId } = req.params;
    const { answers } = req.body;

    // Validate input
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Answers array is required'
      });
    }

    // Get refresher session
    const session = await RefresherSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Refresher session not found'
      });
    }

    if (session.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only submit answers for your own sessions'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'This refresher session is not active'
      });
    }

    // Submit answers for current batch
    const success = session.submitBatchAnswers(answers);
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to submit answers. Please check your submission.'
      });
    }

    await session.save();

    // Calculate batch results
    const currentBatch = session.getCurrentBatch();
    const batchResults = {
      batchNumber: currentBatch.batchNumber,
      score: {
        correct: currentBatch.batchScore.correct,
        total: currentBatch.batchScore.total,
        percentage: (currentBatch.batchScore.correct / currentBatch.batchScore.total) * 100
      },
      completedAt: currentBatch.completedAt
    };

    // Get incorrect answers for potential follow-up
    const incorrectAnswers = session.getIncorrectAnswersFromCurrentBatch();

    res.json({
      success: true,
      data: {
        batchResults,
        sessionStats: session.sessionStats,
        hasIncorrectAnswers: incorrectAnswers.length > 0,
        canGenerateMore: incorrectAnswers.length > 0,
        nextOptions: {
          getMoreQuestions: incorrectAnswers.length > 0,
          concludeSession: true
        }
      }
    });

  } catch (error) {
    console.error('Error submitting batch answers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit answers'
    });
  }
};

/**
 * Generate more questions based on current batch mistakes
 */
const generateMoreQuestions = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { sessionId } = req.params;
    const { questionsCount } = req.body;

    // Validate input
    if (!questionsCount || questionsCount < 1 || questionsCount > 20) {
      return res.status(400).json({
        success: false,
        error: 'Questions count must be between 1 and 20'
      });
    }

    // Get refresher session
    const session = await RefresherSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Refresher session not found'
      });
    }

    if (session.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only generate questions for your own sessions'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'This refresher session is not active'
      });
    }

    // Get incorrect answers from current batch
    const incorrectAnswers = session.getIncorrectAnswersFromCurrentBatch();
    if (incorrectAnswers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No incorrect answers found in current batch. Cannot generate follow-up questions.'
      });
    }

    // Analyze current batch for follow-up questions
    console.log('Analyzing current batch for dynamic follow-up...');
    const followupAnalysis = analysisService.analyzeDynamicFollowup(incorrectAnswers);

    // Generate dynamic follow-up questions
    console.log('Generating dynamic follow-up questions...');
    const followupQuestions = await aiService.generateDynamicFollowupQuestions(
      followupAnalysis,
      questionsCount,
      followupAnalysis.suggestedDifficulty
    );

    // Add new batch to session
    session.addNewBatch(followupQuestions);
    await session.save();

    console.log(`Generated ${followupQuestions.length} follow-up questions for batch ${session.currentBatch}`);

    res.json({
      success: true,
      data: {
        newBatch: {
          batchNumber: session.currentBatch,
          questions: followupQuestions,
          questionsCount: followupQuestions.length,
          generatedFrom: 'dynamic_followup'
        },
        analysis: {
          focusedTopics: followupAnalysis.focusedTopics,
          basedOnMistakes: incorrectAnswers.length,
          difficulty: followupAnalysis.suggestedDifficulty
        }
      }
    });

  } catch (error) {
    console.error('Error generating more questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate more questions'
    });
  }
};

/**
 * Conclude refresher session and get final results
 */
const concludeSession = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { sessionId } = req.params;

    // Get refresher session
    const session = await RefresherSession.findById(sessionId)
      .populate('sourceDPP', 'title');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Refresher session not found'
      });
    }

    if (session.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only conclude your own sessions'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'This session is already concluded'
      });
    }

    // Conclude the session
    session.concludeSession();
    await session.save();

    // Prepare detailed results
    const sessionSummary = {
      sessionId: session._id,
      sourceDPP: session.sourceDPP.title,
      duration: {
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        totalTime: session.sessionStats.totalTimeSpent
      },
      questionStats: {
        totalQuestions: session.sessionStats.totalQuestions,
        totalCorrect: session.sessionStats.totalCorrect,
        accuracy: session.sessionStats.totalQuestions > 0 
          ? (session.sessionStats.totalCorrect / session.sessionStats.totalQuestions) * 100 
          : 0,
        averageTimePerQuestion: session.sessionStats.averageTimePerQuestion,
        improvementRate: session.sessionStats.improvementRate
      },
      batchBreakdown: session.questionBatches.map(batch => ({
        batchNumber: batch.batchNumber,
        questionsCount: batch.questions.length,
        score: batch.batchScore,
        accuracy: (batch.batchScore.correct / batch.batchScore.total) * 100,
        generatedFrom: batch.questions[0]?.generatedFrom || 'unknown'
      })),
      topicsFocused: session.incorrectTopics.map(t => t.topic),
      recommendations: generateRecommendations(session)
    };

    console.log(`Refresher session ${sessionId} concluded with ${session.sessionStats.totalQuestions} questions`);

    res.json({
      success: true,
      data: {
        message: 'Refresher session completed successfully!',
        sessionSummary
      }
    });

  } catch (error) {
    console.error('Error concluding refresher session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to conclude session'
    });
  }
};

/**
 * Get active refresher session details
 */
const getActiveSession = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { sessionId } = req.params;

    const session = await RefresherSession.findById(sessionId)
      .populate('sourceDPP', 'title description');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Refresher session not found'
      });
    }

    if (session.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own sessions'
      });
    }

    const currentBatch = session.getCurrentBatch();
    
    res.json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        sourceDPP: session.sourceDPP.title,
        currentBatch: currentBatch ? {
          batchNumber: currentBatch.batchNumber,
          questions: currentBatch.questions,
          completed: !!currentBatch.completedAt
        } : null,
        sessionStats: session.sessionStats,
        startedAt: session.startedAt
      }
    });

  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get session details'
    });
  }
};

/**
 * Get student's refresher session history
 */
const getSessionHistory = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { classroomId } = req.params;

    const sessions = await RefresherSession.find({
      student: studentId,
      classroom: classroomId
    })
    .populate('sourceDPP', 'title description')
    .sort({ startedAt: -1 });

    const sessionHistory = sessions.map(session => ({
      sessionId: session._id,
      sourceDPP: session.sourceDPP.title,
      status: session.status,
      stats: {
        totalQuestions: session.sessionStats.totalQuestions,
        accuracy: session.sessionStats.totalQuestions > 0 
          ? (session.sessionStats.totalCorrect / session.sessionStats.totalQuestions) * 100 
          : 0,
        batchesCompleted: session.questionBatches.filter(b => b.completedAt).length
      },
      startedAt: session.startedAt,
      completedAt: session.completedAt
    }));

    res.json({
      success: true,
      data: {
        sessions: sessionHistory,
        totalSessions: sessionHistory.length
      }
    });

  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get session history'
    });
  }
};

/**
 * Generate recommendations based on session performance
 * @param {Object} session - Refresher session object
 * @returns {Array} Array of recommendations
 */
function generateRecommendations(session) {
  const recommendations = [];
  const overallAccuracy = (session.sessionStats.totalCorrect / session.sessionStats.totalQuestions) * 100;

  if (overallAccuracy < 50) {
    recommendations.push({
      type: 'study',
      message: 'Consider reviewing the fundamental concepts before attempting more practice questions',
      priority: 'high'
    });
  } else if (overallAccuracy < 70) {
    recommendations.push({
      type: 'practice',
      message: 'Continue practicing with similar questions to strengthen your understanding',
      priority: 'medium'
    });
  } else {
    recommendations.push({
      type: 'advance',
      message: 'Great progress! Try attempting harder questions or different topics',
      priority: 'low'
    });
  }

  if (session.sessionStats.improvementRate > 10) {
    recommendations.push({
      type: 'positive',
      message: 'Excellent improvement throughout the session! Keep up the good work',
      priority: 'low'
    });
  }

  // Topic-specific recommendations
  const weakestTopics = session.incorrectTopics
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 2);

  weakestTopics.forEach(topic => {
    recommendations.push({
      type: 'topic',
      message: `Focus on strengthening your ${topic.topic} concepts`,
      priority: 'medium'
    });
  });

  return recommendations;
}

module.exports = {
  getAvailableDPPs,
  startRefresherSession,
  submitBatchAnswers,
  generateMoreQuestions,
  concludeSession,
  getActiveSession,
  getSessionHistory
};