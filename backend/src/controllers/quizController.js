const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const Post = require('../models/Post');

class QuizController {
  
  // Helper function to create announcement posts for quizzes
  static async createQuizAnnouncement(quiz, type = 'scheduled') {
    try {
      let content = '';
      let title = '';
      
      if (type === 'scheduled') {
        const startTime = new Date(quiz.scheduledStartTime);
        const endTime = new Date(quiz.scheduledEndTime);
        
        title = `📋 Proctored Quiz Scheduled: ${quiz.title}`;
        content = `📋 **PROCTORED QUIZ SCHEDULED**\n\n` +
                 `**Quiz:** ${quiz.title}\n` +
                 `**Date:** ${startTime.toLocaleDateString('en-US', { 
                   weekday: 'long', 
                   year: 'numeric', 
                   month: 'long', 
                   day: 'numeric' 
                 })}\n` +
                 `**Time:** ${startTime.toLocaleTimeString('en-US', { 
                   hour: '2-digit', 
                   minute: '2-digit',
                   hour12: true 
                 })} - ${endTime.toLocaleTimeString('en-US', { 
                   hour: '2-digit', 
                   minute: '2-digit',
                   hour12: true 
                 })}\n` +
                 `**Duration:** ${quiz.durationFormatted}\n` +
                 `**Questions:** ${quiz.questions.length}\n` +
                 `**Total Points:** ${quiz.totalPoints}\n` +
                 `**Passing Score:** ${quiz.passingScore}%\n\n`;
        
        if (quiz.description) {
          content += `**About:** ${quiz.description}\n\n`;
        }
        
        content += `🔒 **PROCTORED ENVIRONMENT**\n` +
                  `This quiz requires proctoring supervision:\n` +
                  `• 📷 Camera access required\n` +
                  `• 🎤 Microphone monitoring enabled\n` +
                  `• 🏠 Room scan before starting\n` +
                  `• 🚫 Tab switching is monitored\n` +
                  `• 🔒 Browser will be locked during the quiz\n\n` +
                  `📚 **Preparation Tips:**\n` +
                  `• Find a quiet, well-lit room\n` +
                  `• Remove any unauthorized materials\n` +
                  `• Test your camera and microphone\n` +
                  `• Close all other applications\n` +
                  `• Have your student ID ready\n\n` +
                  `⚠️ **Important:** Any suspicious behavior will be flagged for review.\n\n` +
                  `Good luck! 🎓`;
                  
      } else if (type === 'started') {
        title = `🔴 QUIZ LIVE: ${quiz.title}`;
        content = `🔴 **PROCTORED QUIZ IS NOW LIVE**\n\n` +
                 `**Quiz:** ${quiz.title}\n` +
                 `**Status:** Available for attempt\n` +
                 `**Deadline:** ${new Date(quiz.scheduledEndTime).toLocaleString()}\n\n` +
                 `📋 **Ready to take the quiz?**\n` +
                 `1. Go to the "Quizzes" tab\n` +
                 `2. Click "Start Quiz" next to this quiz\n` +
                 `3. Complete identity verification\n` +
                 `4. Perform room scan\n` +
                 `5. Begin your proctored quiz\n\n` +
                 `⏰ Don't wait too long - quiz window is limited!`;
                 
      } else if (type === 'ended') {
        title = `✅ Quiz Completed: ${quiz.title}`;
        content = `✅ **PROCTORED QUIZ COMPLETED**\n\n` +
                 `**Quiz:** ${quiz.title}\n` +
                 `**Completed:** ${new Date().toLocaleString()}\n` +
                 `**Attempted by:** ${quiz.totalStudentsAttempted}/${quiz.totalStudentsInvited} students\n`;
        
        if (quiz.totalStudentsCompleted > 0) {
          content += `**Average Score:** ${quiz.averageScore.toFixed(1)}%\n`;
        }
        
        content += `\n📊 **Next Steps:**\n` +
                  `• All submissions are under review\n` +
                  `• Proctoring data is being analyzed\n` +
                  `• Results will be published after verification\n` +
                  `• Students will be notified of their scores\n\n` +
                  `Thank you for maintaining academic integrity! 🎓`;
      }
      
      // Create the announcement post
      const announcementPost = new Post({
        classroom: quiz.classroom,
        author: quiz.teacher,
        title: title,
        content: content,
        type: 'announcement',
        tags: ['quiz', 'proctored', type, 'important'],
        metadata: {
          quizId: quiz._id,
          quizType: type,
          scheduledTime: quiz.scheduledStartTime,
          isProctored: quiz.isProctored
        },
        isUrgent: type === 'started'
      });
      
      await announcementPost.save();
      await announcementPost.populate([
        { path: 'author', select: 'name email profilePicture' },
        { path: 'classroom', select: 'name classCode' }
      ]);
      
      console.log(`Quiz announcement created: ${title}`);
      return announcementPost;
      
    } catch (error) {
      console.error('Error creating quiz announcement:', error);
      return null;
    }
  }

