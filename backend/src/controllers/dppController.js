const DailyPracticeProblem = require('../models/DailyPracticeProblem');
const Classroom = require('../models/Classroom');
const VideoClass = require('../models/VideoClass');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/dpp-submissions');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Get allowed file types from DPP if available
  const allowedTypes = req.allowedFileTypes || ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png', '.zip'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${fileExt} not allowed`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB default, can be overridden
  },
  fileFilter: fileFilter
});

/**
 * Create a new DPP
 */
const createDPP = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const {
      title,
      description,
      classroomId,
      videoClassId,
      type,
      questions, // For MCQ type
      assignmentFiles, // For file type - array of {fileName, fileUrl, difficulty, description, points}
      instructions, // For file type
      allowedFileTypes,
      maxFileSize,
      maxFiles,
      dueDate,
      tags,
      estimatedTime
    } = req.body;

    // Verify teacher owns the classroom
    const classroom = await Classroom.findOne({
      _id: classroomId,
      teacher: teacherId
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: 'Classroom not found or you do not have permission'
      });
    }

    // Verify video class belongs to the classroom
    const videoClass = await VideoClass.findOne({
      _id: videoClassId,
      classroom: classroomId,
      teacher: teacherId
    });

    if (!videoClass) {
      return res.status(404).json({
        success: false,
        error: 'Video class not found or does not belong to this classroom'
      });
    }

    // Prepare DPP data
    const dppData = {
      title,
      description,
      classroom: classroomId,
      videoClass: videoClassId,
      teacher: teacherId,
      type,
      tags: tags || [],
      estimatedTime: estimatedTime || 30,
      isPublished: true, // Auto-publish DPPs when created
      publishedAt: new Date()
    };

    // Add type-specific data
    if (type === 'mcq') {
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'MCQ type DPP must have at least one question'
        });
      }
      
      // Validate each question has difficulty level
      for (const question of questions) {
        if (!question.difficulty || !['easy', 'medium', 'hard'].includes(question.difficulty)) {
          return res.status(400).json({
            success: false,
            error: 'Each MCQ question must have a valid difficulty level (easy, medium, hard)'
          });
        }
      }
      
      dppData.questions = questions;
      // Calculate max score based on question marks
      dppData.maxScore = questions.reduce((total, q) => total + (q.marks || 1), 0);
    } else if (type === 'file') {
      if (!assignmentFiles || !Array.isArray(assignmentFiles) || assignmentFiles.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'File type DPP must have at least one assignment file'
        });
      }
      
      // Validate each assignment file has difficulty level
      for (const file of assignmentFiles) {
        if (!file.difficulty || !['easy', 'medium', 'hard'].includes(file.difficulty)) {
          return res.status(400).json({
            success: false,
            error: 'Each assignment file must have a valid difficulty level (easy, medium, hard)'
          });
        }
      }
      
      dppData.assignmentFiles = assignmentFiles;
      dppData.instructions = instructions || '';
      dppData.allowedFileTypes = allowedFileTypes || ['.pdf', '.doc', '.docx', '.txt'];
      dppData.maxFileSize = maxFileSize || 10 * 1024 * 1024;
      dppData.maxFiles = maxFiles || 5;
      // Calculate max score based on assignment file points
      dppData.maxScore = assignmentFiles.reduce((total, file) => total + (file.points || 10), 0);
    }

    // Set due date (default to 1 day from now)
    if (dueDate) {
      dppData.dueDate = new Date(dueDate);
    }

    // Create DPP with auto due date
    const dpp = await DailyPracticeProblem.createWithAutoDueDate(dppData);

    await dpp.populate([
      { path: 'teacher', select: 'name email' },
      { path: 'classroom', select: 'name subject' },
      { path: 'videoClass', select: 'title meetingUrl' }
    ]);

    res.status(201).json({
      success: true,
      message: 'DPP created successfully',
      dpp
    });
  } catch (error) {
    console.error('Error creating DPP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create DPP'
    });
  }
};

/**
 * Get all DPPs for a classroom
 */
