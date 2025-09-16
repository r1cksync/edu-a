const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'single-choice'],
    default: 'multiple-choice'
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  explanation: {
    type: String,
    default: ''
  },
  points: {
    type: Number,
    default: 1,
    min: 0
  },
  timeLimit: {
    type: Number, // in seconds
    default: 60
  }
}, { _id: true });

const proctoringSettingsSchema = new mongoose.Schema({
  faceDetection: {
    type: Boolean,
    default: true
  },
  tabSwitchingDetection: {
    type: Boolean,
    default: true
  },
  audioMonitoring: {
    type: Boolean,
    default: true
  },
  screenRecording: {
    type: Boolean,
    default: false
  },
  roomScan: {
    type: Boolean,
    default: true
  },
  multiplePersonDetection: {
    type: Boolean,
    default: true
  },
  browserLockdown: {
    type: Boolean,
    default: true
  },
  allowedTabSwitches: {
    type: Number,
    default: 3
  },
  allowedLookAways: {
    type: Number,
    default: 5
  },
  suspiciousBehaviorThreshold: {
    type: Number,
    default: 3
  }
}, { _id: false });

const quizSchema = new mongoose.Schema({
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  instructions: {
    type: String,
    default: 'Read each question carefully and select the best answer. You cannot go back to previous questions once submitted.'
  },
  questions: [questionSchema],
  
  // Scheduling
  scheduledStartTime: {
    type: Date,
    required: true
  },
  scheduledEndTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 1,
    max: 480 // 8 hours max
  },
  
  // Quiz Settings
  totalPoints: {
    type: Number,
    default: 0
  },
  passingScore: {
    type: Number,
    default: 60 // percentage
  },
  shuffleQuestions: {
    type: Boolean,
    default: true
  },
  shuffleOptions: {
    type: Boolean,
    default: true
  },
  showResults: {
    type: Boolean,
    default: false // Show results immediately after submission
  },
  allowReview: {
    type: Boolean,
    default: false // Allow reviewing answers after submission
  },
  
  // Proctoring Settings
  isProctored: {
    type: Boolean,
    default: true
  },
  proctoringSettings: proctoringSettingsSchema,
  
  // Access Control
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'ended', 'cancelled'],
    default: 'draft'
  },
  attempts: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  
  // Statistics
  totalStudentsInvited: {
    type: Number,
    default: 0
  },
  totalStudentsAttempted: {
    type: Number,
    default: 0
  },
  totalStudentsCompleted: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  
  // Metadata
  tags: [String],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for quiz duration in hours and minutes
quizSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

// Virtual for checking if quiz is currently active
quizSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.scheduledStartTime && 
         now <= this.scheduledEndTime;
});

// Virtual for checking if quiz is upcoming
quizSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  return this.status === 'scheduled' && now < this.scheduledStartTime;
});

// Pre-save middleware to calculate total points
quizSchema.pre('save', function(next) {
  if (this.isModified('questions')) {
    this.totalPoints = this.questions.reduce((total, question) => total + question.points, 0);
  }
  next();
});

// Instance methods
quizSchema.methods.canAttempt = function() {
  const now = new Date();
  return this.status === 'scheduled' && 
         now >= this.scheduledStartTime && 
         now <= this.scheduledEndTime;
};

quizSchema.methods.startQuiz = function() {
  this.status = 'active';
  return this.save();
};

quizSchema.methods.endQuiz = function() {
  this.status = 'ended';
  return this.save();
};

quizSchema.methods.getShuffledQuestions = function() {
  if (!this.shuffleQuestions) return this.questions;
  
  const shuffled = [...this.questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  if (this.shuffleOptions) {
    shuffled.forEach(question => {
      const options = [...question.options];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      question.options = options;
    });
  }
  
  return shuffled;
};

// Static methods
quizSchema.statics.getActiveQuizzes = function(classroomId) {
  const now = new Date();
  return this.find({
    classroom: classroomId,
    status: 'scheduled',
    scheduledStartTime: { $lte: now },
    scheduledEndTime: { $gte: now }
  }).populate('teacher', 'name email');
};

quizSchema.statics.getUpcomingQuizzes = function(classroomId) {
  const now = new Date();
  return this.find({
    classroom: classroomId,
    status: 'scheduled',
    scheduledStartTime: { $gt: now }
  }).populate('teacher', 'name email').sort({ scheduledStartTime: 1 });
};

// Indexes
quizSchema.index({ classroom: 1, status: 1 });
quizSchema.index({ teacher: 1, status: 1 });
quizSchema.index({ scheduledStartTime: 1, scheduledEndTime: 1 });
quizSchema.index({ status: 1, scheduledStartTime: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;