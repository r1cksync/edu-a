const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Submission content
  content: {
    type: String,
    trim: true
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String,
    fileKey: String, // S3 key for file management
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Quiz/Test answers
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    answer: String,
    isCorrect: Boolean,
    pointsEarned: Number
  }],
  // Submission status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned'],
    default: 'draft'
  },
  submittedAt: {
    type: Date
  },
  isLateSubmission: {
    type: Boolean,
    default: false
  },
  // Grading
  grade: {
    points: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    letterGrade: String,
    feedback: String,
    rubricScores: [{
      criteria: String,
      pointsEarned: Number,
      feedback: String
    }]
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  },
  // Test/Quiz specific
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  // AI Analysis (for advanced features)
  aiAnalysis: {
    strengths: [String],
    weaknesses: [String],
    suggestions: [String],
    practiceQuestions: [String],
    performanceScore: Number,
    detailedFeedback: String
  },
  // Proctoring data (for advanced features)
  proctoringData: {
    violations: [{
      type: String, // 'tab-switch', 'face-not-detected', 'multiple-faces', etc.
      timestamp: Date,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }],
    sessionRecording: String, // URL to recorded session
    screenshots: [String], // URLs to screenshots taken during test
    totalViolations: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ student: 1, status: 1 });
submissionSchema.index({ assignment: 1, submittedAt: -1 });

// Calculate grade percentage
submissionSchema.methods.calculateGrade = function(totalPoints) {
  if (this.grade.points && totalPoints > 0) {
    this.grade.percentage = (this.grade.points / totalPoints) * 100;
    
    // Calculate letter grade
    if (this.grade.percentage >= 90) this.grade.letterGrade = 'A';
    else if (this.grade.percentage >= 80) this.grade.letterGrade = 'B';
    else if (this.grade.percentage >= 70) this.grade.letterGrade = 'C';
    else if (this.grade.percentage >= 60) this.grade.letterGrade = 'D';
    else this.grade.letterGrade = 'F';
  }
};

// Mark as submitted
submissionSchema.methods.submit = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.completedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Submission', submissionSchema);