const getClassroomDPPs = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const {
      page = 1,
      limit = 10,
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Verify user has access to classroom
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let classroom;
    if (userRole === 'teacher') {
      classroom = await Classroom.findOne({ _id: classroomId, teacher: userId });
    } else {
      classroom = await Classroom.findOne({
        _id: classroomId,
        'students.student': userId
      });
    }

    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: 'Classroom not found or you do not have access'
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1,
      status
    };

    const dpps = await DailyPracticeProblem.getClassroomDPPs(classroomId, options);
    const totalDPPs = await DailyPracticeProblem.countDocuments({
      classroom: classroomId,
      isPublished: true
    });

    // If student, add submission status to each DPP
    if (userRole === 'student') {
      dpps.forEach(dpp => {
        const submission = dpp.getStudentSubmission(userId);
        dpp._doc.hasSubmitted = !!submission;
        dpp._doc.submission = submission;
        dpp._doc.isOverdue = new Date() > dpp.dueDate;
        
        // Remove correct answers for students
        if (dpp.type === 'mcq') {
          dpp.questions = dpp.questions.map(q => ({
            ...q.toObject(),
            options: q.options.map(opt => ({
              text: opt.text,
              _id: opt._id
            }))
          }));
        }
      });
    }

    // If teacher, calculate average scores for each DPP
    if (userRole === 'teacher') {
      dpps.forEach(dpp => {
        const submissionCount = dpp.submissions ? dpp.submissions.length : 0;
        if (submissionCount > 0) {
          const totalScore = dpp.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
          const totalPossibleScore = submissionCount * dpp.maxScore;
          const averageScore = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;
          dpp._doc.averageScore = Math.round(averageScore * 100) / 100; // Round to 2 decimal places
        } else {
          dpp._doc.averageScore = 0;
        }
      });
    }

    res.json({
      success: true,
      dpps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalDPPs,
        pages: Math.ceil(totalDPPs / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching classroom DPPs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DPPs'
    });
  }
};

/**
 * Get a specific DPP
 */
const getDPP = async (req, res) => {
  try {
    const { dppId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const dpp = await DailyPracticeProblem.findById(dppId)
      .populate('teacher', 'name email')
      .populate('classroom', 'name subject')
      .populate('videoClass', 'title meetingUrl')
      .populate('submissions.student', 'name email');

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found'
      });
    }

    // Check access permissions
    let hasAccess = false;
    if (userRole === 'teacher') {
      hasAccess = dpp.teacher._id.toString() === userId;
    } else {
      // Check if student is in the classroom
      const classroom = await Classroom.findOne({
        _id: dpp.classroom._id,
        'students.student': userId
      });
      hasAccess = !!classroom;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this DPP'
      });
    }

    // If student, add submission info and hide correct answers
    if (userRole === 'student') {
      const submission = dpp.getStudentSubmission(userId);
      dpp._doc.hasSubmitted = !!submission;
      dpp._doc.submission = submission;
      dpp._doc.isOverdue = new Date() > dpp.dueDate;

      // Hide correct answers for students
      if (dpp.type === 'mcq') {
        dpp.questions = dpp.questions.map(q => ({
          ...q.toObject(),
          options: q.options.map(opt => ({
            text: opt.text,
            _id: opt._id
          }))
        }));
      }

      // Remove other students' submissions from response
      dpp.submissions = submission ? [submission] : [];
    }

    res.json({
      success: true,
      dpp
    });
  } catch (error) {
    console.error('Error fetching DPP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DPP'
    });
  }
};

/**
 * Update a DPP
 */
const updateDPP = async (req, res) => {
  try {
    const { dppId } = req.params;
    const teacherId = req.user.id;
    const updateData = req.body;

    const dpp = await DailyPracticeProblem.findOne({
      _id: dppId,
      teacher: teacherId
    });

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found or you do not have permission'
      });
    }

    // Prevent certain updates if there are submissions
    if (dpp.submissions.length > 0) {
      const restrictedFields = ['type', 'questions'];
      const hasRestrictedUpdate = restrictedFields.some(field => 
        updateData.hasOwnProperty(field)
      );
      
      if (hasRestrictedUpdate) {
        return res.status(400).json({
          success: false,
          error: 'Cannot modify question type or content after submissions have been made'
        });
      }
    }

    Object.assign(dpp, updateData);
    await dpp.save();

    await dpp.populate([
      { path: 'teacher', select: 'name email' },
      { path: 'classroom', select: 'name subject' },
      { path: 'videoClass', select: 'title meetingUrl' }
    ]);

    res.json({
      success: true,
      message: 'DPP updated successfully',
      dpp
    });
  } catch (error) {
    console.error('Error updating DPP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update DPP'
    });
  }
};

