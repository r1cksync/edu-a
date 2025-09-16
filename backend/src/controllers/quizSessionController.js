const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Classroom = require('../models/Classroom');
const User = require('../models/User');

class QuizSessionController {

  // Start a new quiz session
  async startQuizSession(req, res) {
    try {
      const { quizId } = req.params;
      const { browserInfo, deviceFingerprint } = req.body;
      const studentId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'student') {
        return res.status(403).json({ message: 'Only students can start quiz sessions' });
      }

      const quiz = await Quiz.findById(quizId).populate('classroom', 'name classCode students');
      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }

      // Check if student has access to this quiz
      const hasAccess = quiz.classroom.students.some(s => 
        s.student.toString() === studentId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this quiz' });
      }

      // Check if quiz is available for attempt
      if (!quiz.canAttempt()) {
        return res.status(400).json({ 
          message: 'Quiz is not available for attempt at this time',
          availableFrom: quiz.scheduledStartTime,
          availableUntil: quiz.scheduledEndTime
        });
      }

      // Check existing attempts
      const existingSessions = await QuizSession.find({
        quiz: quizId,
        student: studentId
      }).sort({ attemptNumber: -1 });

      if (existingSessions.length >= quiz.attempts) {
        return res.status(400).json({ 
          message: `Maximum attempts (${quiz.attempts}) reached for this quiz` 
        });
      }

      // Check for active session
      const activeSession = await QuizSession.findOne({
        quiz: quizId,
        student: studentId,
        status: 'in_progress'
      });

      if (activeSession) {
        return res.status(400).json({ 
          message: 'You already have an active session for this quiz',
          sessionId: activeSession._id
        });
      }

      const attemptNumber = existingSessions.length + 1;

      // Create shuffled questions for this session
      const shuffledQuestions = quiz.getShuffledQuestions().map(q => ({
        _id: q._id,  // Keep original _id for frontend compatibility
        questionId: q._id, // Also keep questionId for backend reference
        question: q.question,
        options: q.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        points: q.points
      }));

      // Calculate time remaining based on quiz duration
      const now = new Date();
      const quizEndTime = new Date(quiz.scheduledEndTime);
      const sessionDuration = quiz.duration * 60; // convert to seconds
      const timeUntilQuizEnd = Math.floor((quizEndTime - now) / 1000);
      const timeRemaining = Math.min(sessionDuration, timeUntilQuizEnd);

      // Create new session
      const session = new QuizSession({
        quiz: quizId,
        student: studentId,
        classroom: quiz.classroom._id,
        attemptNumber,
        questions: shuffledQuestions,
        totalPoints: quiz.totalPoints,
        timeRemaining,
        isProctored: quiz.isProctored,
        proctoringData: {
          cameraEnabled: false,
          microphoneEnabled: false,
          screenRecordingEnabled: false
        },
        browserInfo,
        deviceFingerprint,
        ipAddress: req.ip
      });

      await session.startSession();

      // Populate quiz and classroom data for frontend
      await session.populate('quiz', 'title duration isProctored proctoringSettings');
      await session.populate('classroom', 'name classCode');

      // Return session data without correct answers for frontend
      const sessionData = session.toObject();
      sessionData.questions = sessionData.questions.map(q => ({
        _id: q._id,  // Keep _id for frontend compatibility
        questionId: q.questionId,
        question: q.question,
        options: q.options.map(opt => ({ text: opt.text })),
        points: q.points
      }));

