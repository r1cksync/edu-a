const mongoose = require('mongoose');

const screeningTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  questions: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    points: {
      type: Number,
      default: 1,
      min: 0
    },
    timeLimit: {
      type: Number, // in seconds per question
      default: 60
    }
  }],
  totalTimeLimit: {
    type: Number, // total test time in minutes
    required: true,
    min: 1
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  settings: {
    allowMultipleAttempts: {
      type: Boolean,
      default: true
    },
    showResultsImmediately: {
      type: Boolean,
      default: true
    },
    showCorrectAnswers: {
      type: Boolean,
      default: false
    },
    shuffleQuestions: {
      type: Boolean,
      default: true
    },
    shuffleOptions: {
      type: Boolean,
      default: true
    },
    preventBackNavigation: {
      type: Boolean,
      default: false
    }
  },
  questionDistribution: {
    quantitative: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 }
    },
    logical: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 }
    },
    verbal: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 }
    }
  },
  analytics: {
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 }, // in minutes
    completionRate: { type: Number, default: 0 },
    participantCount: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
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

// Calculate total points before saving
screeningTestSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((total, q) => total + q.points, 0);
  
  // Update question distribution
  this.questionDistribution = {
    quantitative: { easy: 0, medium: 0, hard: 0 },
    logical: { easy: 0, medium: 0, hard: 0 },
    verbal: { easy: 0, medium: 0, hard: 0 }
  };
  
  next();
});

// Indexes for efficient querying
screeningTestSchema.index({ teacher: 1, classroom: 1 });
screeningTestSchema.index({ isActive: 1 });
screeningTestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ScreeningTest', screeningTestSchema);