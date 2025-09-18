const EngagementAnalysis = require('../models/EngagementAnalysis');
const engagementService = require('../services/engagementService');
const VideoClass = require('../models/VideoClass');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    try {
      engagementService.validateImageFile(file);
      cb(null, true);
    } catch (error) {
      cb(new Error(error.message), false);
    }
  }
}).single('image');

/**
 * Upload and analyze student engagement
 */
const analyzeStudentEngagement = async (req, res) => {
  try {
    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      const { studentId, classId, notes } = req.body;
      const teacherId = req.user.id;

      // Validate required fields
      if (!studentId || !classId) {
        return res.status(400).json({
          success: false,
          error: 'Student ID and Class ID are required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload an image'
        });
      }

      // Verify the class exists and teacher owns it
      const videoClass = await VideoClass.findOne({
        _id: classId,
        teacher: teacherId
      });

      if (!videoClass) {
        return res.status(404).json({
          success: false,
          error: 'Class not found or you do not have permission'
        });
      }

      // Verify student exists
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      try {
        // Convert image to base64
        const imageBase64 = engagementService.bufferToBase64(req.file.buffer);

        // Analyze engagement
        const analysisResult = await engagementService.analyzeEngagement(imageBase64);

        // Save to database
        const engagementAnalysis = new EngagementAnalysis({
          classId: classId,
          studentId: studentId,
          teacherId: teacherId,
          predictedClass: analysisResult.predictedClass,
          confidence: analysisResult.confidence,
          engagementScore: analysisResult.engagementScore,
          classProbabilities: analysisResult.classProbabilities,
          imageUrl: `data:${req.file.mimetype};base64,${imageBase64.substring(0, 50)}...`, // Store truncated for reference
          imageSize: req.file.size,
          apiResponseTime: analysisResult.apiResponseTime,
          notes: notes
        });

        await engagementAnalysis.save();

        // Populate student and class info for response
        await engagementAnalysis.populate('studentId', 'name email');
        await engagementAnalysis.populate('classId', 'title');

        res.json({
          success: true,
          message: 'Engagement analysis completed successfully',
          analysis: engagementAnalysis.getFormattedResults()
        });

      } catch (analysisError) {
        console.error('Analysis error:', analysisError);
        res.status(500).json({
          success: false,
          error: `Analysis failed: ${analysisError.message}`
        });
      }
    });

  } catch (error) {
    console.error('Engagement analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process engagement analysis'
    });
  }
};

/**
 * Get engagement history for a class
 */
const getClassEngagementHistory = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Verify teacher owns the class
    const videoClass = await VideoClass.findOne({
      _id: classId,
      teacher: teacherId
    });

    if (!videoClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or you do not have permission'
      });
    }

    // Get analyses with pagination
    const analyses = await EngagementAnalysis.find({ classId })
      .populate('studentId', 'name email')
      .sort({ analysisTimestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalAnalyses = await EngagementAnalysis.countDocuments({ classId });

    // Get summary statistics
    const summary = await EngagementAnalysis.getClassEngagementSummary(classId);

    res.json({
      success: true,
      analyses: analyses.map(a => a.getFormattedResults()),
      summary,
      pagination: {
        page,
        limit,
        total: totalAnalyses,
        pages: Math.ceil(totalAnalyses / limit)
      }
    });

  } catch (error) {
    console.error('Get engagement history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement history'
    });
  }
};

/**
 * Get engagement history for a student
 */
const getStudentEngagementHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Get analyses for classes taught by this teacher
    const teacherClasses = await VideoClass.find({ teacher: teacherId }).select('_id');
    const classIds = teacherClasses.map(c => c._id);

    const analyses = await EngagementAnalysis.find({
      studentId,
      classId: { $in: classIds }
    })
      .populate('studentId', 'name email')
      .populate('classId', 'title')
      .sort({ analysisTimestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalAnalyses = await EngagementAnalysis.countDocuments({
      studentId,
      classId: { $in: classIds }
    });

    // Calculate student's average engagement
    const allAnalyses = await EngagementAnalysis.find({
      studentId,
      classId: { $in: classIds }
    });

    const averageEngagement = allAnalyses.length > 0
      ? allAnalyses.reduce((sum, a) => sum + a.engagementScore, 0) / allAnalyses.length
      : 0;

    res.json({
      success: true,
      analyses: analyses.map(a => a.getFormattedResults()),
      studentSummary: {
        totalAnalyses: allAnalyses.length,
        averageEngagement: Math.round(averageEngagement * 100),
        recentTrend: allAnalyses.slice(0, 5).map(a => ({
          date: a.analysisTimestamp,
          score: Math.round(a.engagementScore * 100)
        }))
      },
      pagination: {
        page,
        limit,
        total: totalAnalyses,
        pages: Math.ceil(totalAnalyses / limit)
      }
    });

  } catch (error) {
    console.error('Get student engagement history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student engagement history'
    });
  }
};

/**
 * Get students enrolled in a class (for dropdown)
 */
const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;

    console.log('getClassStudents called with:', { classId, teacherId });

    // Verify teacher owns the class
    const videoClass = await VideoClass.findOne({
      _id: classId,
      teacher: teacherId
    }).populate({
      path: 'classroom',
      populate: {
        path: 'students.student',
        select: 'name email',
        model: 'User'
      }
    });

    console.log('VideoClass found:', !!videoClass);
    if (videoClass) {
      console.log('Classroom:', videoClass.classroom);
      console.log('Students found:', videoClass.classroom?.students?.length || 0);
      if (videoClass.classroom?.students?.length > 0) {
        console.log('First student object:', videoClass.classroom.students[0]);
        console.log('First student data:', videoClass.classroom.students[0].student);
      }
    }

    if (!videoClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or you do not have permission'
      });
    }

    const students = videoClass.classroom.students.map(studentObj => ({
      id: studentObj.student._id,
      name: studentObj.student.name,
      email: studentObj.student.email
    }));

    console.log('Mapped students:', students);

    res.json({
      success: true,
      students
    });

  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get class students'
    });
  }
};

/**
 * Check engagement API health
 */
const checkEngagementApiHealth = async (req, res) => {
  try {
    const isHealthy = await engagementService.checkApiHealth();
    
    res.json({
      success: true,
      apiHealthy: isHealthy,
      apiUrl: process.env.ENGAGEMENT_API_URL
    });

  } catch (error) {
    console.error('API health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check API health'
    });
  }
};

module.exports = {
  analyzeStudentEngagement,
  getClassEngagementHistory,
  getStudentEngagementHistory,
  getClassStudents,
  checkEngagementApiHealth
};