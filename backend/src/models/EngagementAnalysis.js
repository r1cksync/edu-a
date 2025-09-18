const mongoose = require('mongoose');

const engagementAnalysisSchema = new mongoose.Schema({
  // Class and Student Information
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoClass',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

  // Detailed Probabilities
  classProbabilities: {
    activelyLooking: { type: Number, default: 0 },
    bored: { type: Number, default: 0 },
    confused: { type: Number, default: 0 },
    distracted: { type: Number, default: 0 },
    drowsy: { type: Number, default: 0 },
    talkingToPeers: { type: Number, default: 0 }
  },

  // Image Information
  imageUrl: {
    type: String,
    required: true // S3 URL or local path to the uploaded image
  },
  imageSize: {
    type: Number // File size in bytes
  },

  // Analysis Metadata
  analysisTimestamp: {
    type: Date,
    default: Date.now
  },
  apiResponseTime: {
    type: Number // Time taken by engagement API in milliseconds
  },
  
  // Additional Context
  notes: {
    type: String // Teacher can add notes about the analysis
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
engagementAnalysisSchema.index({ classId: 1, analysisTimestamp: -1 });
engagementAnalysisSchema.index({ studentId: 1, analysisTimestamp: -1 });
engagementAnalysisSchema.index({ teacherId: 1, analysisTimestamp: -1 });

// Virtual for engagement level categorization
engagementAnalysisSchema.virtual('engagementLevel').get(function() {
  if (this.engagementScore >= 0.8) return 'High';
  if (this.engagementScore >= 0.6) return 'Medium';
  if (this.engagementScore >= 0.4) return 'Low';
  return 'Very Low';
});

// Method to get formatted results
engagementAnalysisSchema.methods.getFormattedResults = function() {
  return {
    student: this.studentId,
    class: this.classId,
    timestamp: this.analysisTimestamp,
    results: {
      predictedClass: this.predictedClass,
      confidence: Math.round(this.confidence * 100),
      engagementScore: Math.round(this.engagementScore * 100),
      engagementLevel: this.engagementLevel
    },
    probabilities: {
      'Actively Looking': Math.round(this.classProbabilities.activelyLooking * 100),
      'Bored': Math.round(this.classProbabilities.bored * 100),
      'Confused': Math.round(this.classProbabilities.confused * 100),
      'Distracted': Math.round(this.classProbabilities.distracted * 100),
      'Drowsy': Math.round(this.classProbabilities.drowsy * 100),
      'Talking to Peers': Math.round(this.classProbabilities.talkingToPeers * 100)
    }
  };
};

// Static method to get class engagement summary
engagementAnalysisSchema.statics.getClassEngagementSummary = async function(classId) {
  const analyses = await this.find({ classId }).populate('studentId', 'name email');
  
  if (analyses.length === 0) {
    return {
      totalAnalyses: 0,
      averageEngagement: 0,
      engagementDistribution: {},
      recentAnalyses: []
    };
  }

  const avgEngagement = analyses.reduce((sum, a) => sum + a.engagementScore, 0) / analyses.length;
  
  const distribution = analyses.reduce((dist, a) => {
    const level = a.engagementLevel;
    dist[level] = (dist[level] || 0) + 1;
    return dist;
  }, {});

  const recent = analyses
    .sort((a, b) => b.analysisTimestamp - a.analysisTimestamp)
    .slice(0, 10)
    .map(a => a.getFormattedResults());

  return {
    totalAnalyses: analyses.length,
    averageEngagement: Math.round(avgEngagement * 100),
    engagementDistribution: distribution,
    recentAnalyses: recent
  };
};

module.exports = mongoose.model('EngagementAnalysis', engagementAnalysisSchema);