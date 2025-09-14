const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
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
  // Assignment settings
  type: {
    type: String,
    enum: ['assignment', 'quiz', 'test', 'mcq', 'file'],
    default: 'assignment'
  },
  totalPoints: {
    type: Number,
    default: 100
  },
  dueDate: {
    type: Date,
    required: true
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  // Level-based assignment
  targetLevels: [{
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  }],
  // File attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileKey: String, // S3 key or local file path for file management
    fileSize: Number,
    fileType: String,
    mimeType: String, // Added for better file type handling
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Instructions
  instructions: {
    type: String,
    trim: true
  },
  // Rubric for grading
  rubric: [{
    criteria: String,
    points: Number,
    description: String
  }],
  // Quiz/Test specific fields
  questions: [{
    question: String,
    type: {
      type: String,
      enum: ['multiple-choice', 'short-answer', 'essay', 'true-false']
    },
    options: [String], // for multiple choice
    correctAnswer: String,
    points: Number,
    explanation: String
  }],
  timeLimit: {
    type: Number, // in minutes
    default: null
  },
  // Proctoring settings (for advanced features)
  isProctoredTest: {
    type: Boolean,
    default: false
  },
  proctoringSettings: {
    requireCamera: { type: Boolean, default: false },
    requireMicrophone: { type: Boolean, default: false },
    preventTabSwitching: { type: Boolean, default: false },
    recordSession: { type: Boolean, default: false }
  },
  // Status
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
assignmentSchema.index({ classroom: 1, dueDate: 1 });
assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ targetLevels: 1 });

// Virtual for submissions
assignmentSchema.virtual('submissions', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'assignment'
});

assignmentSchema.set('toObject', { virtuals: true });
assignmentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Assignment', assignmentSchema);