/**
 * Delete a DPP
 */
const deleteDPP = async (req, res) => {
  try {
    const { dppId } = req.params;
    const teacherId = req.user.id;

    const dpp = await DailyPracticeProblem.findOne({
      _id: dppId,
      teacher: teacherId
    });

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found or you do not have permission'
      });
    }

    await DailyPracticeProblem.findByIdAndDelete(dppId);

    res.json({
      success: true,
      message: 'DPP deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting DPP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete DPP'
    });
  }
};

/**
 * Publish/Unpublish a DPP
 */
const togglePublishDPP = async (req, res) => {
  try {
    const { dppId } = req.params;
    const teacherId = req.user.id;

    const dpp = await DailyPracticeProblem.findOne({
      _id: dppId,
      teacher: teacherId
    });

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found or you do not have permission'
      });
    }

    dpp.isPublished = !dpp.isPublished;
    await dpp.save();

    res.json({
      success: true,
      message: `DPP ${dpp.isPublished ? 'published' : 'unpublished'} successfully`,
      dpp: { isPublished: dpp.isPublished, publishedAt: dpp.publishedAt }
    });
  } catch (error) {
    console.error('Error toggling DPP publish status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update DPP publish status'
    });
  }
};

/**
 * Submit MCQ answers
 */
const submitMCQAnswers = async (req, res) => {
  try {
    const { dppId } = req.params;
    const studentId = req.user.id;
    const { answers } = req.body;

    const dpp = await DailyPracticeProblem.findById(dppId);
    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found'
      });
    }

    if (dpp.type !== 'mcq') {
      return res.status(400).json({
        success: false,
        error: 'This DPP is not an MCQ type'
      });
    }

    // Check if student already submitted
    if (dpp.hasStudentSubmitted(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted this DPP'
      });
    }

    // Verify student is in the classroom
    const classroom = await Classroom.findOne({
      _id: dpp.classroom,
      'students.student': studentId
    });

    if (!classroom) {
      return res.status(403).json({
        success: false,
        error: 'You are not enrolled in this classroom'
      });
    }

    // Calculate score
    const score = dpp.calculateMCQScore(answers);
    const isLate = new Date() > dpp.dueDate;

    // Create submission
    const submission = {
      student: studentId,
      answers,
      score,
      maxScore: dpp.maxScore,
      isLate,
      submittedAt: new Date()
    };

    dpp.submissions.push(submission);
    await dpp.save();

    // Get the submission ID from the saved document
    const savedSubmission = dpp.submissions[dpp.submissions.length - 1];

    res.json({
      success: true,
      message: 'MCQ answers submitted successfully',
      submission: {
        _id: savedSubmission._id,
        score,
        maxScore: dpp.maxScore,
        isLate,
        submittedAt: submission.submittedAt
      }
    });
  } catch (error) {
    console.error('Error submitting MCQ answers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit answers'
    });
  }
};

/**
 * Submit files (for file-based DPPs)
 */
