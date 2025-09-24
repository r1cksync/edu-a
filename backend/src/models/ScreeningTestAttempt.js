const mongoose = require('mongoose');

const questionAttemptSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  selectedAnswer: {
    type: String,
    enum: ['A', 'B', 'C', 'D', null],
    default: null
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  timeSpent: {
    type: Number, // in seconds
    required: true,
    min: 0
  },
  pointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  maxPoints: {
    type: Number,
    required: true,
    min: 0
  },
  visitCount: {
    type: Number,
    default: 1,
    min: 1
  },
  firstVisitTime: {
    type: Date,
    default: Date.now
  },
  lastVisitTime: {
    type: Date,
    default: Date.now
  },
  answerChanges: [{
    previousAnswer: String,
    newAnswer: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, { _id: true });

const screeningTestAttemptSchema = new mongoose.Schema({
  screeningTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScreeningTest',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  totalTimeSpent: {
    type: Number, // in seconds
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0,
    min: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  correctAnswers: {
    type: Number,
    default: 0,
    min: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0,
    min: 0
  },
  skippedQuestions: {
    type: Number,
    default: 0,
    min: 0
  },
  questionAttempts: [questionAttemptSchema],
  
  // Category-wise performance
  categoryPerformance: {
    quantitative: {
      total: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      wrong: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 }, // in seconds
      accuracy: { type: Number, default: 0 }, // percentage
      score: { type: Number, default: 0 }
    },
    logical: {
      total: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      wrong: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    },
    verbal: {
      total: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      wrong: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    }
  },
  
  // Difficulty-wise performance
  difficultyPerformance: {
    easy: {
      total: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      wrong: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    },
    medium: {
      total: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      wrong: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    },
    hard: {
      total: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      wrong: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    }
  },
  
  // Detailed analytics
  analytics: {
    timeSpentPerQuestion: { type: Number, default: 0 }, // average in seconds
    questionNavigationPattern: [{ // track how student navigated through questions
      questionIndex: Number,
      timestamp: Date,
      action: {
        type: String,
        enum: ['visited', 'answered', 'changed', 'skipped', 'reviewed']
      }
    }],
    speedMetrics: {
      fastestQuestion: { time: Number, questionId: String },
      slowestQuestion: { time: Number, questionId: String },
      averageTimePerCategory: {
        quantitative: Number,
        logical: Number,
        verbal: Number
      },
      averageTimePerDifficulty: {
        easy: Number,
        medium: Number,
        hard: Number
      }
    },
    accuracyTrends: {
      firstHalf: { type: Number, default: 0 },
      secondHalf: { type: Number, default: 0 },
      improvementRate: { type: Number, default: 0 }
    },
    confidenceMetrics: {
      questionsRevisited: { type: Number, default: 0 },
      answerChanges: { type: Number, default: 0 },
      timeSpentReviewing: { type: Number, default: 0 }
    }
  },
  
  // Proctoring data (if applicable)
  proctoringData: {
    tabSwitches: { type: Number, default: 0 },
    suspiciousActivity: [{
      type: String,
      timestamp: Date,
      description: String
    }],
    browserEvents: [{
      event: String,
      timestamp: Date
    }]
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate analytics before saving
screeningTestAttemptSchema.pre('save', function(next) {
  if (this.isModified('questionAttempts') || this.isNew) {
    this.calculatePerformanceMetrics();
  }
  next();
});

// Method to calculate performance metrics
screeningTestAttemptSchema.methods.calculatePerformanceMetrics = function() {
  const attempts = this.questionAttempts;
  
  // Reset counters
  this.correctAnswers = 0;
  this.wrongAnswers = 0;
  this.skippedQuestions = 0;
  this.score = 0;
  
  // Reset category performance
  ['quantitative', 'logical', 'verbal'].forEach(category => {
    this.categoryPerformance[category] = {
      total: 0, correct: 0, wrong: 0, skipped: 0,
      averageTime: 0, accuracy: 0, score: 0
    };
  });
  
  // Reset difficulty performance
  ['easy', 'medium', 'hard'].forEach(difficulty => {
    this.difficultyPerformance[difficulty] = {
      total: 0, correct: 0, wrong: 0, skipped: 0,
      averageTime: 0, accuracy: 0, score: 0
    };
  });
  
  let totalTime = 0;
  const categoryTimes = { quantitative: [], logical: [], verbal: [] };
  const difficultyTimes = { easy: [], medium: [], hard: [] };
  
  attempts.forEach(attempt => {
    // Populate question to get category and difficulty - this would need to be done before calling this method
    // For now, we'll calculate based on available data
    
    totalTime += attempt.timeSpent;
    this.score += attempt.pointsEarned;
    
    if (attempt.selectedAnswer === null) {
      this.skippedQuestions++;
    } else if (attempt.isCorrect) {
      this.correctAnswers++;
    } else {
      this.wrongAnswers++;
    }
  });
  
  this.totalTimeSpent = totalTime;
  this.percentage = this.totalQuestions > 0 ? (this.correctAnswers / this.totalQuestions) * 100 : 0;
  
  // Calculate speed metrics
  if (attempts.length > 0) {
    this.analytics.timeSpentPerQuestion = totalTime / attempts.length;
    
    const times = attempts.map(a => a.timeSpent).sort((a, b) => a - b);
    this.analytics.speedMetrics.fastestQuestion = { time: times[0] };
    this.analytics.speedMetrics.slowestQuestion = { time: times[times.length - 1] };
  }
  
  // Calculate accuracy trends
  if (attempts.length >= 2) {
    const halfPoint = Math.floor(attempts.length / 2);
    const firstHalf = attempts.slice(0, halfPoint);
    const secondHalf = attempts.slice(halfPoint);
    
    this.analytics.accuracyTrends.firstHalf = firstHalf.length > 0 ? 
      (firstHalf.filter(a => a.isCorrect).length / firstHalf.length) * 100 : 0;
    this.analytics.accuracyTrends.secondHalf = secondHalf.length > 0 ? 
      (secondHalf.filter(a => a.isCorrect).length / secondHalf.length) * 100 : 0;
    this.analytics.accuracyTrends.improvementRate = 
      this.analytics.accuracyTrends.secondHalf - this.analytics.accuracyTrends.firstHalf;
  }
  
  // Calculate confidence metrics
  this.analytics.confidenceMetrics.questionsRevisited = 
    attempts.filter(a => a.visitCount > 1).length;
  this.analytics.confidenceMetrics.answerChanges = 
    attempts.reduce((total, a) => total + a.answerChanges.length, 0);
};

// Compound indexes for efficient querying
screeningTestAttemptSchema.index({ screeningTest: 1, student: 1, attemptNumber: 1 }, { unique: true });
screeningTestAttemptSchema.index({ student: 1, createdAt: -1 });
screeningTestAttemptSchema.index({ screeningTest: 1, isCompleted: 1 });
screeningTestAttemptSchema.index({ screeningTest: 1, createdAt: -1 });

module.exports = mongoose.model('ScreeningTestAttempt', screeningTestAttemptSchema);