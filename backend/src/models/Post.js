const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Post content
  type: {
    type: String,
    enum: ['announcement', 'material', 'assignment', 'general'],
    default: 'general'
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  // Attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Related assignment (if type is 'assignment')
  relatedAssignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  },
  // Interaction settings
  allowComments: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  // Visibility
  visibility: {
    type: String,
    enum: ['all', 'teachers', 'students'],
    default: 'all'
  },
  // Target specific levels (for advanced features)
  targetLevels: [{
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  }],
  // Engagement metrics
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Status
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
postSchema.index({ classroom: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ type: 1 });
postSchema.index({ isPinned: -1, createdAt: -1 });

// Virtual for comments
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
});

postSchema.set('toObject', { virtuals: true });
postSchema.set('toJSON', { virtuals: true });

// Method to increment views
postSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to toggle like
postSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.toString() === userId.toString());
  
  if (likeIndex > -1) {
    // Unlike
    this.likes.splice(likeIndex, 1);
  } else {
    // Like
    this.likes.push({ user: userId });
  }
  
  return this.save();
};

module.exports = mongoose.model('Post', postSchema);