const submitFiles = async (req, res) => {
  try {
    const { dppId } = req.params;
    const studentId = req.user.id;

    const dpp = await DailyPracticeProblem.findById(dppId);
    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found'
      });
    }

    if (dpp.type !== 'file') {
      return res.status(400).json({
        success: false,
        error: 'This DPP is not a file submission type'
      });
    }

    // Check if student already submitted
    if (dpp.hasStudentSubmitted(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted this DPP'
      });
    }

    // Verify student is in the classroom
    const classroom = await Classroom.findOne({
      _id: dpp.classroom,
      'students.student': studentId
    });

    if (!classroom) {
      return res.status(403).json({
        success: false,
        error: 'You are not enrolled in this classroom'
      });
    }

    // Handle file upload with multer
    const uploadMiddleware = upload.array('files', dpp.maxFiles);
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
      }

      // Process uploaded files with assignment file mapping
      const { assignmentFileIds } = req.body; // Array of assignment file IDs corresponding to uploaded files
      
      if (assignmentFileIds && assignmentFileIds.length !== req.files.length) {
        return res.status(400).json({
          success: false,
          error: 'Number of assignment file IDs must match number of uploaded files'
        });
      }

      const fileSubmissions = req.files.map((file, index) => {
        const fileSubmission = {
          fileName: file.originalname,
          fileUrl: `/uploads/dpp-submissions/${file.filename}`,
          fileSize: file.size,
          uploadedAt: new Date()
        };

        // Map to assignment file if provided
        if (assignmentFileIds && assignmentFileIds[index]) {
          const assignmentFile = dpp.assignmentFiles.id(assignmentFileIds[index]);
          if (assignmentFile) {
            fileSubmission.assignmentFileId = assignmentFileIds[index];
            fileSubmission.difficulty = assignmentFile.difficulty;
          }
        }

        return fileSubmission;
      });

      const isLate = new Date() > dpp.dueDate;

      // Create submission
      const submission = {
        student: studentId,
        fileSubmissions,
        score: 0, // Will be graded by teacher
        maxScore: dpp.maxScore,
        isLate,
        submittedAt: new Date()
      };

      dpp.submissions.push(submission);
      await dpp.save();

      // Get the submission ID from the saved document
      const savedSubmission = dpp.submissions[dpp.submissions.length - 1];

      res.json({
        success: true,
        message: 'Files submitted successfully',
        submission: {
          _id: savedSubmission._id,
          fileSubmissions: fileSubmissions.map(fs => ({
            fileName: fs.fileName,
            fileSize: fs.fileSize,
            uploadedAt: fs.uploadedAt
          })),
          isLate,
          submittedAt: submission.submittedAt
        }
      });
    });
  } catch (error) {
    console.error('Error submitting files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit files'
    });
  }
};

/**
 * Grade a file submission
 */
const gradeSubmission = async (req, res) => {
  try {
    const { dppId, submissionId } = req.params;
    const teacherId = req.user.id;
    const { score, feedback } = req.body;

    const dpp = await DailyPracticeProblem.findOne({
      _id: dppId,
      teacher: teacherId
    });

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found or you do not have permission'
      });
    }

    const submission = dpp.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    // Validate score
    if (score < 0 || score > dpp.maxScore) {
      return res.status(400).json({
        success: false,
        error: `Score must be between 0 and ${dpp.maxScore}`
      });
    }

    submission.score = score;
    submission.feedback = feedback;
    submission.gradedAt = new Date();
    submission.gradedBy = teacherId;

    await dpp.save();

    res.json({
      success: true,
      message: 'Submission graded successfully',
      submission
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grade submission'
    });
  }
};

/**
 * Get DPP analytics for teacher
 */
