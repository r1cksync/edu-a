const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  classCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    screeningTestCompleted: {
      type: Boolean,
      default: false
    },
    screeningTestScore: {
      type: Number,
      default: 0
    }
  }],
  // Classroom settings
  isActive: {
    type: Boolean,
    default: true
  },
  allowStudentPosts: {
    type: Boolean,
    default: true
  },
  allowStudentComments: {
    type: Boolean,
    default: true
  },
  // Advanced features
  screeningTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    default: null
  },
  // Meeting/Class settings
  meetingRoom: {
    roomId: String,
    isActive: Boolean,
    scheduledAt: Date,
    duration: Number, // in minutes
    attendees: [{
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      joinedAt: Date,
      leftAt: Date,
      duration: Number // in minutes
    }]
  },
  // Statistics
  totalAssignments: {
    type: Number,
    default: 0
  },
  totalPosts: {
    type: Number,
    default: 0
  },
  averageAttendance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
classroomSchema.index({ classCode: 1 });
classroomSchema.index({ teacher: 1 });
classroomSchema.index({ 'students.student': 1 });

// Generate unique class code
classroomSchema.statics.generateClassCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Method to add student to classroom
classroomSchema.methods.addStudent = function(studentId) {
  const isEnrolled = this.students.some(s => s.student.toString() === studentId.toString());
  if (!isEnrolled) {
    this.students.push({ student: studentId });
  }
  return this.save();
};

// Method to remove student from classroom
classroomSchema.methods.removeStudent = function(studentId) {
  this.students = this.students.filter(s => s.student.toString() !== studentId.toString());
  return this.save();
};

// Method to update student level
classroomSchema.methods.updateStudentLevel = function(studentId, level) {
  const student = this.students.find(s => s.student.toString() === studentId.toString());
  if (student) {
    student.level = level;
  }
  return this.save();
};

module.exports = mongoose.model('Classroom', classroomSchema);