      res.status(201).json({
        message: 'Quiz session started successfully',
        session: sessionData,
        timeRemaining: session.timeRemaining
      });

    } catch (error) {
      console.error('Start quiz session error:', error);
      res.status(500).json({ message: 'Server error while starting quiz session' });
    }
  }

  // Get current session
  async getCurrentSession(req, res) {
    try {
      const { quizId } = req.params;
      const studentId = req.user._id;

      const session = await QuizSession.findOne({
        quiz: quizId,
        student: studentId,
        status: 'in_progress'
      }).populate('quiz', 'title duration isProctored proctoringSettings');

      if (!session) {
        return res.status(404).json({ message: 'No active session found for this quiz' });
      }

      // Calculate remaining time
      const now = new Date();
      const elapsed = Math.floor((now - session.startedAt) / 1000);
      const timeRemaining = Math.max(0, session.timeRemaining - elapsed);

      // Auto-submit if time is up
      if (timeRemaining <= 0) {
        await session.submitSession();
        return res.json({
          message: 'Session automatically submitted due to time limit',
          session: session.toObject(),
          timeRemaining: 0
        });
      }

      // Return session data without correct answers
      const sessionData = session.toObject();
      sessionData.questions = sessionData.questions.map(q => ({
        _id: q._id,  // Keep _id for frontend compatibility
        questionId: q.questionId,
        question: q.question,
        options: q.options.map(opt => ({ text: opt.text })),
        points: q.points
      }));

      res.json({
        session: sessionData,
        timeRemaining
      });

    } catch (error) {
      console.error('Get current session error:', error);
      res.status(500).json({ message: 'Server error while fetching session' });
    }
  }

  // Submit answer for a question
  async submitAnswer(req, res) {
    try {
      const { sessionId } = req.params;
      const { questionId, selectedOptions, timeSpent } = req.body;
      const studentId = req.user._id;

      const session = await QuizSession.findOne({
        _id: sessionId,
        student: studentId,
        status: 'in_progress'
      });

      if (!session) {
        return res.status(404).json({ message: 'Active session not found' });
      }

      // Check if time is still remaining
      const now = new Date();
      const elapsed = Math.floor((now - session.startedAt) / 1000);
      const timeRemaining = Math.max(0, session.timeRemaining - elapsed);

      if (timeRemaining <= 0) {
        await session.submitSession();
        return res.status(400).json({ 
          message: 'Session has expired and been automatically submitted' 
        });
      }

      await session.submitAnswer(questionId, selectedOptions, timeSpent);

      res.json({
        message: 'Answer submitted successfully',
        timeRemaining: timeRemaining - timeSpent
      });

    } catch (error) {
      console.error('Submit answer error:', error);
      res.status(500).json({ message: 'Server error while submitting answer' });
    }
  }

  // Save multiple quiz answers (bulk save for auto-save functionality)
  async saveQuizAnswers(req, res) {
    try {
      const { sessionId } = req.params;
      const { answers } = req.body;
      const studentId = req.user._id;

      console.log('Saving quiz answers for session:', sessionId, 'answers:', answers);

      const session = await QuizSession.findOne({
        _id: sessionId,
        student: studentId,
        status: 'in_progress'
      }).populate('quiz');

      if (!session) {
        return res.status(404).json({ message: 'Active session not found' });
      }

      // Ensure totalPoints is set from the quiz
      if (!session.totalPoints && session.quiz) {
        session.totalPoints = session.quiz.totalPoints;
      }

      // Convert answers from key-value format to schema format
      if (answers && typeof answers === 'object') {
        // Create a map of existing answers for easy lookup
        const existingAnswersMap = {};
        session.answers.forEach(answer => {
          existingAnswersMap[answer.questionId.toString()] = answer;
        });

        // Create a map of quiz questions for evaluation
        const questionsMap = {};
        if (session.quiz && session.quiz.questions) {
          session.quiz.questions.forEach(question => {
            questionsMap[question._id.toString()] = question;
          });
        }

        // Process each new answer
        Object.entries(answers).forEach(([questionId, selectedOption]) => {
          const existingAnswer = existingAnswersMap[questionId];
          const quizQuestion = questionsMap[questionId];
          
          let isCorrect = false;
          let pointsEarned = 0;
          
          // Evaluate answer if we have the question
          if (quizQuestion && quizQuestion.options) {
            const selectedOptionIndex = parseInt(selectedOption);
            if (selectedOptionIndex >= 0 && selectedOptionIndex < quizQuestion.options.length) {
              isCorrect = quizQuestion.options[selectedOptionIndex].isCorrect;
              pointsEarned = isCorrect ? (quizQuestion.points || 1) : 0;
            }
          }
          
          if (existingAnswer) {
            // Update existing answer
            existingAnswer.selectedOptions = [selectedOption];
            existingAnswer.submittedAt = new Date();
            existingAnswer.isCorrect = isCorrect;
            existingAnswer.pointsEarned = pointsEarned;
          } else {
            // Add new answer
            session.answers.push({
              questionId: questionId,
              selectedOptions: [selectedOption],
              submittedAt: new Date(),
              isCorrect: isCorrect,
              pointsEarned: pointsEarned
            });
          }
        });

        await session.save();
        console.log('Answers saved successfully, total answers:', session.answers.length);
      }

      res.json({
        message: 'Answers saved successfully',
        answersCount: session.answers.length
      });

    } catch (error) {
      console.error('Save answers error:', error);
      res.status(500).json({ message: 'Server error while saving answers' });
    }
  }

  // Submit quiz session
  async submitQuizSession(req, res) {
    try {
      const { sessionId } = req.params;
      const studentId = req.user._id;

      // Debug logging
      console.log('Attempting to submit session:', sessionId, 'for student:', studentId);
      
      // First check if session exists at all
      const anySession = await QuizSession.findOne({
        _id: sessionId,
        student: studentId
      });
      
      console.log('Session found:', anySession ? {
        id: anySession._id,
        status: anySession.status,
        student: anySession.student
      } : 'No session found');

      const session = await QuizSession.findOne({
        _id: sessionId,
        student: studentId,
        status: 'in_progress'
      }).populate('quiz', 'title showResults');

      if (!session) {
        return res.status(404).json({ message: 'Active session not found' });
      }

      await session.submitSession();

      const response = {
        message: 'Quiz submitted successfully',
        sessionId: session._id,
        score: session.pointsEarned,
        totalPoints: session.totalPoints,
        percentage: session.percentage,
        timeSpent: session.timeSpentFormatted,
        riskScore: session.riskScore,
        violationCount: session.violationCount
      };

      if (session.riskScore >= 70) {
        response.message += ' Your submission is under review due to flagged activities.';
      }

      res.json(response);

    } catch (error) {
      console.error('Submit quiz session error:', error);
      res.status(500).json({ message: 'Server error while submitting quiz' });
    }
  }

  // Get quiz results
  async getQuizResults(req, res) {
    try {
      const { sessionId } = req.params;
      const studentId = req.user._id;

      const session = await QuizSession.findOne({
        _id: sessionId,
        student: studentId,
        status: { $in: ['submitted', 'completed'] }
      }).populate('quiz');

      if (!session) {
        return res.status(404).json({ message: 'Quiz results not found' });
      }

      // Get the quiz questions with correct answers
      const questions = session.quiz.questions.map(question => ({
        _id: question._id,
        question: question.question,
        type: question.type,
        options: question.options,
        points: question.points,
        explanation: question.explanation || null
      }));

      const results = {
        session: {
          _id: session._id,
          quiz: {
            _id: session.quiz._id,
            title: session.quiz.title,
            description: session.quiz.description,
            totalPoints: session.quiz.totalPoints
          },
          student: {
            _id: session.student,
            name: session.studentName || 'Student'
          },
          answers: session.answers,
          score: session.pointsEarned,
          percentage: session.percentage,
          timeSpent: session.timeSpent,
          timeSpentFormatted: session.timeSpentFormatted,
          submittedAt: session.submittedAt
        },
        questions: questions
      };

      res.json(results);

    } catch (error) {
      console.error('Get quiz results error:', error);
      res.status(500).json({ message: 'Server error while fetching results' });
    }
  }

  // Update proctoring data
  async updateProctoringData(req, res) {
    try {
      const { sessionId } = req.params;
      const proctoringData = req.body;
      const studentId = req.user._id;

      const session = await QuizSession.findOne({
        _id: sessionId,
        student: studentId,
        status: 'in_progress'
      });

      if (!session) {
        return res.status(404).json({ message: 'Active session not found' });
      }

      // Update proctoring data
      Object.assign(session.proctoringData, proctoringData);
      await session.save();

      res.json({ message: 'Proctoring data updated successfully' });

    } catch (error) {
      console.error('Update proctoring data error:', error);
      res.status(500).json({ message: 'Server error while updating proctoring data' });
    }
  }

  // Report violation
  async reportViolation(req, res) {
    try {
      const { sessionId } = req.params;
      const { type, severity, description, questionNumber, additionalData } = req.body;
      const studentId = req.user._id;

      const session = await QuizSession.findOne({
        _id: sessionId,
        student: studentId,
        status: 'in_progress'
      });

      if (!session) {
        return res.status(404).json({ message: 'Active session not found' });
      }

      const violation = {
        type,
        severity,
        description,
        questionNumber: questionNumber || session.currentQuestionIndex + 1,
        additionalData: additionalData || {},
        timestamp: new Date()
      };

      await session.addViolation(violation);

      // Check if session should be auto-flagged or terminated
      let shouldTerminate = false;
      
      if (session.riskScore >= 90) {
        shouldTerminate = true;
      } else if (session.violations.filter(v => v.severity === 'critical').length >= 2) {
        shouldTerminate = true;
      }

      if (shouldTerminate) {
        session.status = 'flagged';
        await session.save();
        
        return res.json({
          message: 'Session terminated due to severe violations',
          terminated: true,
          riskScore: session.riskScore
        });
      }

      res.json({
        message: 'Violation reported',
        riskScore: session.riskScore,
        violationCount: session.violationCount,
        warning: session.riskScore >= 50 ? 'Multiple violations detected. Please follow exam guidelines.' : null
      });

    } catch (error) {
      console.error('Report violation error:', error);
      res.status(500).json({ message: 'Server error while reporting violation' });
    }
  }

  // Get session results (for students)
  async getSessionResults(req, res) {
    try {
      const { sessionId } = req.params;
      const studentId = req.user._id;

      const session = await QuizSession.findOne({
        _id: sessionId,
        student: studentId,
        status: { $in: ['submitted', 'completed', 'under_review', 'flagged'] }
      }).populate('quiz', 'title showResults allowReview passingScore');

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const result = {
        sessionId: session._id,
        quizTitle: session.quiz.title,
        status: session.status,
        score: session.quiz.showResults ? session.percentage : null,
        passed: session.quiz.showResults ? session.passed : null,
        timeSpent: session.timeSpentFormatted,
        submittedAt: session.submittedAt,
        attemptNumber: session.attemptNumber,
        riskScore: session.riskScore,
        violationCount: session.violationCount,
        reviewStatus: session.reviewStatus
      };

      if (session.quiz.allowReview && session.quiz.showResults) {
        result.answers = session.answers.map(answer => ({
          questionId: answer.questionId,
          selectedOptions: answer.selectedOptions,
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned,
          timeSpent: answer.timeSpent
        }));
      }

      res.json({ result });

    } catch (error) {
      console.error('Get session results error:', error);
      res.status(500).json({ message: 'Server error while fetching results' });
    }
  }

  // Get sessions for review (for teachers)
  async getSessionsForReview(req, res) {
    try {
      const { classroomId } = req.params;
      const { status = 'all', riskLevel = 'all', limit = 20, page = 1 } = req.query;
      const teacherId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can review sessions' });
      }

      // Verify classroom access
      const classroom = await Classroom.findById(classroomId);
      if (!classroom || classroom.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      let query = { classroom: classroomId };

      if (status !== 'all') {
        if (status === 'needs_review') {
          query.reviewStatus = { $in: ['pending', 'needs_manual_review'] };
        } else {
          query.status = status;
        }
      }

      if (riskLevel !== 'all') {
        switch (riskLevel) {
          case 'low':
            query.riskScore = { $lt: 30 };
            break;
          case 'medium':
            query.riskScore = { $gte: 30, $lt: 70 };
            break;
          case 'high':
            query.riskScore = { $gte: 70 };
            break;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const sessions = await QuizSession.find(query)
        .populate('student', 'name email')
        .populate('quiz', 'title totalPoints')
        .sort({ riskScore: -1, submittedAt: 1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await QuizSession.countDocuments(query);

      res.json({
        sessions,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      });

    } catch (error) {
      console.error('Get sessions for review error:', error);
      res.status(500).json({ message: 'Server error while fetching sessions for review' });
    }
  }

  // Review session (for teachers)
  async reviewSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { decision, notes, scoreAdjustment } = req.body;
      const teacherId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can review sessions' });
      }

      const session = await QuizSession.findById(sessionId)
        .populate('quiz', 'classroom teacher')
        .populate('student', 'name email');

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      if (session.quiz.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Only the quiz creator can review this session' });
      }

      // Update review information
      session.reviewStatus = 'approved';
      session.reviewedBy = teacherId;
      session.reviewedAt = new Date();
      session.reviewNotes = notes || '';
      session.finalDecision = decision;

      // Apply score adjustments if any
      if (scoreAdjustment !== undefined && scoreAdjustment !== session.percentage) {
        session.percentage = Math.max(0, Math.min(100, scoreAdjustment));
        session.score = session.percentage;
        session.passed = session.percentage >= session.quiz.passingScore;
      }

      // Update status based on decision
      switch (decision) {
        case 'accept':
          session.status = 'completed';
          break;
        case 'reject':
          session.status = 'flagged';
          session.score = 0;
          session.percentage = 0;
          session.passed = false;
          break;
        case 'partial_credit':
          session.status = 'completed';
          break;
        case 'retake_required':
          session.status = 'cancelled';
          break;
      }

      await session.save();

      res.json({
        message: 'Session reviewed successfully',
        session: {
          id: session._id,
          student: session.student.name,
          decision,
          finalScore: session.percentage,
          status: session.status
        }
      });

    } catch (error) {
      console.error('Review session error:', error);
      res.status(500).json({ message: 'Server error while reviewing session' });
    }
  }

  // Get detailed session data (for teachers)
  async getSessionDetails(req, res) {
    try {
      const { sessionId } = req.params;
      const teacherId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can view detailed session data' });
      }

      const session = await QuizSession.findById(sessionId)
        .populate('student', 'name email')
        .populate('quiz', 'title questions teacher classroom')
        .populate('reviewedBy', 'name email');

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      if (session.quiz.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this session' });
      }

      res.json({ session });

    } catch (error) {
      console.error('Get session details error:', error);
      res.status(500).json({ message: 'Server error while fetching session details' });
    }
  }

  // Get student's quiz sessions for a classroom
  async getStudentSessions(req, res) {
    try {
      const { classroomId } = req.params;
      const studentId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'student') {
        return res.status(403).json({ message: 'Only students can access their quiz sessions' });
      }

      // Verify student has access to this classroom
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      const hasAccess = classroom.students.some(s => 
        s.student.toString() === studentId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      const sessions = await QuizSession.find({
        student: studentId,
        classroom: classroomId
      }).populate('quiz', 'title scheduledStartTime scheduledEndTime duration totalPoints');

      res.json({ sessions });

    } catch (error) {
      console.error('Get student sessions error:', error);
      res.status(500).json({ message: 'Server error while fetching student sessions' });
    }
  }

  // Get session details for students (their own session)
  async getStudentSessionDetails(req, res) {
    try {
      const { sessionId } = req.params;
      const studentId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'student') {
        return res.status(403).json({ message: 'Only students can access their session details' });
      }

      const session = await QuizSession.findOne({
        _id: sessionId,
        student: studentId
      }).populate('quiz', 'title questions duration totalPoints isProctored proctoringSettings')
        .populate('classroom', 'name classCode');

      if (!session) {
        return res.status(404).json({ message: 'Session not found or access denied' });
      }

      // Return session data without correct answers
      const sessionData = session.toObject();
      
      // Debug: Log session data being returned
      console.log('📤 Returning session data:', {
        sessionId: sessionData._id,
        status: sessionData.status,
        startedAt: sessionData.startedAt,
        hasQuiz: !!sessionData.quiz,
        quizDuration: sessionData.quiz?.duration,
        questionsCount: sessionData.questions?.length
      });
      
      if (sessionData.questions) {
        sessionData.questions = sessionData.questions.map(q => ({
          _id: q._id,  // Keep _id for frontend compatibility
          questionId: q.questionId,
          question: q.question,
          options: q.options ? q.options.map(opt => ({ text: opt.text })) : [],
          points: q.points,
          studentAnswer: q.studentAnswer // Keep student's answer if exists
        }));
      }

      res.json({ session: sessionData });

    } catch (error) {
      console.error('Get student session details error:', error);
      res.status(500).json({ message: 'Server error while fetching session details' });
    }
  }
}

module.exports = new QuizSessionController();