const getDPPAnalytics = async (req, res) => {
  try {
    const { dppId } = req.params;
    const teacherId = req.user.id;

    const dpp = await DailyPracticeProblem.findOne({
      _id: dppId,
      teacher: teacherId
    }).populate('submissions.student', 'name email')
      .populate('classroom', 'students');

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found or you do not have permission'
      });
    }

    console.log('DPP found:', {
      id: dpp._id,
      submissionCount: dpp.submissions.length,
      hasQuestions: !!dpp.questions,
      questionsCount: dpp.questions ? dpp.questions.length : 0
    });

    if (dpp.submissions.length > 0) {
      console.log('First submission structure:', {
        id: dpp.submissions[0]._id,
        hasAnswers: !!dpp.submissions[0].answers,
        answersCount: dpp.submissions[0].answers ? dpp.submissions[0].answers.length : 0,
        firstAnswer: dpp.submissions[0].answers ? dpp.submissions[0].answers[0] : null,
        score: dpp.submissions[0].score,
        maxScore: dpp.submissions[0].maxScore
      });
      
      // Log all answers for debugging
      if (dpp.submissions[0].answers) {
        console.log('All answers in first submission:', dpp.submissions[0].answers);
      }
    }

    console.log('Questions structure:', dpp.questions ? dpp.questions.map((q, index) => ({
      index: index,
      id: q._id,
      difficulty: q.difficulty,
      text: q.text?.substring(0, 50) + '...',
      correctAnswer: q.correctAnswer,
      hasOptions: !!q.options,
      optionsCount: q.options ? q.options.length : 0,
      options: q.options ? q.options.map(opt => ({
        text: opt.text,
        isCorrect: opt.isCorrect
      })) : []
    })) : 'No questions');

    // Get classroom student count
    const totalStudents = dpp.classroom ? dpp.classroom.students.length : 0;

    // Calculate difficulty distribution and performance based on DPP type
    let difficultyDistribution = null;
    let difficultyPerformance = {
      easy: { avg: 0, count: 0 },
      medium: { avg: 0, count: 0 },
      hard: { avg: 0, count: 0 }
    };

    if (dpp.type === 'mcq' && dpp.questions && dpp.questions.length > 0) {
      // MCQ TYPE ANALYSIS
      console.log('Analyzing MCQ type DPP');
      
      // Calculate difficulty distribution from questions
      difficultyDistribution = dpp.questions.reduce((acc, q) => {
        acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
        return acc;
      }, { easy: 0, medium: 0, hard: 0 });

      // Calculate average performance by difficulty from MCQ submissions
      const difficultyStats = {
        easy: { totalAnswers: 0, correctAnswers: 0 },
        medium: { totalAnswers: 0, correctAnswers: 0 },
        hard: { totalAnswers: 0, correctAnswers: 0 }
      };

      dpp.submissions.forEach((submission, submissionIndex) => {
        console.log(`Processing submission ${submissionIndex + 1}:`, {
          id: submission._id,
          hasAnswers: !!submission.answers,
          answersCount: submission.answers ? submission.answers.length : 0
        });
        
        if (submission.answers && Array.isArray(submission.answers)) {
          submission.answers.forEach((answer, answerIndex) => {
            console.log(`  Answer ${answerIndex + 1}:`, {
              questionIndex: answer.questionIndex,
              selectedOption: answer.selectedOption,
              questionId: answer.questionId,
              isCorrect: answer.isCorrect
            });
            
            // Use questionIndex to find the question since questionId is undefined
            if (answer.questionIndex !== undefined && answer.questionIndex < dpp.questions.length) {
              const question = dpp.questions[answer.questionIndex];
              console.log(`  Found question by index:`, question ? {
                id: question._id,
                difficulty: question.difficulty,
                text: question.text?.substring(0, 30) + '...',
                correctAnswer: question.correctAnswer
              } : 'NOT FOUND');
              
              if (question && question.difficulty) {
                const difficulty = question.difficulty;
                difficultyStats[difficulty].totalAnswers++;
                
                // Find the correct answer from options
                let isCorrect = false;
                if (question.correctAnswer) {
                  // If correctAnswer is directly stored
                  isCorrect = answer.selectedOption === question.correctAnswer;
                } else if (question.options && Array.isArray(question.options)) {
                  // Find correct option from options array
                  const correctOption = question.options.find(opt => opt.isCorrect === true);
                  if (correctOption) {
                    isCorrect = answer.selectedOption === correctOption.text;
                  }
                }
                
                console.log(`  Checking correctness: selectedOption="${answer.selectedOption}", correctAnswer="${question.correctAnswer}", isCorrect=${isCorrect}`);
                
                if (isCorrect) {
                  difficultyStats[difficulty].correctAnswers++;
                }
                console.log(`  Updated stats for ${difficulty}:`, difficultyStats[difficulty]);
              }
            }
          });
        }
      });

      // Calculate percentages for MCQ difficulty performance
      Object.keys(difficultyPerformance).forEach(difficulty => {
        const stats = difficultyStats[difficulty];
        if (stats.totalAnswers > 0) {
          difficultyPerformance[difficulty].avg = (stats.correctAnswers / stats.totalAnswers) * 100;
          difficultyPerformance[difficulty].count = stats.totalAnswers;
        } else {
          difficultyPerformance[difficulty].avg = 0;
          difficultyPerformance[difficulty].count = 0;
        }
      });

      console.log('MCQ Difficulty Stats:', difficultyStats);
      console.log('MCQ Performance:', difficultyPerformance);

    } else if (dpp.type === 'file' && dpp.assignmentFiles && dpp.assignmentFiles.length > 0) {
      // FILE TYPE ANALYSIS
      console.log('Analyzing File type DPP');
      
      // Calculate difficulty distribution from assignment files
      difficultyDistribution = dpp.assignmentFiles.reduce((acc, f) => {
        acc[f.difficulty] = (acc[f.difficulty] || 0) + 1;
        return acc;
      }, { easy: 0, medium: 0, hard: 0 });

      // For file submissions, we can calculate performance based on scores
      // Since file submissions don't have individual answer tracking like MCQ,
      // we'll calculate performance based on overall submission scores
      const difficultyScores = {
        easy: { totalScore: 0, maxScore: 0, submissions: 0 },
        medium: { totalScore: 0, maxScore: 0, submissions: 0 },
        hard: { totalScore: 0, maxScore: 0, submissions: 0 }
      };

      // For file type, we'll use overall difficulty or distribute evenly
      if (dpp.overallDifficulty) {
        // If there's an overall difficulty, attribute all submissions to that difficulty
        dpp.submissions.forEach(submission => {
          const difficulty = dpp.overallDifficulty;
          difficultyScores[difficulty].totalScore += submission.score || 0;
          difficultyScores[difficulty].maxScore += submission.maxScore || dpp.maxScore;
          difficultyScores[difficulty].submissions++;
        });
      } else {
        // If no overall difficulty, distribute based on assignment files difficulty
        dpp.submissions.forEach(submission => {
          // For simplicity, we'll use the first assignment file's difficulty
          // or distribute evenly across all difficulties
          const firstFileDifficulty = dpp.assignmentFiles[0]?.difficulty || 'medium';
          difficultyScores[firstFileDifficulty].totalScore += submission.score || 0;
          difficultyScores[firstFileDifficulty].maxScore += submission.maxScore || dpp.maxScore;
          difficultyScores[firstFileDifficulty].submissions++;
        });
      }

      // Calculate percentages for file difficulty performance
      Object.keys(difficultyPerformance).forEach(difficulty => {
        const stats = difficultyScores[difficulty];
        if (stats.submissions > 0 && stats.maxScore > 0) {
          difficultyPerformance[difficulty].avg = (stats.totalScore / stats.maxScore) * 100;
          difficultyPerformance[difficulty].count = stats.submissions;
        } else {
          difficultyPerformance[difficulty].avg = 0;
          difficultyPerformance[difficulty].count = 0;
        }
      });

      console.log('File Difficulty Scores:', difficultyScores);
      console.log('File Performance:', difficultyPerformance);
    }



    // Calculate statistics directly from submissions
    const submissionCount = dpp.submissions.length;
    const onTimeSubmissions = dpp.submissions.filter(sub => !sub.isLate).length;
    const lateSubmissions = submissionCount - onTimeSubmissions;
    
    // Calculate average score
    const totalScore = dpp.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    const totalPossibleScore = submissionCount * dpp.maxScore;
    const averageScore = submissionCount > 0 && totalPossibleScore > 0 
      ? (totalScore / totalPossibleScore) * 100 
      : 0;
    
    // Calculate top score
    const topScore = dpp.submissions.length > 0 
      ? Math.max(...dpp.submissions.map(s => s.score || 0))
      : 0;

    // Build complete analytics response
    const analytics = {
      dpp: {
        _id: dpp._id,
        title: dpp.title,
        type: dpp.type,
        maxScore: dpp.maxScore,
        dueDate: dpp.dueDate,
        questions: dpp.questions,
        assignmentFiles: dpp.assignmentFiles,
        difficultyDistribution,
        overallDifficulty: dpp.overallDifficulty
      },
      submissions: dpp.submissions.map(sub => ({
        _id: sub._id,
        student: {
          _id: sub.student._id,
          name: sub.student.name,
          email: sub.student.email
        },
        score: sub.score || 0,
        maxScore: sub.maxScore || dpp.maxScore,
        isLate: sub.isLate || false,
        submittedAt: sub.submittedAt,
        feedback: sub.feedback
      })),
      stats: {
        totalStudents,
        submissionCount,
        submissionRate: totalStudents > 0 ? (submissionCount / totalStudents) * 100 : 0,
        averageScore,
        onTimeSubmissions,
        lateSubmissions,
        topScore,
        difficultyPerformance
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching DPP analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
};

/**
 * Get a specific submission (for teachers and students)
 */
const getSubmission = async (req, res) => {
  try {
    const { dppId, submissionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const dpp = await DailyPracticeProblem.findById(dppId)
      .populate('teacher', 'name email')
      .populate('classroom', 'name subject')
      .populate('submissions.student', 'name email');

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found'
      });
    }

    // Check access permissions
    let hasAccess = false;
    if (userRole === 'teacher') {
      hasAccess = dpp.teacher._id.toString() === userId;
    } else {
      // Check if student is in the classroom
      const classroom = await Classroom.findOne({
        _id: dpp.classroom._id,
        'students.student': userId
      });
      hasAccess = !!classroom;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this DPP'
      });
    }

    // Find the specific submission
    const submission = dpp.submissions.find(sub => sub._id.toString() === submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    // If student, ensure they can only view their own submission
    if (userRole === 'student' && submission.student._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own submission'
      });
    }

    // Calculate detailed answers for MCQ
    let detailedAnswers = null;
    if (dpp.type === 'mcq' && submission.answers) {
      detailedAnswers = submission.answers.map((answer, index) => {
        const question = dpp.questions[index];
        if (question) {
          const correctOption = question.options.find(opt => opt.isCorrect);
          const isCorrect = correctOption && correctOption.text === answer.selectedOption;
          return {
            questionIndex: answer.questionIndex,
            selectedOption: answer.selectedOption,
            isCorrect,
            earnedMarks: isCorrect ? (question.marks || 1) : 0
          };
        }
        return answer;
      });
    }

    // Build submission response
    const submissionData = {
      _id: submission._id,
      student: {
        _id: submission.student._id,
        name: submission.student.name,
        email: submission.student.email
      },
      dpp: {
        _id: dpp._id,
        title: dpp.title,
        description: dpp.description,
        type: dpp.type,
        maxScore: dpp.maxScore,
        questions: dpp.questions,
        assignmentFiles: dpp.assignmentFiles
      },
      answers: detailedAnswers,
      files: submission.files,
      score: submission.score,
      maxScore: submission.maxScore || dpp.maxScore,
      isLate: submission.isLate,
      submittedAt: submission.submittedAt,
      feedback: submission.feedback,
      gradeOverride: submission.gradeOverride
    };

    res.json({
      success: true,
      submission: submissionData
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission'
    });
  }
};

