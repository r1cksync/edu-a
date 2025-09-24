const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedOptions: [{
    type: String,
    required: true
  }],
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const proctoringDataSchema = new mongoose.Schema({
  // Face Detection Data
  faceDetected: {
    type: Boolean,
    default: true
  },
  multipleFacesDetected: {
    type: Boolean,
    default: false
  },
  faceConfidence: {
    type: Number,
    default: 0
  },
  
  // Behavioral Data
  tabSwitches: {
    type: Number,
    default: 0
  },
  lookAwayCount: {
    type: Number,
    default: 0
  },
  lookAwayDuration: {
    type: Number, // total seconds
    default: 0
  },
  suspiciousMovements: {
    type: Number,
    default: 0
  },
  
  // Audio Data
  speechDetected: {
    type: Boolean,
    default: false
  },
  multipleVoicesDetected: {
    type: Boolean,
    default: false
  },
  noiseLevel: {
    type: Number,
    default: 0
  },
  
  // Environment Data
  roomScanCompleted: {
    type: Boolean,
    default: false
  },
  environmentFlags: [String], // ["multiple_monitors", "books_detected", etc.]
  
  // Browser Security
  fullscreenExited: {
    type: Number,
    default: 0
  },
  rightClickAttempts: {
    type: Number,
    default: 0
  },
  keyboardShortcuts: {
    type: Number,
    default: 0
  },
  
  // Technical Data
  cameraEnabled: {
    type: Boolean,
    default: false
  },
  microphoneEnabled: {
    type: Boolean,
    default: false
  },
  screenRecordingEnabled: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'tab_switch',
      'multiple_faces',
      'no_face_detected',
      'look_away',
      'speech_detected',
      'multiple_voices',
      'fullscreen_exit',
      'right_click',
      'keyboard_shortcut',
      'suspicious_behavior',
      'camera_disabled',
      'microphone_disabled',
      'environment_flag'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  questionNumber: {
    type: Number,
    default: 0
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  resolvedNote: {
    type: String
  }
}, { _id: true });

const quizSessionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  
  // Session Status
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'submitted', 'under_review', 'completed', 'flagged', 'cancelled'],
    default: 'not_started'
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Timing
  startedAt: {
    type: Date
  },
  submittedAt: {
    type: Date
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  timeRemaining: {
    type: Number, // in seconds
    default: 0
  },
  
  // Quiz Data
  questions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    question: {
      type: String,
      required: true
    },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    points: {
      type: Number,
      default: 1
    }
  }],
  answers: [answerSchema],
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  
  // Scoring
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  
  // Proctoring Data
  isProctored: {
    type: Boolean,
    default: true
  },
  proctoringData: proctoringDataSchema,
  violations: [violationSchema],
  violationCount: {
    type: Number,
    default: 0
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Identity Verification
  identityVerified: {
    type: Boolean,
    default: false
  },
  identityPhotos: [{
    photoUrl: String,
    timestamp: { type: Date, default: Date.now },
    confidence: Number
  }],
  roomScanPhotos: [{
    photoUrl: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Review Data
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_manual_review'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String
  },
  finalDecision: {
    type: String,
    enum: ['accept', 'reject', 'partial_credit', 'retake_required'],
    default: 'accept'
  },
  
  // Technical Data
  browserInfo: {
    userAgent: String,
    platform: String,
    language: String,
    timezone: String
  },
  ipAddress: {
    type: String
  },
  deviceFingerprint: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true,getters: true },
  toObject: { virtuals: true,getters: true }
});

