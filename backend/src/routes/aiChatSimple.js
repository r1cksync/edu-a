const express = require('express');
const ScreeningTestAttempt = require('../models/ScreeningTestAttempt');
const Question = require('../models/Question');

let groq;
try {
  const Groq = require('groq-sdk');
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com', // Root domain only, SDK adds /openai/v1
  });
  console.log('Groq SDK initialized successfully with root domain baseURL');
} catch (error) {
  console.error('Error initializing Groq:', error);
}

const router = express.Router();

// Function to get comprehensive analytics data (same as getAttemptResult)
// Helper functions for analytics calculation (same as screeningTestController.js)
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
  const totalQuestions = questionResults?.length || 0;
  const safeTimeSpent = totalTimeSpent || 0;
  
  if (totalQuestions === 0) {
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
  
  return {
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
};

const getComprehensiveAnalytics = async (attempt) => {
  // Check if this is a dynamic difficulty test
  const isDynamicTest = attempt.dynamicDifficultyProgress && attempt.dynamicDifficultyProgress.enabled;
  
  // Calculate detailed results (EXACT same logic as getAttemptResult)
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

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return {
    testInfo: {
      title: attempt.screeningTest?.title || 'Screening Test',
      description: attempt.screeningTest?.description || 'No description available',
      totalQuestions: totalQuestions,
      passingScore: attempt.screeningTest?.passingScore || 60,
      isDynamic: isDynamicTest
    },
    performance: {
      score: totalScore,
      maxScore: maxScore,
      percentage: Math.round(percentage * 100) / 100,
      correctAnswers: correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers - skippedCount,
      skippedQuestions: skippedCount,
      totalTimeSpent: totalTimeSpent,
      passed: percentage >= (attempt.screeningTest?.passingScore || 60),
    },
    categoryBreakdown: isDynamicTest ? calculateDynamicCategoryPerformance(questionResults) : attempt.categoryPerformance,
    difficultyBreakdown: isDynamicTest ? calculateDynamicDifficultyPerformance(questionResults) : attempt.difficultyPerformance,
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
    },
    questionResults: questionResults
  };
};

// Function to build user message with attached questions
const buildUserMessage = (message, attachedQuestionsData) => {
  let userMessage = message;
  
  if (attachedQuestionsData && attachedQuestionsData.length > 0) {
    userMessage += "\n\n**Attached Questions for Reference:**\n";
    attachedQuestionsData.forEach((q, index) => {
      userMessage += `
**Question ${index + 1}:**
Question: ${q.question}
Category: ${q.category} | Difficulty: ${q.difficulty}
Options: ${Array.isArray(q.options) ? q.options.join(', ') : 'No options provided'}
Your Answer: ${q.userAnswer || 'Not answered'}
Correct Answer: ${q.correctAnswer}
Result: ${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
Time Spent: ${q.timeSpent}s
${q.explanation ? `Explanation: ${q.explanation}` : ''}
`;
    });
  }
  
  return userMessage;
};

