const ScreeningTestAttempt = require('../models/ScreeningTestAttempt');

let groq;
try {
  const Groq = require('groq-sdk');
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
} catch (error) {
  console.error('Error initializing Groq:', error);
}

// Function to format attempt data for AI context
const formatAttemptDataForAI = (attempt) => {
  const { screeningTest, questionResults, categoryPerformance, difficultyPerformance, analytics } = attempt;
  
  return {
    testInfo: {
      title: screeningTest?.title || 'Screening Test',
      description: screeningTest?.description || 'No description available',
      totalQuestions: screeningTest?.totalQuestions || questionResults?.length || 0,
      passingScore: screeningTest?.passingScore || 60,
    },
    performance: {
      score: attempt.score || 0,
      percentage: attempt.percentage || 0,
      correctAnswers: attempt.correctAnswers || 0,
      wrongAnswers: attempt.wrongAnswers || 0,
      skippedQuestions: attempt.skippedQuestions || 0,
      totalTimeSpent: attempt.totalTimeSpent || 0,
      passed: attempt.percentage >= (screeningTest?.passingScore || 60),
    },
    categoryBreakdown: categoryPerformance || {},
    difficultyBreakdown: difficultyPerformance || {},
    analytics: analytics || {},
    questionResults: questionResults || [],
  };
};

// Function to format question data for AI context
const formatQuestionForAI = (questionResult) => {
  return {
    questionId: questionResult._id,
    question: questionResult.question,
    category: questionResult.category,
    difficulty: questionResult.difficulty,
    options: questionResult.options,
    correctAnswer: questionResult.correctAnswer,
    userAnswer: questionResult.userAnswer,
    isCorrect: questionResult.isCorrect,
    timeSpent: questionResult.timeSpent,
    explanation: questionResult.explanation || 'No explanation provided',
  };
};

// Main AI Chat endpoint
const chatWithAI = async (req, res) => {
  try {
    const { attemptId, message, attachedQuestions = [] } = req.body;

    if (!groq) {
      return res.status(500).json({
        success: false,
        message: 'AI service is not available',
      });
    }

    if (!attemptId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Attempt ID and message are required',
      });
    }

    // Fetch the attempt data
    const attempt = await ScreeningTestAttempt.findById(attemptId)
      .populate('screeningTest')
      .populate('student', 'name email');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found',
      });
    }

    // Format attempt data for AI context
    const attemptData = formatAttemptDataForAI(attempt);
    
    // Get attached questions data
    const attachedQuestionsData = attachedQuestions.map(questionId => {
      const questionResult = attempt.questionResults?.find(q => q._id.toString() === questionId);
      return questionResult ? formatQuestionForAI(questionResult) : null;
    }).filter(Boolean);

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
- If asked about specific questions, refer to the attached question data
- Suggest study strategies based on performance patterns
- Explain concepts clearly and provide examples when helpful
- Be supportive but honest about areas needing improvement
- Keep responses concise but informative (max 500 words)`;

    // Build the user message with attached questions context
    let userMessage = message;
    
    if (attachedQuestionsData.length > 0) {
      userMessage += "\n\n**Attached Questions for Reference:**\n";
      attachedQuestionsData.forEach((q, index) => {
        userMessage += `
**Question ${index + 1}:**
- Question: ${q.question}
- Category: ${q.category} | Difficulty: ${q.difficulty}
- Your Answer: ${q.userAnswer || 'Not answered'}
- Correct Answer: ${q.correctAnswer}
- Result: ${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
- Time Spent: ${q.timeSpent}s
- Explanation: ${q.explanation}
`;
      });
    }

    // Make API call to Groq
    console.log('Making API call to Groq...');
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      model: 'llama-3.1-70b-versatile', // Using Groq's Llama model
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
        model: 'llama-3.1-70b-versatile',
        attachedQuestions: attachedQuestionsData.length,
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
};

module.exports = {
  chatWithAI,
};