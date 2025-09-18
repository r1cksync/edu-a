const mongoose = require('mongoose');

const dppSubmissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // For MCQ type DPPs
  answers: [{
    questionIndex: {
      type: Number,
      required: true
    },
    selectedOption: {
      type: String,
      required: true
    }
  }],
  // For file-based DPPs
  fileSubmissions: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    assignmentFileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false // For tracking which assignment file this submission is for
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: false // Will be populated from assignment file
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true
  },
  isLate: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: String,
    trim: true
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const mcqQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  explanation: {
    type: String,
    trim: true
  },
  marks: {
    type: Number,
    default: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    default: 'medium'
  }
});

const dppSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  videoClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoClass',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['mcq', 'file'],
    required: true
  },
  // For MCQ type DPPs
  questions: [mcqQuestionSchema],
  // For file-based DPPs
  assignmentFiles: [{
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    points: {
      type: Number,
      default: 10
    }
  }],
  instructions: {
    type: String,
    trim: true
  },
  allowedFileTypes: [{
    type: String,
    trim: true
  }],
  maxFileSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB default
  },
  maxFiles: {
    type: Number,
    default: 5
  },
  dueDate: {
    type: Date,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  submissions: [dppSubmissionSchema],
  tags: [{
    type: String,
    trim: true
  }],
  estimatedTime: {
    type: Number, // in minutes
    default: 30
  }
}, {
  timestamps: true
});

// Virtual to get submission count
dppSchema.virtual('submissionCount').get(function() {
  return this.submissions.length;
});

// Virtual to get on-time submission count
dppSchema.virtual('onTimeSubmissionCount').get(function() {
  return this.submissions.filter(sub => !sub.isLate).length;
});

// Virtual to get average score
dppSchema.virtual('averageScore').get(function() {
  if (this.submissions.length === 0) return 0;
  const totalScore = this.submissions.reduce((sum, sub) => sum + sub.score, 0);
  return (totalScore / this.submissions.length).toFixed(2);
});

// Virtual to check if DPP is overdue
dppSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Virtual to get difficulty distribution
dppSchema.virtual('difficultyDistribution').get(function() {
  const distribution = { easy: 0, medium: 0, hard: 0 };
  
  if (this.type === 'mcq') {
    this.questions.forEach(question => {
      distribution[question.difficulty]++;
    });
  } else if (this.type === 'file') {
    this.assignmentFiles.forEach(file => {
      distribution[file.difficulty]++;
    });
  }
  
  return distribution;
});

// Virtual to get overall difficulty level based on content
dppSchema.virtual('overallDifficulty').get(function() {
  const dist = this.difficultyDistribution;
  const total = dist.easy + dist.medium + dist.hard;
  
  if (total === 0) return 'medium';
  
  const hardPercentage = (dist.hard / total) * 100;
  const easyPercentage = (dist.easy / total) * 100;
  
  if (hardPercentage >= 50) return 'hard';
  if (easyPercentage >= 50) return 'easy';
  return 'medium';
});

// Index for efficient queries
dppSchema.index({ classroom: 1, createdAt: -1 });
dppSchema.index({ videoClass: 1 });
dppSchema.index({ teacher: 1, createdAt: -1 });
dppSchema.index({ dueDate: 1 });

// Static method to get DPPs for a classroom
dppSchema.statics.getClassroomDPPs = function(classroomId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = -1,
    status = 'all' // 'all', 'active', 'overdue', 'upcoming'
  } = options;

  const query = { classroom: classroomId, isPublished: true };
  
  // Add status-based filtering
  if (status === 'active') {
    query.dueDate = { $gte: new Date() };
  } else if (status === 'overdue') {
    query.dueDate = { $lt: new Date() };
  }

  return this.find(query)
    .populate('teacher', 'name email')
    .populate('videoClass', 'title meetingUrl')
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to create DPP with auto due date
dppSchema.statics.createWithAutoDueDate = function(dppData) {
  // Set due date to 1 day from now if not provided
  if (!dppData.dueDate) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // End of day
    dppData.dueDate = tomorrow;
  }

  return this.create(dppData);
};

// Instance method to get student submission
dppSchema.methods.getStudentSubmission = function(studentId) {
  return this.submissions.find(sub => sub.student.toString() === studentId.toString());
};

// Instance method to check if student has submitted
dppSchema.methods.hasStudentSubmitted = function(studentId) {
  return this.submissions.some(sub => sub.student.toString() === studentId.toString());
};

// Instance method to calculate score for MCQ
dppSchema.methods.calculateMCQScore = function(answers) {
  if (this.type !== 'mcq') return 0;

  let score = 0;
  answers.forEach(answer => {
    const question = this.questions[answer.questionIndex];
    if (question) {
      const correctOption = question.options.find(opt => opt.isCorrect);
      if (correctOption && correctOption.text === answer.selectedOption) {
        score += question.marks || 1;
      }
    }
  });

  return score;
};

// Pre-save middleware to calculate maxScore for MCQ
dppSchema.pre('save', function(next) {
  if (this.type === 'mcq' && this.questions && this.questions.length > 0) {
    this.maxScore = this.questions.reduce((total, question) => {
      return total + (question.marks || 1);
    }, 0);
  }
  next();
});

// Pre-save middleware to set publishedAt when publishing
dppSchema.pre('save', function(next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

const DailyPracticeProblem = mongoose.model('DailyPracticeProblem', dppSchema);

module.exports = DailyPracticeProblem;