// AI Chat endpoint
router.post('/', async (req, res) => {
  try {
    console.log('AI Chat endpoint called with body:', req.body);
    const { attemptId, message, attachedQuestions = [] } = req.body;

    if (!groq) {
      return res.status(500).json({
        success: false,
        message: 'AI service is not available. Please check the Groq API configuration.',
      });
    }

    if (!attemptId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Attempt ID and message are required',
      });
    }

    // Fetch the attempt data using the same logic as getAttemptResult
    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate('screeningTest')
      .populate('student', 'name email');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found',
      });
    }

    // Get comprehensive analytics data using the same logic as reports section
    const attemptData = await getComprehensiveAnalytics(attempt);

    // Get attached questions data if any
    let attachedQuestionsData = [];
    if (attachedQuestions && attachedQuestions.length > 0) {
      console.log('Processing attached questions:', attachedQuestions);
      
      // Fetch questions from database with their answer data
      const questions = await Question.find({ _id: { $in: attachedQuestions } });
      console.log('Found questions in database:', questions.length);
      
      attachedQuestionsData = await Promise.all(attachedQuestions.map(async (questionId) => {
        try {
          // Get the question from database
          const question = questions.find(q => q._id.toString() === questionId);
          if (!question) {
            console.log('Question not found in database:', questionId);
            return null;
          }
          
          console.log('Found question:', question.question.substring(0, 100));
          
          // Get the student's answer from firstBatchAnswers or questionResults
          let studentAnswer = null;
          let isCorrect = false;
          let timeSpent = 0;
          
          // Check firstBatchAnswers first (for dynamic tests)
          if (attempt.firstBatchAnswers && attempt.firstBatchAnswers[questionId]) {
            const answerData = attempt.firstBatchAnswers[questionId];
            studentAnswer = answerData.selectedAnswer;
            isCorrect = answerData.isCorrect;
            timeSpent = answerData.timeSpent || 0;
            console.log('Found answer in firstBatchAnswers:', studentAnswer);
          } else {
            // Check questionResults (for regular tests)
            const questionResult = attempt.questionResults?.find(qr => qr._id.toString() === questionId);
            if (questionResult) {
              studentAnswer = questionResult.userAnswer;
              isCorrect = questionResult.isCorrect;
              timeSpent = questionResult.timeSpent || 0;
              console.log('Found answer in questionResults:', studentAnswer);
            }
          }
          
          return {
            questionId: question._id.toString(),
            question: question.question,
            category: question.category,
            difficulty: question.difficulty,
            options: question.options || [],
            correctAnswer: question.correctAnswer,
            userAnswer: studentAnswer,
            isCorrect: isCorrect,
            timeSpent: timeSpent,
            explanation: question.explanation || 'No explanation provided',
          };
        } catch (error) {
          console.error('Error processing question:', questionId, error);
          return null;
        }
      }));
      
      // Filter out null results
      attachedQuestionsData = attachedQuestionsData.filter(Boolean);
      
      console.log('Successfully processed attached questions:', attachedQuestionsData.length);
      if (attachedQuestionsData.length > 0) {
        console.log('First question sample:', attachedQuestionsData[0].question.substring(0, 100));
        console.log('Student answer:', attachedQuestionsData[0].userAnswer);
        console.log('Correct answer:', attachedQuestionsData[0].correctAnswer);
      }
    }

    // Build the system prompt with context
    const systemPrompt = `You are an AI tutor helping a student understand their screening test performance. You have access to their complete test attempt data and can provide personalized insights, explanations, and guidance.

**Student's Test Performance Summary:**
- Test: ${attemptData.testInfo.title}
- Score: ${attemptData.performance.score} points (${attemptData.performance.percentage}%)
- Status: ${attemptData.performance.passed ? 'PASSED' : 'NOT PASSED'}
- Correct Answers: ${attemptData.performance.correctAnswers}
- Wrong Answers: ${attemptData.performance.wrongAnswers}
- Skipped Questions: ${attemptData.performance.skippedQuestions}
- Time Spent: ${Math.floor(attemptData.performance.totalTimeSpent / 60)}m ${attemptData.performance.totalTimeSpent % 60}s

**Category Performance:**
${Object.entries(attemptData.categoryBreakdown).map(([category, perf]) => 
  `- ${category.toUpperCase()}: ${perf.correct}/${perf.total} correct (${perf.accuracy}%)`
).join('\n')}

**Difficulty Performance:**
${Object.entries(attemptData.difficultyBreakdown).map(([difficulty, perf]) => 
  `- ${difficulty.toUpperCase()}: ${perf.correct}/${perf.total} correct (${perf.accuracy}%)`
).join('\n')}

**Analytics:**
- Average time per question: ${attemptData.analytics.averageTimePerQuestion || 0}s
- First half accuracy: ${attemptData.analytics.accuracyTrends?.firstHalf || 0}%
- Second half accuracy: ${attemptData.analytics.accuracyTrends?.secondHalf || 0}%
- Improvement: ${attemptData.analytics.accuracyTrends?.improvementRate || 0}%

**Instructions:**
- Provide helpful, encouraging, and educational responses
- Focus on learning and improvement opportunities
- Based on the performance data, suggest specific topics and concepts to study
- Suggest study strategies based on performance patterns
- Explain concepts clearly and provide examples when helpful
- Be supportive but honest about areas needing improvement
- Keep responses concise but informative (max 500 words)
- If the student asks about specific topics to focus on, analyze their category and difficulty performance to give targeted advice`;

    // Make API call to Groq
    console.log('Making API call to Groq...');
    console.log('Groq client baseURL:', groq.baseURL);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: buildUserMessage(message, attachedQuestionsData),
        },
      ],
      model: 'llama-3.1-8b-instant', // Using currently supported Groq model
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
    });
    console.log('Groq API call successful');

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    res.json({
      success: true,
      response: aiResponse,
      metadata: {
        model: 'llama-3.1-8b-instant',
        attachedQuestions: attachedQuestions.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI response',
      error: error.message,
    });
  }
});

module.exports = router;