  // Create a new quiz
  async createQuiz(req, res) {
    try {
      const {
        classroomId,
        title,
        description,
        instructions,
        questions,
        scheduledStartTime,
        scheduledEndTime,
        duration,
        passingScore,
        shuffleQuestions,
        shuffleOptions,
        showResults,
        allowReview,
        isProctored,
        proctoringSettings,
        attempts,
        tags,
        difficulty
      } = req.body;

      const teacherId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can create quizzes' });
      }

      // Verify classroom access
      const classroom = await Classroom.findById(classroomId);
      if (!classroom || classroom.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Validate timing
      const startTime = new Date(scheduledStartTime);
      const endTime = new Date(scheduledEndTime);
      const now = new Date();

      if (startTime <= now) {
        return res.status(400).json({ message: 'Quiz start time must be in the future' });
      }

      if (endTime <= startTime) {
        return res.status(400).json({ message: 'Quiz end time must be after start time' });
      }

      // Validate questions
      if (!questions || questions.length === 0) {
        return res.status(400).json({ message: 'Quiz must have at least one question' });
      }

      // Validate each question
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (!question.question || !question.options || question.options.length < 2) {
          return res.status(400).json({ 
            message: `Question ${i + 1} must have a question text and at least 2 options` 
          });
        }
        
        const correctOptions = question.options.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          return res.status(400).json({ 
            message: `Question ${i + 1} must have at least one correct answer` 
          });
        }
      }

      // Get total students for statistics
      const totalStudents = classroom.students ? classroom.students.length : 0;

      const quiz = new Quiz({
        classroom: classroomId,
        teacher: teacherId,
        title,
        description,
        instructions,
        questions,
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
        duration,
        passingScore: passingScore || 60,
        shuffleQuestions: shuffleQuestions !== false,
        shuffleOptions: shuffleOptions !== false,
        showResults: showResults || false,
        allowReview: allowReview || false,
        isProctored: isProctored !== false,
        proctoringSettings: proctoringSettings || {},
        attempts: attempts || 1,
        totalStudentsInvited: totalStudents,
        tags: tags || [],
        difficulty: difficulty || 'medium',
        status: 'scheduled'
      });

      await quiz.save();
      await quiz.populate([
        { path: 'teacher', select: 'name email' },
        { path: 'classroom', select: 'name classCode' }
      ]);

      // Create announcement post
      const announcement = await QuizController.createQuizAnnouncement(quiz, 'scheduled');

