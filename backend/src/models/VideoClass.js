const mongoose = require('mongoose');

const videoClassSchema = new mongoose.Schema({
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
  // Scheduling information
  scheduledStartTime: {
    type: Date,
    required: true
  },
  scheduledEndTime: {
    type: Date,
    required: true
  },
  actualStartTime: {
    type: Date
  },
  actualEndTime: {
    type: Date
  },
  // Class status
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  // Class type
  type: {
    type: String,
    enum: ['instant', 'scheduled'],
    default: 'scheduled'
  },
  // Video call information
  meetingId: {
    type: String,
    unique: true
  },
  meetingPassword: {
    type: String
  },
  meetingUrl: {
    type: String
  },
  // Recording information
  isRecorded: {
    type: Boolean,
    default: false
  },
  recordingUrl: {
    type: String
  },
  recordingDuration: {
    type: Number // in minutes
  },
  // Participants tracking
  participants: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date
    },
    leftAt: {
      type: Date
    },
    duration: {
      type: Number // in minutes
    },
    isPresent: {
      type: Boolean,
      default: false
    }
  }],
  // Attendance summary
  totalStudentsInvited: {
    type: Number,
    default: 0
  },
  totalStudentsAttended: {
    type: Number,
    default: 0
  },
  attendancePercentage: {
    type: Number,
    default: 0
  },
  // Settings
  allowLateJoin: {
    type: Boolean,
    default: true
  },
  maxDuration: {
    type: Number,
    default: 120 // in minutes
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  // Notifications
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
videoClassSchema.index({ classroom: 1, scheduledStartTime: 1 });
videoClassSchema.index({ teacher: 1, status: 1 });
videoClassSchema.index({ status: 1, scheduledStartTime: 1 });
videoClassSchema.index({ meetingId: 1 });

// Virtual for duration
videoClassSchema.virtual('scheduledDuration').get(function() {
  if (this.scheduledStartTime && this.scheduledEndTime) {
    return Math.ceil((this.scheduledEndTime - this.scheduledStartTime) / (1000 * 60)); // in minutes
  }
  return 0;
});

videoClassSchema.virtual('actualDuration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.ceil((this.actualEndTime - this.actualStartTime) / (1000 * 60)); // in minutes
  }
  return 0;
});

// Methods
videoClassSchema.methods.generateMeetingId = function() {
  // Generate a unique meeting ID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  this.meetingId = `${timestamp}-${random}`.toUpperCase();
  return this.meetingId;
};

videoClassSchema.methods.generateMeetingPassword = function() {
  // Generate a 6-digit password
  this.meetingPassword = Math.floor(100000 + Math.random() * 900000).toString();
  return this.meetingPassword;
};

videoClassSchema.methods.startClass = function() {
  this.status = 'live';
  this.actualStartTime = new Date();
  return this.save();
};

videoClassSchema.methods.endClass = function() {
  this.status = 'ended';
  this.actualEndTime = new Date();
  this.calculateAttendance();
  return this.save();
};

videoClassSchema.methods.addParticipant = function(studentId) {
  const existingParticipant = this.participants.find(p => p.student.toString() === studentId.toString());
  
  if (existingParticipant) {
    existingParticipant.joinedAt = new Date();
    existingParticipant.isPresent = true;
  } else {
    this.participants.push({
      student: studentId,
      joinedAt: new Date(),
      isPresent: true
    });
  }
  
  return this.save();
};

videoClassSchema.methods.removeParticipant = function(studentId) {
  const participant = this.participants.find(p => p.student.toString() === studentId.toString());
  
  if (participant && participant.isPresent) {
    participant.leftAt = new Date();
    participant.isPresent = false;
    
    if (participant.joinedAt) {
      participant.duration = Math.ceil((participant.leftAt - participant.joinedAt) / (1000 * 60));
    }
  }
  
  return this.save();
};

videoClassSchema.methods.calculateAttendance = function() {
  this.totalStudentsAttended = this.participants.filter(p => p.joinedAt).length;
  if (this.totalStudentsInvited > 0) {
    this.attendancePercentage = Math.round((this.totalStudentsAttended / this.totalStudentsInvited) * 100);
  }
};

// Pre-save middleware
videoClassSchema.pre('save', function(next) {
  // Generate meeting ID if not exists
  if (!this.meetingId) {
    this.generateMeetingId();
  }
  
  // Generate meeting password if not exists
  if (!this.meetingPassword) {
    this.generateMeetingPassword();
  }
  
  // Set meeting URL (can be customized based on video service)
  if (!this.meetingUrl) {
    this.meetingUrl = `/video-class/${this.meetingId}`;
  }
  
  next();
});

// Static methods
videoClassSchema.statics.getUpcomingClasses = function(classroomId, limit = 10) {
  return this.find({
    classroom: classroomId,
    status: 'scheduled',
    scheduledStartTime: { $gte: new Date() }
  })
  .populate('teacher', 'name email')
  .populate('classroom', 'name classCode')
  .sort({ scheduledStartTime: 1 })
  .limit(limit);
};

videoClassSchema.statics.getLiveClasses = function(classroomId) {
  return this.find({
    classroom: classroomId,
    status: 'live'
  })
  .populate('teacher', 'name email')
  .populate('classroom', 'name classCode');
};

videoClassSchema.statics.getClassHistory = function(classroomId, limit = 20) {
  return this.find({
    classroom: classroomId,
    status: 'ended'
  })
  .populate('teacher', 'name email')
  .populate('classroom', 'name classCode')
  .sort({ actualEndTime: -1 })
  .limit(limit);
};

videoClassSchema.set('toObject', { virtuals: true });
videoClassSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('VideoClass', videoClassSchema);