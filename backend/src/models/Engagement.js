const mongoose = require('mongoose');

const engagementSchema = new mongoose.Schema({
  // Basic Information
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoClass',
    required: true,
    index: true
  },
  
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true,
    index: true
  },

  // Analysis Results
  predictedClass: {
    type: String,
    required: true,
    enum: ['Actively Looking', 'Bored', 'Confused', 'Distracted', 'Drowsy', 'Talking to Peers']
  },
  
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  
  engagementScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },

  // Detailed class probabilities
  classProbabilities: {
    'Actively Looking': { type: Number, default: 0 },
    'Bored': { type: Number, default: 0 },
    'Confused': { type: Number, default: 0 },
    'Distracted': { type: Number, default: 0 },
    'Drowsy': { type: Number, default: 0 },
    'Talking to Peers': { type: Number, default: 0 }
  },

  // Analysis Metadata
  analysisType: {
    type: String,
    enum: ['manual', 'automatic'],
    default: 'manual'
  },
  
  captureMethod: {
    type: String,
    enum: ['teacher_triggered', 'periodic', 'event_based'],
    default: 'teacher_triggered'
  },

  // Timing Information
  captureTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  analysisTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Class Session Context
  classStartTime: {
    type: Date,
    required: true
  },
  
  minutesIntoClass: {
    type: Number,
    required: true,
    min: 0
  },

  // Batch Information (if part of batch analysis)
  batchId: {
    type: String,
    index: true
  },
  
  batchSize: {
    type: Number,
    min: 1
  },

  // Quality Metrics
  imageQuality: {
    faceDetected: { type: Boolean, default: true },
    imageClear: { type: Boolean, default: true },
    lightingGood: { type: Boolean, default: true }
  },

  // Error Handling
  hasError: {
    type: Boolean,
    default: false
  },
  
  errorMessage: {
    type: String
  },

  // Additional Context
  deviceInfo: {
    userAgent: String,
    platform: String,
    isMobile: Boolean
  },

  // Privacy and Compliance
  imageProcessed: {
    type: Boolean,
    default: true
  },
  
  imageStored: {
    type: Boolean,
    default: false // We don't store actual images for privacy
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
engagementSchema.index({ classId: 1, captureTimestamp: 1 });
engagementSchema.index({ studentId: 1, captureTimestamp: -1 });
engagementSchema.index({ classroomId: 1, captureTimestamp: -1 });
engagementSchema.index({ teacherId: 1, captureTimestamp: -1 });
engagementSchema.index({ batchId: 1 });
engagementSchema.index({ engagementScore: -1 });
engagementSchema.index({ predictedClass: 1 });

// Virtual for engagement level categorization
engagementSchema.virtual('engagementLevel').get(function() {
  if (this.engagementScore >= 0.7) return 'high';
  if (this.engagementScore >= 0.4) return 'medium';
  return 'low';
});

// Virtual for engagement percentage
engagementSchema.virtual('engagementPercentage').get(function() {
  return Math.round(this.engagementScore * 100);
});

// Virtual for confidence percentage
engagementSchema.virtual('confidencePercentage').get(function() {
  return Math.round(this.confidence * 100);
});

// Static method to get engagement stats for a class
engagementSchema.statics.getClassEngagementStats = async function(classId) {
  try {
    const stats = await this.aggregate([
      { $match: { classId: mongoose.Types.ObjectId(classId), hasError: false } },
      {
        $group: {
          _id: null,
          totalAnalyses: { $sum: 1 },
          averageEngagement: { $avg: '$engagementScore' },
          averageConfidence: { $avg: '$confidence' },
          highEngagement: {
            $sum: { $cond: [{ $gte: ['$engagementScore', 0.7] }, 1, 0] }
          },
          mediumEngagement: {
            $sum: { $cond: [{ $and: [{ $gte: ['$engagementScore', 0.4] }, { $lt: ['$engagementScore', 0.7] }] }, 1, 0] }
          },
          lowEngagement: {
            $sum: { $cond: [{ $lt: ['$engagementScore', 0.4] }, 1, 0] }
          },
          classDistribution: {
            $push: '$predictedClass'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalAnalyses: 0,
        averageEngagement: 0,
        averageConfidence: 0,
        highEngagement: 0,
        mediumEngagement: 0,
        lowEngagement: 0,
        classDistribution: {}
      };
    }

    const result = stats[0];
    
    // Count class distribution
    const classDistribution = {};
    result.classDistribution.forEach(className => {
      classDistribution[className] = (classDistribution[className] || 0) + 1;
    });

    return {
      totalAnalyses: result.totalAnalyses,
      averageEngagement: Math.round(result.averageEngagement * 1000) / 1000,
      averageConfidence: Math.round(result.averageConfidence * 1000) / 1000,
      highEngagement: result.highEngagement,
      mediumEngagement: result.mediumEngagement,
      lowEngagement: result.lowEngagement,
      classDistribution
    };

  } catch (error) {
    console.error('Error calculating engagement stats:', error);
    throw error;
  }
};

// Static method to get student engagement history
engagementSchema.statics.getStudentEngagementHistory = async function(studentId, limit = 10) {
  try {
    return await this.find({ 
      studentId: mongoose.Types.ObjectId(studentId),
      hasError: false 
    })
    .populate('classId', 'title meetingId startTime')
    .populate('classroomId', 'name')
    .sort({ captureTimestamp: -1 })
    .limit(limit);
  } catch (error) {
    console.error('Error getting student engagement history:', error);
    throw error;
  }
};

// Static method to get real-time engagement for active class
engagementSchema.statics.getRealtimeClassEngagement = async function(classId) {
  try {
    // Get latest engagement analysis for each student in the class
    const latestEngagements = await this.aggregate([
      { $match: { classId: mongoose.Types.ObjectId(classId), hasError: false } },
      { $sort: { captureTimestamp: -1 } },
      {
        $group: {
          _id: '$studentId',
          latestEngagement: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$latestEngagement' }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          studentId: 1,
          studentName: '$student.name',
          studentEmail: '$student.email',
          predictedClass: 1,
          engagementScore: 1,
          confidence: 1,
          captureTimestamp: 1,
          engagementLevel: {
            $cond: {
              if: { $gte: ['$engagementScore', 0.7] },
              then: 'high',
              else: {
                $cond: {
                  if: { $gte: ['$engagementScore', 0.4] },
                  then: 'medium',
                  else: 'low'
                }
              }
            }
          }
        }
      },
      { $sort: { engagementScore: -1 } }
    ]);

    return latestEngagements;
  } catch (error) {
    console.error('Error getting realtime class engagement:', error);
    throw error;
  }
};

// Pre-save middleware to calculate minutes into class
engagementSchema.pre('save', function(next) {
  if (this.classStartTime && this.captureTimestamp) {
    const timeDiff = this.captureTimestamp - this.classStartTime;
    this.minutesIntoClass = Math.floor(timeDiff / (1000 * 60)); // Convert to minutes
  }
  next();
});

const Engagement = mongoose.model('Engagement', engagementSchema);

module.exports = Engagement;