// Virtual for formatted time spent
quizSessionSchema.virtual('timeSpentFormatted').get(function() {
  const hours = Math.floor(this.timeSpent / 3600);
  const minutes = Math.floor((this.timeSpent % 3600) / 60);
  const seconds = this.timeSpent % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

// Virtual for violation summary
quizSessionSchema.virtual('violationSummary').get(function() {
  const summary = {};
  this.violations.forEach(violation => {
    summary[violation.type] = (summary[violation.type] || 0) + 1;
  });
  return summary;
});

// Instance methods
quizSessionSchema.methods.startSession = function() {
  this.status = 'in_progress';
  this.startedAt = new Date();
  return this.save();
};

quizSessionSchema.methods.submitSession = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.timeSpent = Math.floor((this.submittedAt - this.startedAt) / 1000);
  this.calculateScore();
  this.calculateRiskScore();
  return this.save();
};

quizSessionSchema.methods.calculateScore = function() {
  this.pointsEarned = this.answers.reduce((total, answer) => total + answer.pointsEarned, 0);
  this.percentage = this.totalPoints > 0 ? Math.round((this.pointsEarned / this.totalPoints) * 100) : 0;
  this.score = this.percentage;
  return this.percentage;
};

quizSessionSchema.methods.calculateRiskScore = function() {
  let risk = 0;
  
  // Calculate risk based on violations
  this.violations.forEach(violation => {
    switch (violation.severity) {
      case 'low': risk += 5; break;
      case 'medium': risk += 15; break;
      case 'high': risk += 30; break;
      case 'critical': risk += 50; break;
    }
  });
  
  // Additional risk factors
  if (this.proctoringData.tabSwitches > 5) risk += 20;
  if (this.proctoringData.lookAwayCount > 10) risk += 15;
  if (this.proctoringData.multipleFacesDetected) risk += 25;
  if (!this.proctoringData.faceDetected) risk += 40;
  
  this.riskScore = Math.min(risk, 100);
  
  // Auto-flag high-risk sessions
  if (this.riskScore >= 70) {
    this.status = 'flagged';
    this.reviewStatus = 'needs_manual_review';
  }
  
  return this.riskScore;
};

quizSessionSchema.methods.addViolation = function(violationData) {
  this.violations.push(violationData);
  this.violationCount = this.violations.length;
  this.calculateRiskScore();
  return this.save();
};

quizSessionSchema.methods.nextQuestion = function() {
  this.currentQuestionIndex += 1;
  return this.save();
};

quizSessionSchema.methods.submitAnswer = function(questionId, selectedOptions, timeSpent) {
  const questionIndex = this.questions.findIndex(q => q.questionId.toString() === questionId.toString());
  
  if (questionIndex === -1) {
    throw new Error('Question not found');
  }
  
  const question = this.questions[questionIndex];
  const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt.text);
  
  // Check if answer is correct
  const isCorrect = selectedOptions.length === correctOptions.length &&
                   selectedOptions.every(option => correctOptions.includes(option));
  
  const pointsEarned = isCorrect ? question.points : 0;
  
  const answer = {
    questionId,
    selectedOptions,
    timeSpent,
    isCorrect,
    pointsEarned,
    submittedAt: new Date()
  };
  
  // Remove existing answer for this question if any
  this.answers = this.answers.filter(a => a.questionId.toString() !== questionId.toString());
  this.answers.push(answer);
  
  return this.save();
};

// Static methods
quizSessionSchema.statics.getActiveSession = function(quizId, studentId) {
  return this.findOne({
    quiz: quizId,
    student: studentId,
    status: 'in_progress'
  });
};

quizSessionSchema.statics.getSessionsForReview = function(classroomId) {
  return this.find({
    classroom: classroomId,
    status: { $in: ['submitted', 'flagged'] },
    reviewStatus: { $in: ['pending', 'needs_manual_review'] }
  }).populate('student', 'name email')
    .populate('quiz', 'title')
    .sort({ submittedAt: 1 });
};

// Indexes
quizSessionSchema.index({ quiz: 1, student: 1 });
quizSessionSchema.index({ classroom: 1, status: 1 });
quizSessionSchema.index({ status: 1, reviewStatus: 1 });
quizSessionSchema.index({ student: 1, status: 1 });
quizSessionSchema.index({ riskScore: -1 });

const QuizSession = mongoose.model('QuizSession', quizSessionSchema);

module.exports = QuizSession;