      res.status(201).json({
        message: 'Quiz created successfully',
        quiz,
        announcement: announcement ? {
          id: announcement._id,
          title: announcement.title
        } : null
      });

    } catch (error) {
      console.error('Create quiz error:', error);
      res.status(500).json({ message: 'Server error while creating quiz' });
    }
  }

  // Get quizzes for a classroom
  async getClassroomQuizzes(req, res) {
    try {
      const { classroomId } = req.params;
      const { status = 'all', limit = 20, page = 1 } = req.query;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Verify access to classroom
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      let hasAccess = false;
      if (userRole === 'teacher') {
        hasAccess = classroom.teacher.toString() === userId.toString();
      } else {
        hasAccess = classroom.students.some(s => s.student.toString() === userId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      let query = { classroom: classroomId };
      
      if (status !== 'all') {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const quizzes = await Quiz.find(query)
        .populate('teacher', 'name email')
        .sort({ scheduledStartTime: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Quiz.countDocuments(query);

      // For students, filter sensitive information and apply session-based filtering
      if (userRole === 'student') {
        // Get student's quiz sessions to determine status
        const QuizSession = require('../models/QuizSession');
        const studentSessions = await QuizSession.find({
          student: userId,
          classroom: classroomId
        }).select('quiz status');

        const sessionMap = {};
        studentSessions.forEach(session => {
          sessionMap[session.quiz.toString()] = session.status;
        });

        let filteredQuizzes = quizzes.map(quiz => {
          const quizData = quiz.toObject();
          // Remove correct answers from questions
          quizData.questions = quizData.questions.map(q => ({
            _id: q._id,
            type: q.type,
            question: q.question,
            options: q.options.map(opt => ({ text: opt.text })),
            points: q.points,
            timeLimit: q.timeLimit
          }));

          // Add session status for filtering
          const sessionStatus = sessionMap[quiz._id.toString()];
          quizData.sessionStatus = sessionStatus;

          return quizData;
        });

        // Apply client-side filtering based on status parameter
        if (status !== 'all') {
          const now = new Date();
          
          filteredQuizzes = filteredQuizzes.filter(quiz => {
            const startTime = new Date(quiz.scheduledStartTime);
            const endTime = new Date(quiz.scheduledEndTime);
            const sessionStatus = quiz.sessionStatus;

            switch (status) {
              case 'available':
                return !sessionStatus && 
                       quiz.status === 'scheduled' && 
                       now >= startTime && 
                       now <= endTime;
              
              case 'attempted':
                return sessionStatus === 'in_progress' || sessionStatus === 'started';
              
              case 'completed':
                return sessionStatus === 'submitted';
              
              default:
                return true;
            }
          });
        }
        
        return res.json({
          quizzes: filteredQuizzes,
          total: filteredQuizzes.length,
          page: parseInt(page),
          pages: Math.ceil(filteredQuizzes.length / parseInt(limit))
        });
      }

      res.json({
        quizzes,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      });

    } catch (error) {
      console.error('Get classroom quizzes error:', error);
      res.status(500).json({ message: 'Server error while fetching quizzes' });
    }
  }

  // Get active quizzes
  async getActiveQuizzes(req, res) {
    try {
      const { classroomId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Verify access
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      let hasAccess = false;
      if (userRole === 'teacher') {
        hasAccess = classroom.teacher.toString() === userId.toString();
      } else {
        hasAccess = classroom.students.some(s => s.student.toString() === userId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      const activeQuizzes = await Quiz.getActiveQuizzes(classroomId);

      // For students, also check if they have already attempted
      if (userRole === 'student') {
        const quizzesWithAttempts = await Promise.all(
          activeQuizzes.map(async (quiz) => {
            const existingSessions = await QuizSession.find({
              quiz: quiz._id,
              student: userId
            }).sort({ attemptNumber: -1 });

            const quizData = quiz.toObject();
            quizData.userAttempts = existingSessions.length;
            quizData.canAttempt = existingSessions.length < quiz.attempts;
            quizData.lastAttempt = existingSessions[0] || null;

            // Remove correct answers
            quizData.questions = quizData.questions.map(q => ({
              _id: q._id,
              type: q.type,
              question: q.question,
              options: q.options.map(opt => ({ text: opt.text })),
              points: q.points,
              timeLimit: q.timeLimit
            }));

            return quizData;
          })
        );

        return res.json({ activeQuizzes: quizzesWithAttempts });
      }

      res.json({ activeQuizzes });

    } catch (error) {
      console.error('Get active quizzes error:', error);
      res.status(500).json({ message: 'Server error while fetching active quizzes' });
    }
  }

  // Update quiz
  async updateQuiz(req, res) {
    try {
      const { quizId } = req.params;
      const teacherId = req.user._id;
      const updates = req.body;

      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }

      if (quiz.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Only the quiz creator can update this quiz' });
      }

      if (quiz.status === 'active') {
        return res.status(400).json({ message: 'Cannot update an active quiz' });
      }

      if (quiz.status === 'ended') {
        return res.status(400).json({ message: 'Cannot update an ended quiz' });
      }

      // Check if any students have started the quiz
      const existingSessions = await QuizSession.countDocuments({ quiz: quizId });
      if (existingSessions > 0) {
        return res.status(400).json({ 
          message: 'Cannot update quiz after students have started attempting it' 
        });
      }

      // Update allowed fields
      const allowedUpdates = [
        'title', 'description', 'instructions', 'questions', 
        'scheduledStartTime', 'scheduledEndTime', 'duration',
        'passingScore', 'shuffleQuestions', 'shuffleOptions',
        'showResults', 'allowReview', 'proctoringSettings',
        'attempts', 'tags', 'difficulty'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          quiz[field] = updates[field];
        }
      });

      // Validate timing if updated
      if (updates.scheduledStartTime || updates.scheduledEndTime) {
        const startTime = new Date(quiz.scheduledStartTime);
        const endTime = new Date(quiz.scheduledEndTime);
        const now = new Date();

        if (startTime <= now) {
          return res.status(400).json({ message: 'Quiz start time must be in the future' });
        }

        if (endTime <= startTime) {
          return res.status(400).json({ message: 'Quiz end time must be after start time' });
        }
      }

      await quiz.save();

      res.json({
        message: 'Quiz updated successfully',
        quiz
      });

    } catch (error) {
      console.error('Update quiz error:', error);
      res.status(500).json({ message: 'Server error while updating quiz' });
    }
  }

  // Delete quiz
  async deleteQuiz(req, res) {
    try {
      const { quizId } = req.params;
      const teacherId = req.user._id;

      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }

      if (quiz.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Only the quiz creator can delete this quiz' });
      }

      if (quiz.status === 'active') {
        return res.status(400).json({ message: 'Cannot delete an active quiz. Please end it first.' });
      }

      // Check if any students have completed the quiz
      const completedSessions = await QuizSession.countDocuments({ 
        quiz: quizId, 
        status: { $in: ['submitted', 'completed'] }
      });

      if (completedSessions > 0) {
        // Cancel instead of delete if students have completed attempts
        quiz.status = 'cancelled';
        await quiz.save();
        
        res.json({
          message: 'Quiz cancelled successfully (students had completed attempts)'
        });
      } else {
        // Delete quiz and all related sessions
        await QuizSession.deleteMany({ quiz: quizId });
        await Quiz.findByIdAndDelete(quizId);
        
        res.json({
          message: 'Quiz deleted successfully'
        });
      }

    } catch (error) {
      console.error('Delete quiz error:', error);
      res.status(500).json({ message: 'Server error while deleting quiz' });
    }
  }

  // Get quiz details
  async getQuiz(req, res) {
    try {
      const { quizId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const quiz = await Quiz.findById(quizId)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode students');

      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }

      // Check access
      let hasAccess = false;
      if (userRole === 'teacher') {
        hasAccess = quiz.teacher._id.toString() === userId.toString();
      } else {
        hasAccess = quiz.classroom.students.some(s => 
          s.student.toString() === userId.toString()
        );
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this quiz' });
      }

      // For students, filter sensitive information
      if (userRole === 'student') {
        const quizData = quiz.toObject();
        
        // Remove correct answers from questions
        quizData.questions = quizData.questions.map(q => ({
          _id: q._id,
          type: q.type,
          question: q.question,
          options: q.options.map(opt => ({ text: opt.text })),
          points: q.points,
          timeLimit: q.timeLimit
        }));

        // Add user's attempt information
        const userSessions = await QuizSession.find({
          quiz: quizId,
          student: userId
        }).sort({ attemptNumber: -1 });

        quizData.userAttempts = userSessions.length;
        quizData.canAttempt = userSessions.length < quiz.attempts && quiz.canAttempt();
        quizData.lastAttempt = userSessions[0] || null;

        res.json({ quiz: quizData });
      } else {
        res.json({ quiz });
      }

    } catch (error) {
      console.error('Get quiz error:', error);
      res.status(500).json({ message: 'Server error while fetching quiz details' });
    }
  }
}

module.exports = new QuizController();