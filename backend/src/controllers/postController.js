const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Classroom = require('../models/Classroom');

class PostController {
  // Get all posts for current user (all classrooms)
  async getAllPosts(req, res) {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;

      // Get all classrooms user has access to
      let classrooms;
      if (userRole === 'teacher') {
        classrooms = await Classroom.find({ teacher: userId, isActive: true });
      } else {
        classrooms = await Classroom.find({ 
          'students.student': userId, 
          isActive: true 
        });
      }

      const classroomIds = classrooms.map(c => c._id);

      // Get all posts from these classrooms
      const posts = await Post.find({ 
        classroom: { $in: classroomIds },
        isDeleted: false 
      })
        .populate('author', 'name email role')
        .populate('classroom', 'name classCode')
        .populate({
          path: 'comments',
          populate: {
            path: 'author',
            select: 'name email role'
          }
        })
        .sort({ isPinned: -1, createdAt: -1 });

      res.json({
        posts,
        total: posts.length
      });
    } catch (error) {
      console.error('Get all posts error:', error);
      res.status(500).json({ message: 'Server error while fetching posts' });
    }
  }

  // Create new post
  async createPost(req, res) {
    try {
      const { classroomId } = req.params;
      const {
        type, title, content, allowComments,
        visibility, targetLevels, relatedAssignment
      } = req.body;
      
      const authorId = req.user._id;
      const userRole = req.user.role;

      // Verify user has access to classroom
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      const hasAccess = userRole === 'teacher' 
        ? classroom.teacher.toString() === authorId.toString()
        : classroom.students.some(s => s.student.toString() === authorId.toString());

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Check if students are allowed to post
      if (userRole === 'student' && !classroom.allowStudentPosts) {
        return res.status(403).json({ message: 'Students are not allowed to post in this classroom' });
      }

      const post = new Post({
        classroom: classroomId,
        author: authorId,
        type: type || 'general',
        title,
        content,
        allowComments: allowComments !== undefined ? allowComments : true,
        visibility: visibility || 'all',
        targetLevels: targetLevels || [],
        relatedAssignment
      });

      await post.save();
      await post.populate([
        { path: 'author', select: 'name email role' },
        { path: 'classroom', select: 'name classCode' },
        { path: 'relatedAssignment', select: 'title dueDate' }
      ]);

      // Update classroom post count
      await Classroom.findByIdAndUpdate(classroomId, { $inc: { totalPosts: 1 } });

      res.status(201).json({
        message: 'Post created successfully',
        post
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ message: 'Server error while creating post' });
    }
  }

  // Create post with file attachments
  async createPostWithAttachments(req, res) {
    try {
      const { classroomId } = req.params;
      const {
        type, title, content, allowComments,
        visibility, targetLevels, relatedAssignment
      } = req.body;
      
      const authorId = req.user._id;
      const userRole = req.user.role;

      // Verify user has access to classroom
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      const hasAccess = userRole === 'teacher' 
        ? classroom.teacher.toString() === authorId.toString()
        : classroom.students.some(s => s.student.toString() === authorId.toString());

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Check if students are allowed to post
      if (userRole === 'student' && !classroom.allowStudentPosts) {
        return res.status(403).json({ message: 'Students are not allowed to post in this classroom' });
      }

      // Process attachments
      const attachments = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          attachments.push({
            fileName: file.originalname,
            fileUrl: file.location || `/uploads/post-attachments/${file.filename}`,
            fileSize: file.size,
            fileType: file.mimetype
          });
        });
      }

      const post = new Post({
        classroom: classroomId,
        author: authorId,
        type: type || 'general',
        title,
        content,
        allowComments: allowComments !== undefined ? allowComments : true,
        visibility: visibility || 'all',
        targetLevels: targetLevels || [],
        relatedAssignment,
        attachments
      });

      await post.save();
      await post.populate([
        { path: 'author', select: 'name email role' },
        { path: 'classroom', select: 'name classCode' },
        { path: 'relatedAssignment', select: 'title dueDate' }
      ]);

      // Update classroom post count
      await Classroom.findByIdAndUpdate(classroomId, { $inc: { totalPosts: 1 } });

      res.status(201).json({
        message: 'Post created successfully with attachments',
        post
      });
    } catch (error) {
      console.error('Create post with attachments error:', error);
      res.status(500).json({ message: 'Server error while creating post with attachments' });
    }
  }

  // Get posts for a classroom
  async getClassroomPosts(req, res) {
    try {
      const { classroomId } = req.params;
      const { page = 1, limit = 10, type } = req.query;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Verify user has access to classroom
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      const hasAccess = userRole === 'teacher' 
        ? classroom.teacher.toString() === userId.toString()
        : classroom.students.some(s => s.student.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Build query
      let query = { 
        classroom: classroomId, 
        isDeleted: false 
      };

      // Filter by type if provided
      if (type) {
        query.type = type;
      }

      // Filter by visibility
      if (userRole === 'student') {
        query.visibility = { $in: ['all', 'students'] };
        
        // Filter by student's level if targetLevels is set
        const studentInfo = classroom.students.find(s => s.student.toString() === userId.toString());
        if (studentInfo) {
          query.$or = [
            { targetLevels: { $size: 0 } }, // Posts for all levels
            { targetLevels: studentInfo.level }
          ];
        }
      } else {
        query.visibility = { $in: ['all', 'teachers'] };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const posts = await Post.find(query)
        .populate('author', 'name email role profilePicture')
        .populate('relatedAssignment', 'title dueDate type')
        .populate({
          path: 'comments',
          populate: {
            path: 'author',
            select: 'name email role profilePicture'
          },
          options: { sort: { createdAt: 1 } }
        })
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Post.countDocuments(query);

      res.json({
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({ message: 'Server error while fetching posts' });
    }
  }

  // Get single post
  async getPost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const post = await Post.findById(postId)
        .populate('author', 'name email role profilePicture')
        .populate('classroom', 'name classCode teacher students')
        .populate('relatedAssignment', 'title dueDate type')
        .populate({
          path: 'comments',
          populate: {
            path: 'author',
            select: 'name email role profilePicture'
          },
          options: { sort: { createdAt: 1 } }
        });

      if (!post || post.isDeleted) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Check access - simplified approach
      let hasAccess = false;
      
      if (userRole === 'teacher') {
        hasAccess = post.classroom.teacher.toString() === userId.toString();
      } else {
        // For students, check if userId exists in classroom.students array
        const classroom = await Classroom.findById(post.classroom._id);
        hasAccess = classroom.students.some(s => s.student.toString() === userId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this post' });
      }

      // Increment views
      await post.incrementViews();

      res.json({ post });
    } catch (error) {
      console.error('Get post error:', error);
      res.status(500).json({ message: 'Server error while fetching post' });
    }
  }

  // Update post
  async updatePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user._id;

      const post = await Post.findOne({ _id: postId, author: userId, isDeleted: false });
      if (!post) {
        return res.status(404).json({ message: 'Post not found or access denied' });
      }

      const updateData = { ...req.body };
      delete updateData.classroom; // Prevent changing classroom
      delete updateData.author; // Prevent changing author

      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'author', select: 'name email role' },
        { path: 'relatedAssignment', select: 'title dueDate' }
      ]);

      res.json({
        message: 'Post updated successfully',
        post: updatedPost
      });
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({ message: 'Server error while updating post' });
    }
  }

  // Delete post
  async deletePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const post = await Post.findById(postId).populate('classroom', 'teacher');
      if (!post || post.isDeleted) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Only author or classroom teacher can delete post
      const canDelete = post.author.toString() === userId.toString() || 
                       (userRole === 'teacher' && post.classroom.teacher.toString() === userId.toString());

      if (!canDelete) {
        return res.status(403).json({ message: 'Access denied to delete this post' });
      }

      post.isDeleted = true;
      post.deletedAt = new Date();
      await post.save();

      // Update classroom post count
      await Classroom.findByIdAndUpdate(post.classroom._id, { $inc: { totalPosts: -1 } });

      res.json({
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ message: 'Server error while deleting post' });
    }
  }

  // Pin/Unpin post (Teachers only)
  async togglePin(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user._id;

      const post = await Post.findById(postId).populate('classroom', 'teacher');
      if (!post || post.isDeleted) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Only classroom teacher can pin posts
      if (post.classroom.teacher.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Only teachers can pin posts' });
      }

      post.isPinned = !post.isPinned;
      await post.save();

      res.json({
        message: `Post ${post.isPinned ? 'pinned' : 'unpinned'} successfully`,
        post
      });
    } catch (error) {
      console.error('Toggle pin error:', error);
      res.status(500).json({ message: 'Server error while toggling pin' });
    }
  }

  // Like/Unlike post
  async toggleLike(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user._id;

      const post = await Post.findById(postId);
      if (!post || post.isDeleted) {
        return res.status(404).json({ message: 'Post not found' });
      }

      await post.toggleLike(userId);

      res.json({
        message: 'Like toggled successfully',
        likesCount: post.likes.length,
        isLiked: post.likes.some(like => like.user.toString() === userId.toString())
      });
    } catch (error) {
      console.error('Toggle like error:', error);
      res.status(500).json({ message: 'Server error while toggling like' });
    }
  }

  // Create comment on post
  async createComment(req, res) {
    try {
      const { postId } = req.params;
      const { content, parentComment } = req.body;
      const authorId = req.user._id;
      const userRole = req.user.role;

      const post = await Post.findById(postId).populate('classroom', 'teacher students allowStudentComments');
      if (!post || post.isDeleted) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (!post.allowComments) {
        return res.status(400).json({ message: 'Comments are disabled for this post' });
      }

      // Check if user has access to classroom - simplified approach
      let hasAccess = false;
      
      if (userRole === 'teacher') {
        hasAccess = post.classroom.teacher.toString() === authorId.toString();
      } else {
        // For students, fetch classroom and check students array
        const classroom = await Classroom.findById(post.classroom._id);
        hasAccess = classroom.students.some(s => s.student.toString() === authorId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to comment on this post' });
      }

      // Check if students are allowed to comment
      if (userRole === 'student' && !post.classroom.allowStudentComments) {
        return res.status(403).json({ message: 'Students are not allowed to comment in this classroom' });
      }

      const comment = new Comment({
        post: postId,
        author: authorId,
        content,
        parentComment
      });

      await comment.save();
      await comment.populate('author', 'name email role profilePicture');

      res.status(201).json({
        message: 'Comment created successfully',
        comment
      });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ message: 'Server error while creating comment' });
    }
  }

  // Update comment
  async updateComment(req, res) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user._id;

      const comment = await Comment.findOne({ _id: commentId, author: userId, isDeleted: false });
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found or access denied' });
      }

      comment.content = content;
      await comment.save();
      await comment.populate('author', 'name email role profilePicture');

      res.json({
        message: 'Comment updated successfully',
        comment
      });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({ message: 'Server error while updating comment' });
    }
  }

  // Delete comment
  async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const comment = await Comment.findById(commentId)
        .populate({
          path: 'post',
          populate: { path: 'classroom', select: 'teacher' }
        });

      if (!comment || comment.isDeleted) {
        return res.status(404).json({ message: 'Comment not found' });
      }

      // Only author or classroom teacher can delete comment
      const canDelete = comment.author.toString() === userId.toString() || 
                       (userRole === 'teacher' && comment.post.classroom.teacher.toString() === userId.toString());

      if (!canDelete) {
        return res.status(403).json({ message: 'Access denied to delete this comment' });
      }

      comment.isDeleted = true;
      comment.deletedAt = new Date();
      await comment.save();

      res.json({
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ message: 'Server error while deleting comment' });
    }
  }

  // Download post attachment
  async downloadPostAttachment(req, res) {
    try {
      const { postId, attachmentId } = req.params;
      
      // Get user ID from either authenticated user or token query parameter
      let userId, userRole;
      
      if (req.user) {
        // Standard authentication via middleware
        userId = req.user._id;
        userRole = req.user.role;
      } else if (req.query.token) {
        // Token authentication via query parameter (for direct downloads)
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
          
          const User = require('../models/User');
          // Try both possible field names for compatibility
          const userIdToLookup = decoded.userId || decoded.id;
          
          const user = await User.findById(userIdToLookup).select('-password');
          if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
          }
          if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated' });
          }
          
          userId = user._id;
          userRole = user.role;
        } catch (tokenError) {
          console.error('Token verification error:', tokenError);
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
      } else {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Find the post and verify access
      const post = await Post.findById(postId)
        .populate('classroom', 'name teacher students allowStudentPosts')
        .populate('author', 'name email role');

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Check access based on user role
      let hasAccess = false;
      
      if (userRole === 'teacher') {
        hasAccess = post.classroom.teacher.toString() === userId.toString();
      } else if (userRole === 'student') {
        const classroom = await Classroom.findById(post.classroom._id);
        hasAccess = classroom.students.some(s => s.student.toString() === userId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to download this attachment' });
      }

      // Find the specific attachment
      const attachment = post.attachments.find(att => att._id.toString() === attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ message: 'Attachment not found' });
      }

      // Get S3 service configuration
      const { getSignedUrl, hasAWSConfig } = require('../services/s3Service');

      // Handle S3 download
      if (hasAWSConfig && attachment.fileUrl) {
        try {
          // Extract the S3 key from the full URL
          let fileKey = attachment.fileUrl;
          if (fileKey.includes('amazonaws.com/')) {
            // Extract key from full S3 URL
            fileKey = fileKey.split('amazonaws.com/')[1];
          }
          
          const signedUrl = getSignedUrl(fileKey, attachment.fileName);
          
          if (signedUrl) {
            return res.redirect(signedUrl);
          } else {
            throw new Error('Failed to generate signed URL');
          }
          
        } catch (s3Error) {
          console.error('S3 download error:', s3Error);
          return res.status(500).json({ message: 'Error generating download link' });
        }
      }

      // Handle local file download
      const path = require('path');
      const fs = require('fs');
      
      // For local files, fileUrl should be the relative path
      const filePath = path.join(process.cwd(), attachment.fileUrl.startsWith('/') ? attachment.fileUrl.substring(1) : attachment.fileUrl);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on server' });
      }

      // Set proper headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.setHeader('Content-Type', attachment.fileType || 'application/octet-stream');
      
      // Stream file to prevent memory issues with large files
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Download post attachment error:', error);
      res.status(500).json({ message: 'Server error while downloading attachment' });
    }
  }
}

module.exports = new PostController();