/**
 * Get student's own submission
 */
const getMySubmission = async (req, res) => {
  try {
    const { dppId } = req.params;
    const studentId = req.user.id;

    const dpp = await DailyPracticeProblem.findById(dppId)
      .populate('teacher', 'name email')
      .populate('classroom', 'name subject')
      .populate('submissions.student', 'name email');

    if (!dpp) {
      return res.status(404).json({
        success: false,
        error: 'DPP not found'
      });
    }

    // Verify student is in the classroom
    const classroom = await Classroom.findOne({
      _id: dpp.classroom._id,
      'students.student': studentId
    });

    if (!classroom) {
      return res.status(403).json({
        success: false,
        error: 'You are not enrolled in this classroom'
      });
    }

    // Find student's submission
    const submission = dpp.submissions.find(sub => sub.student._id.toString() === studentId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'No submission found'
      });
    }

    // Calculate detailed answers for MCQ
    let detailedAnswers = null;
    if (dpp.type === 'mcq' && submission.answers) {
      detailedAnswers = submission.answers.map((answer, index) => {
        const question = dpp.questions[index];
        if (question) {
          const correctOption = question.options.find(opt => opt.isCorrect);
          const isCorrect = correctOption && correctOption.text === answer.selectedOption;
          return {
            questionIndex: answer.questionIndex,
            selectedOption: answer.selectedOption,
            isCorrect,
            earnedMarks: isCorrect ? (question.marks || 1) : 0
          };
        }
        return answer;
      });
    }

    // Build submission response
    const submissionData = {
      _id: submission._id,
      student: {
        _id: submission.student._id,
        name: submission.student.name,
        email: submission.student.email
      },
      dpp: {
        _id: dpp._id,
        title: dpp.title,
        description: dpp.description,
        type: dpp.type,
        maxScore: dpp.maxScore,
        questions: dpp.questions,
        assignmentFiles: dpp.assignmentFiles
      },
      answers: detailedAnswers,
      files: submission.files,
      score: submission.score,
      maxScore: submission.maxScore || dpp.maxScore,
      isLate: submission.isLate,
      submittedAt: submission.submittedAt,
      feedback: submission.feedback,
      gradeOverride: submission.gradeOverride
    };

    res.json({
      success: true,
      submission: submissionData
    });
  } catch (error) {
    console.error('Error fetching student submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission'
    });
  }
};

module.exports = {
  createDPP,
  getClassroomDPPs,
  getDPP,
  updateDPP,
  deleteDPP,
  togglePublishDPP,
  submitMCQAnswers,
  submitFiles,
  gradeSubmission,
  getDPPAnalytics,
  getSubmission,
  getMySubmission
};