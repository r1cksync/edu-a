const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  videoClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoClass',
    required: true
  },
  // Attendance status
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'absent'
  },
  // Timing details
  joinedAt: {
    type: Date
  },
  leftAt: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  // Class timing for reference
  classStartTime: {
    type: Date,
    required: true
  },
  classEndTime: {
    type: Date,
    required: true
  },
  // Late join calculation
  isLateJoin: {
    type: Boolean,
    default: false
  },
  lateByMinutes: {
    type: Number,
    default: 0
  },
  // Early leave calculation
  isEarlyLeave: {
    type: Boolean,
    default: false
  },
  earlyLeaveMinutes: {
    type: Number,
    default: 0
  },
  // Attendance percentage for this class
  attendancePercentage: {
    type: Number,
    default: 0
  },
  // Additional notes
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate attendance metrics
attendanceSchema.pre('save', function(next) {
  this.calculateDuration();
  this.calculateAttendancePercentage();
  this.checkLateJoin();
  next();
});

// Pre-update middleware for findOneAndUpdate
attendanceSchema.pre(['findOneAndUpdate', 'updateOne'], function(next) {
  const update = this.getUpdate();
  if (update.leftAt || update.joinedAt) {
    // These will be calculated in the post middleware since we need the document
    this.setUpdate({ ...update, updatedAt: new Date() });
  }
  next();
});

// Post-update middleware to recalculate metrics after update
attendanceSchema.post(['findOneAndUpdate', 'updateOne'], async function(doc) {
  if (doc) {
    doc.calculateDuration();
    doc.calculateAttendancePercentage();
    doc.checkLateJoin();
    await doc.save();
  }
});

// Indexes for better performance
attendanceSchema.index({ student: 1, classroom: 1 });
attendanceSchema.index({ classroom: 1, createdAt: -1 });
attendanceSchema.index({ videoClass: 1 });
attendanceSchema.index({ student: 1, videoClass: 1 }, { unique: true });

// Instance methods
attendanceSchema.methods.calculateDuration = function() {
  if (this.joinedAt && this.leftAt) {
    this.duration = Math.ceil((this.leftAt - this.joinedAt) / (1000 * 60));
  } else if (this.joinedAt && !this.leftAt) {
    // If student is still in class, calculate current duration
    this.duration = Math.ceil((new Date() - this.joinedAt) / (1000 * 60));
  }
  
  return this.duration;
};

attendanceSchema.methods.calculateAttendancePercentage = function() {
  const classStartTime = this.classStartTime;
  const classEndTime = this.classEndTime;
  const totalClassDuration = Math.ceil((classEndTime - classStartTime) / (1000 * 60));
  
  if (this.status === 'absent') {
    this.attendancePercentage = 0;
  } else if (this.status === 'present' || this.status === 'late') {
    let attendedDuration = this.duration || 0;
    
    // If student is still in class (no leftAt time), calculate current duration
    if (this.joinedAt && !this.leftAt) {
      const currentTime = new Date();
      const classActualEndTime = currentTime > classEndTime ? classEndTime : currentTime;
      attendedDuration = Math.ceil((classActualEndTime - this.joinedAt) / (1000 * 60));
      this.duration = attendedDuration; // Update duration
    }
    
    this.attendancePercentage = Math.min(100, Math.round((attendedDuration / totalClassDuration) * 100));
  } else {
    this.attendancePercentage = 0;
  }
  
  return this.attendancePercentage;
};

attendanceSchema.methods.checkLateJoin = function() {
  if (this.joinedAt && this.classStartTime) {
    const timeDiff = this.joinedAt.getTime() - this.classStartTime.getTime();
    if (timeDiff > 5 * 60 * 1000) { // More than 5 minutes late
      this.isLateJoin = true;
      this.lateByMinutes = Math.ceil(timeDiff / (1000 * 60));
      if (this.lateByMinutes > 15) {
        this.status = 'late';
      }
    }
  }
};

attendanceSchema.methods.checkEarlyLeave = function() {
  if (this.leftAt && this.classEndTime) {
    const timeDiff = this.classEndTime.getTime() - this.leftAt.getTime();
    if (timeDiff > 5 * 60 * 1000) { // Left more than 5 minutes early
      this.isEarlyLeave = true;
      this.earlyLeaveMinutes = Math.ceil(timeDiff / (1000 * 60));
    }
  }
};

// Pre-save middleware to calculate attendance metrics
attendanceSchema.pre('save', function(next) {
  this.checkLateJoin();
  this.checkEarlyLeave();
  this.calculateDuration();
  this.calculateAttendancePercentage();
  next();
});

// Static methods
attendanceSchema.statics.getStudentAttendanceStats = async function(studentId, classroomId) {
  const stats = await this.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        classroom: new mongoose.Types.ObjectId(classroomId)
      }
    },
    {
      $group: {
        _id: null,
        totalClasses: { $sum: 1 },
        presentClasses: {
          $sum: {
            $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
          }
        },
        lateClasses: {
          $sum: {
            $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
          }
        },
        absentClasses: {
          $sum: {
            $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
          }
        },
        totalDuration: { $sum: '$duration' },
        averageAttendancePercentage: { $avg: '$attendancePercentage' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalClasses: 0,
      presentClasses: 0,
      lateClasses: 0,
      absentClasses: 0,
      attendancePercentage: 0,
      totalDuration: 0,
      averageAttendancePercentage: 0
    };
  }

  const result = stats[0];
  result.attendancePercentage = result.totalClasses > 0 
    ? Math.round(((result.presentClasses + result.lateClasses) / result.totalClasses) * 100)
    : 0;

  delete result._id;
  return result;
};

attendanceSchema.statics.getClassroomAttendanceStats = async function(classroomId) {
  const stats = await this.aggregate([
    {
      $match: {
        classroom: new mongoose.Types.ObjectId(classroomId)
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'student',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    {
      $unwind: '$studentInfo'
    },
    {
      $group: {
        _id: '$student',
        studentName: { $first: '$studentInfo.name' },
        studentEmail: { $first: '$studentInfo.email' },
        totalClasses: { $sum: 1 },
        presentClasses: {
          $sum: {
            $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
          }
        },
        lateClasses: {
          $sum: {
            $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
          }
        },
        absentClasses: {
          $sum: {
            $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
          }
        },
        totalDuration: { $sum: '$duration' },
        averageAttendancePercentage: { $avg: '$attendancePercentage' }
      }
    },
    {
      $addFields: {
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $add: ['$presentClasses', '$lateClasses'] },
                    '$totalClasses'
                  ]
                },
                100
              ]
            },
            2
          ]
        }
      }
    },
    {
      $sort: { attendancePercentage: -1 }
    }
  ]);

  return stats;
};

attendanceSchema.statics.markAttendance = async function(studentId, videoClassId, status = 'present') {
  const VideoClass = require('./VideoClass');
  const videoClass = await VideoClass.findById(videoClassId);
  
  if (!videoClass) {
    throw new Error('Video class not found');
  }

  const attendanceRecord = await this.findOneAndUpdate(
    {
      student: studentId,
      videoClass: videoClassId
    },
    {
      student: studentId,
      classroom: videoClass.classroom,
      videoClass: videoClassId,
      status: status,
      classStartTime: videoClass.actualStartTime || videoClass.scheduledStartTime,
      classEndTime: videoClass.actualEndTime || videoClass.scheduledEndTime,
      joinedAt: status !== 'absent' ? new Date() : null
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );

  return attendanceRecord;
};

module.exports = mongoose.model('Attendance', attendanceSchema);