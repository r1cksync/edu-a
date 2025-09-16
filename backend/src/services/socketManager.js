const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketManager {
  constructor() {
    this.io = null;
    this.connections = new Map(); // userId -> socket
    this.activeQuizSessions = new Map(); // sessionId -> { teacherId, studentId, socket }
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.isActive) {
          return next(new Error('Authentication error'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.name} connected:`, socket.id);
      this.connections.set(socket.userId, socket);

      // Handle joining quiz monitoring room (for teachers)
      socket.on('join-quiz-monitoring', (data) => {
        const { quizId, classroomId } = data;
        if (socket.user.role === 'teacher') {
          socket.join(`quiz-monitoring-${quizId}`);
          console.log(`Teacher ${socket.user.name} joined monitoring for quiz ${quizId}`);
        }
      });

      // Handle starting quiz session (for students)
      socket.on('start-quiz-session', (data) => {
        const { sessionId, quizId, classroomId } = data;
        if (socket.user.role === 'student') {
          socket.join(`quiz-session-${sessionId}`);
          
          // Store active session
          this.activeQuizSessions.set(sessionId, {
            sessionId,
            quizId,
            classroomId,
            studentId: socket.userId,
            studentSocket: socket,
            startTime: new Date()
          });

          // Notify teachers monitoring this quiz
          socket.to(`quiz-monitoring-${quizId}`).emit('student-started-quiz', {
            sessionId,
            studentId: socket.userId,
            studentName: socket.user.name,
            startTime: new Date()
          });

          console.log(`Student ${socket.user.name} started quiz session ${sessionId}`);
        }
      });

      // Handle real-time violation reports
      socket.on('violation-detected', (data) => {
        const { sessionId, violation } = data;
        const session = this.activeQuizSessions.get(sessionId);
        
        if (session && socket.user.role === 'student') {
          // Notify teachers monitoring this quiz
          socket.to(`quiz-monitoring-${session.quizId}`).emit('violation-alert', {
            sessionId,
            studentId: socket.userId,
            studentName: socket.user.name,
            violation,
            timestamp: new Date()
          });

          console.log(`Violation detected in session ${sessionId}:`, violation.type);
        }
      });

      // Handle quiz progress updates
      socket.on('quiz-progress', (data) => {
        const { sessionId, currentQuestion, answeredQuestions, timeRemaining } = data;
        const session = this.activeQuizSessions.get(sessionId);
        
        if (session && socket.user.role === 'student') {
          // Notify teachers monitoring this quiz
          socket.to(`quiz-monitoring-${session.quizId}`).emit('student-progress', {
            sessionId,
            studentId: socket.userId,
            studentName: socket.user.name,
            currentQuestion,
            answeredQuestions,
            timeRemaining,
            timestamp: new Date()
          });
        }
      });

      // Handle quiz completion
      socket.on('quiz-completed', (data) => {
        const { sessionId } = data;
        const session = this.activeQuizSessions.get(sessionId);
        
        if (session && socket.user.role === 'student') {
          // Notify teachers monitoring this quiz
          socket.to(`quiz-monitoring-${session.quizId}`).emit('student-completed-quiz', {
            sessionId,
            studentId: socket.userId,
            studentName: socket.user.name,
            completedAt: new Date(),
            duration: new Date() - session.startTime
          });

          // Clean up session
          this.activeQuizSessions.delete(sessionId);
          socket.leave(`quiz-session-${sessionId}`);
          
          console.log(`Student ${socket.user.name} completed quiz session ${sessionId}`);
        }
      });

      // Handle teacher intervention
      socket.on('teacher-intervention', (data) => {
        const { sessionId, action, message } = data;
        const session = this.activeQuizSessions.get(sessionId);
        
        if (session && socket.user.role === 'teacher') {
          // Send intervention to student
          if (session.studentSocket) {
            session.studentSocket.emit('teacher-intervention', {
              action, // 'warning', 'pause', 'terminate'
              message,
              timestamp: new Date()
            });
          }

          console.log(`Teacher intervention in session ${sessionId}: ${action}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.name} disconnected:`, socket.id);
        this.connections.delete(socket.userId);
        
        // Clean up active quiz sessions if student disconnected
        for (const [sessionId, session] of this.activeQuizSessions.entries()) {
          if (session.studentId === socket.userId) {
            // Notify teachers about unexpected disconnection
            socket.to(`quiz-monitoring-${session.quizId}`).emit('student-disconnected', {
              sessionId,
              studentId: socket.userId,
              studentName: socket.user.name,
              disconnectedAt: new Date()
            });
            
            this.activeQuizSessions.delete(sessionId);
            break;
          }
        }
      });
    });

    console.log('Socket.IO server initialized');
  }

  // Method to send notifications to specific users
  notifyUser(userId, event, data) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }

  // Method to notify all teachers monitoring a quiz
  notifyQuizMonitors(quizId, event, data) {
    this.io.to(`quiz-monitoring-${quizId}`).emit(event, data);
  }

  // Method to get active quiz sessions
  getActiveQuizSessions() {
    return Array.from(this.activeQuizSessions.values()).map(session => ({
      sessionId: session.sessionId,
      quizId: session.quizId,
      studentId: session.studentId,
      startTime: session.startTime
    }));
  }
}

module.exports = new SocketManager();