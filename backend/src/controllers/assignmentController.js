const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Classroom = require('../models/Classroom');
const { hasAWSConfig } = require('../services/s3Service');

class AssignmentController {
  // Get all assignments for current user (all classrooms)
  async getAllAssignments(req, res) {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      let assignments;

      if (userRole === 'teacher') {
        // Get all classrooms where user is teacher
        const classrooms = await Classroom.find({ teacher: userId, isActive: true });
        const classroomIds = classrooms.map(c => c._id);

        // Get all assignments from these classrooms
        assignments = await Assignment.find({ 
          classroom: { $in: classroomIds } 
        })
          .populate('classroom', 'name classCode')
          .sort({ createdAt: -1 });

        // Add submission count for teachers
        for (let assignment of assignments) {
          const submissionCount = await Submission.countDocuments({ assignment: assignment._id });
          assignment._doc.submissionCount = submissionCount;
        }
      } else {
        // Get all classrooms where user is student
        const classrooms = await Classroom.find({ 
          'students.student': userId, 
          isActive: true 
        });
        const classroomIds = classrooms.map(c => c._id);

        // Get published assignments from these classrooms
        assignments = await Assignment.find({
          classroom: { $in: classroomIds },
          isPublished: true
        })
          .populate('classroom', 'name classCode')
          .sort({ dueDate: 1 });

        // Add user's submission status
        for (let assignment of assignments) {
          const submission = await Submission.findOne({ 
            assignment: assignment._id, 
            student: userId 
          });
          assignment._doc.userSubmission = submission;
          assignment._doc.submissions = submission ? [submission] : [];
        }
      }

      res.json({
        assignments,
        total: assignments.length
      });
    } catch (error) {
      console.error('Get all assignments error:', error);
      res.status(500).json({ message: 'Server error while fetching assignments' });
    }
  }

  // Create new assignment (Teachers only)
  async createAssignment(req, res) {
    try {
      const {
        title, description, type, totalPoints, dueDate,
        allowLateSubmission, targetLevels, instructions,
        questions, timeLimit, isProctoredTest, proctoringSettings
      } = req.body;
      
      const { classroomId } = req.params;
      const teacherId = req.user._id;

      // Verify teacher owns the classroom
      const classroom = await Classroom.findOne({ _id: classroomId, teacher: teacherId });
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found or access denied' });
      }

      // Calculate total points from questions if it's a quiz/test/mcq with questions
      let calculatedTotalPoints = totalPoints || 100;
      if ((type === 'quiz' || type === 'test' || type === 'mcq') && questions && questions.length > 0) {
        calculatedTotalPoints = questions.reduce((sum, question) => sum + (question.points || 0), 0);
      }

      const assignment = new Assignment({
        title,
        description,
        classroom: classroomId,
        teacher: teacherId,
        type: type || 'assignment',
        totalPoints: calculatedTotalPoints,
        dueDate,
        allowLateSubmission: allowLateSubmission || false,
        targetLevels: targetLevels || ['beginner', 'intermediate', 'advanced'],
        instructions,
        questions: questions || [],
        timeLimit,
        isProctoredTest: isProctoredTest || false,
        proctoringSettings: proctoringSettings || {},
        isPublished: true // Publish assignments by default
      });

      await assignment.save();
      await assignment.populate([
        { path: 'classroom', select: 'name classCode' },
        { path: 'teacher', select: 'name email' }
      ]);

      // Update classroom assignment count
      await Classroom.findByIdAndUpdate(classroomId, { $inc: { totalAssignments: 1 } });

      res.status(201).json({
        message: 'Assignment created successfully',
        assignment
      });
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({ message: 'Server error while creating assignment' });
    }
  }

  // Get assignments for a classroom
  async getClassroomAssignments(req, res) {
    try {
      const { classroomId } = req.params;
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

      let query = { classroom: classroomId };
      
      // Students only see published assignments
      if (userRole === 'student') {
        query.isPublished = true;
        
        // Filter by student's level
        const studentInfo = classroom.students.find(s => s.student.toString() === userId.toString());
        if (studentInfo) {
          query.targetLevels = { $in: [studentInfo.level] };
        }
      }

      const assignments = await Assignment.find(query)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode')
        .sort({ dueDate: 1, createdAt: -1 });

      // For students, include submission status
      if (userRole === 'student') {
        for (let assignment of assignments) {
          const submission = await Submission.findOne({
            assignment: assignment._id,
            student: userId
          });
          assignment._doc.submissionStatus = submission ? submission.status : 'not-started';
          assignment._doc.hasSubmission = !!submission;
        }
      } else {
        // For teachers, include submission statistics
        for (let assignment of assignments) {
          const totalSubmissions = await Submission.countDocuments({
            assignment: assignment._id,
            status: { $in: ['submitted', 'graded', 'returned'] }
          });
          const gradedSubmissions = await Submission.countDocuments({
            assignment: assignment._id,
            status: 'graded'
          });
          
          assignment._doc.submissionStats = {
            total: totalSubmissions,
            graded: gradedSubmissions,
            pending: totalSubmissions - gradedSubmissions
          };
        }
      }

      res.json({
        assignments,
        total: assignments.length
      });
    } catch (error) {
      console.error('Get assignments error:', error);
      res.status(500).json({ message: 'Server error while fetching assignments' });
    }
  }

  // Get single assignment
  async getAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const assignment = await Assignment.findById(assignmentId)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode');

      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // Check access
      const classroom = await Classroom.findById(assignment.classroom._id);
      const hasAccess = userRole === 'teacher' 
        ? classroom.teacher.toString() === userId.toString()
        : classroom.students.some(s => s.student.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this assignment' });
      }

      // Students can only see published assignments
      if (userRole === 'student' && !assignment.isPublished) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // Get user's submission if exists
      let submission = null;
      if (userRole === 'student') {
        submission = await Submission.findOne({
          assignment: assignmentId,
          student: userId
        });
      }

      res.json({
        assignment,
        submission
      });
    } catch (error) {
      console.error('Get assignment error:', error);
      res.status(500).json({ message: 'Server error while fetching assignment' });
    }
  }

  // Update assignment (Teachers only)
  async updateAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const teacherId = req.user._id;

      const assignment = await Assignment.findOne({ _id: assignmentId, teacher: teacherId });
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found or access denied' });
      }

      const updateData = { ...req.body };
      delete updateData.classroom; // Prevent changing classroom
      delete updateData.teacher; // Prevent changing teacher

      const updatedAssignment = await Assignment.findByIdAndUpdate(
        assignmentId,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'classroom', select: 'name classCode' },
        { path: 'teacher', select: 'name email' }
      ]);

      res.json({
        message: 'Assignment updated successfully',
        assignment: updatedAssignment
      });
    } catch (error) {
      console.error('Update assignment error:', error);
      res.status(500).json({ message: 'Server error while updating assignment' });
    }
  }

  // Publish assignment (Teachers only)
  async publishAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const teacherId = req.user._id;

      const assignment = await Assignment.findOneAndUpdate(
        { _id: assignmentId, teacher: teacherId },
        { isPublished: true, publishedAt: new Date() },
        { new: true }
      );

      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found or access denied' });
      }

      res.json({
        message: 'Assignment published successfully',
        assignment
      });
    } catch (error) {
      console.error('Publish assignment error:', error);
      res.status(500).json({ message: 'Server error while publishing assignment' });
    }
  }

  // Delete assignment (Teachers only)
  async deleteAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const teacherId = req.user._id;

      const assignment = await Assignment.findOneAndDelete({
        _id: assignmentId,
        teacher: teacherId
      });

      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found or access denied' });
      }

      // Delete related submissions
      await Submission.deleteMany({ assignment: assignmentId });

      // Update classroom assignment count
      await Classroom.findByIdAndUpdate(assignment.classroom, { $inc: { totalAssignments: -1 } });

      res.json({
        message: 'Assignment deleted successfully'
      });
    } catch (error) {
      console.error('Delete assignment error:', error);
      res.status(500).json({ message: 'Server error while deleting assignment' });
    }
  }

  // Submit assignment (Students only)
  async submitAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const { content, answers } = req.body;
      const studentId = req.user._id;

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      if (!assignment.isPublished) {
        return res.status(400).json({ message: 'Assignment is not yet published' });
      }

      // Check if student has access to this assignment
      const classroom = await Classroom.findById(assignment.classroom);
      const studentInfo = classroom.students.find(s => s.student.toString() === studentId.toString());
      
      if (!studentInfo) {
        return res.status(403).json({ message: 'Access denied to this assignment' });
      }

      // Check if assignment targets student's level
      if (!assignment.targetLevels.includes(studentInfo.level)) {
        return res.status(403).json({ message: 'This assignment is not for your level' });
      }

      // Check deadline
      const now = new Date();
      const isLate = now > assignment.dueDate;
      
      if (isLate && !assignment.allowLateSubmission) {
        return res.status(400).json({ message: 'Assignment deadline has passed and late submissions are not allowed' });
      }

      // Find or create submission
      let submission = await Submission.findOne({
        assignment: assignmentId,
        student: studentId
      });

      if (submission && submission.status === 'submitted') {
        return res.status(400).json({ message: 'Assignment already submitted' });
      }

      if (!submission) {
        submission = new Submission({
          assignment: assignmentId,
          student: studentId,
          startedAt: new Date()
        });
      }

      // Update submission
      submission.content = content || submission.content;
      submission.answers = answers || submission.answers;
      submission.isLateSubmission = isLate;
      
      await submission.submit();

      // Calculate grade for quiz/test automatically
      if (assignment.type !== 'assignment' && answers && answers.length > 0) {
        let totalPoints = 0;
        let earnedPoints = 0;

        for (let answer of answers) {
          const question = assignment.questions.find(q => q._id.toString() === answer.questionId.toString());
          if (question) {
            totalPoints += question.points || 0;
            if (answer.answer === question.correctAnswer) {
              earnedPoints += question.points || 0;
              answer.isCorrect = true;
              answer.pointsEarned = question.points || 0;
            } else {
              answer.isCorrect = false;
              answer.pointsEarned = 0;
            }
          }
        }

        submission.grade.points = earnedPoints;
        submission.calculateGrade(assignment.totalPoints);
        submission.status = 'graded';
        submission.gradedAt = new Date();
        submission.gradedBy = assignment.teacher;
      }

      await submission.save();
      await submission.populate([
        { path: 'assignment', select: 'title type totalPoints' },
        { path: 'student', select: 'name email studentId' }
      ]);

      res.json({
        message: 'Assignment submitted successfully',
        submission
      });
    } catch (error) {
      console.error('Submit assignment error:', error);
      res.status(500).json({ message: 'Server error while submitting assignment' });
    }
  }

  // Get assignment submissions (Teachers only)
  async getAssignmentSubmissions(req, res) {
    try {
      const { assignmentId } = req.params;
      const teacherId = req.user._id;

      const assignment = await Assignment.findOne({ _id: assignmentId, teacher: teacherId });
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found or access denied' });
      }

      const submissions = await Submission.find({ assignment: assignmentId })
        .populate('student', 'name email studentId')
        .sort({ submittedAt: -1 });

      res.json({
        submissions,
        total: submissions.length,
        assignment: {
          id: assignment._id,
          title: assignment.title,
          type: assignment.type,
          totalPoints: assignment.totalPoints,
          questions: assignment.questions, // Include questions for MCQ display
          attachments: assignment.attachments // Include attachments if any
        }
      });
    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({ message: 'Server error while fetching submissions' });
    }
  }

  // Grade submission (Teachers only)
  async gradeSubmission(req, res) {
    try {
      const { submissionId } = req.params;
      const { points, feedback, rubricScores } = req.body;
      const teacherId = req.user._id;

      const submission = await Submission.findById(submissionId)
        .populate('assignment', 'teacher totalPoints');

      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      if (submission.assignment.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to grade this submission' });
      }

      // Update grade
      submission.grade.points = points;
      submission.grade.feedback = feedback;
      submission.grade.rubricScores = rubricScores || [];
      submission.calculateGrade(submission.assignment.totalPoints);
      submission.status = 'graded';
      submission.gradedBy = teacherId;
      submission.gradedAt = new Date();

      await submission.save();
      await submission.populate('student', 'name email studentId');

      res.json({
        message: 'Submission graded successfully',
        submission
      });
    } catch (error) {
      console.error('Grade submission error:', error);
      res.status(500).json({ message: 'Server error while grading submission' });
    }
  }

  // Submit MCQ assignment (Students only)
  async submitMCQAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const { answers } = req.body;
      const studentId = req.user._id;

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      if (assignment.type !== 'mcq') {
        return res.status(400).json({ message: 'This endpoint is only for MCQ assignments' });
      }

      if (!assignment.isPublished) {
        return res.status(400).json({ message: 'Assignment is not yet published' });
      }

      // Check if student has access
      const classroom = await Classroom.findById(assignment.classroom);
      const studentInfo = classroom.students.find(s => s.student.toString() === studentId.toString());
      
      if (!studentInfo) {
        return res.status(403).json({ message: 'Access denied to this assignment' });
      }

      // Check deadline
      const now = new Date();
      const isLate = now > assignment.dueDate;
      
      if (isLate && !assignment.allowLateSubmission) {
        return res.status(400).json({ message: 'Assignment deadline has passed' });
      }

      // Check if already submitted
      let submission = await Submission.findOne({
        assignment: assignmentId,
        student: studentId
      });

      if (submission && submission.status === 'submitted') {
        return res.status(400).json({ message: 'Assignment already submitted' });
      }

      if (!submission) {
        submission = new Submission({
          assignment: assignmentId,
          student: studentId,
          startedAt: new Date()
        });
      }

      // Process MCQ answers and calculate grade
      let totalPoints = 0;
      let earnedPoints = 0;
      const processedAnswers = [];

      for (const [questionId, answer] of Object.entries(answers)) {
        const question = assignment.questions.find(q => q._id.toString() === questionId);
        if (question) {
          totalPoints += question.points || 0;
          const isCorrect = answer === question.correctAnswer;
          const pointsEarned = isCorrect ? (question.points || 0) : 0;
          
          earnedPoints += pointsEarned;
          processedAnswers.push({
            questionId: question._id,
            answer: answer,
            isCorrect: isCorrect,
            pointsEarned: pointsEarned
          });
        }
      }

      // Update submission
      submission.answers = processedAnswers;
      submission.grade.points = earnedPoints;
      submission.calculateGrade(assignment.totalPoints);
      submission.status = 'graded'; // Auto-graded
      submission.isLateSubmission = isLate;
      submission.gradedBy = assignment.teacher;
      submission.gradedAt = new Date();
      
      await submission.submit();
      await submission.populate([
        { path: 'assignment', select: 'title type totalPoints' },
        { path: 'student', select: 'name email studentId' }
      ]);

      res.json({
        message: 'MCQ assignment submitted and graded successfully',
        score: earnedPoints,
        totalPoints: assignment.totalPoints,
        percentage: submission.grade.percentage,
        submission
      });
    } catch (error) {
      console.error('Submit MCQ assignment error:', error);
      res.status(500).json({ message: 'Server error while submitting MCQ assignment' });
    }
  }

  // Submit file assignment (Students only)  
  async submitFileAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user._id;

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      if (assignment.type !== 'file') {
        return res.status(400).json({ message: 'This endpoint is only for file-based assignments' });
      }

      if (!assignment.isPublished) {
        return res.status(400).json({ message: 'Assignment is not yet published' });
      }

      // Check if student has access
      const classroom = await Classroom.findById(assignment.classroom);
      const studentInfo = classroom.students.find(s => s.student.toString() === studentId.toString());
      
      if (!studentInfo) {
        return res.status(403).json({ message: 'Access denied to this assignment' });
      }

      // Check deadline
      const now = new Date();
      const isLate = now > assignment.dueDate;
      
      if (isLate && !assignment.allowLateSubmission) {
        return res.status(400).json({ message: 'Assignment deadline has passed' });
      }

      // Check if already submitted
      let submission = await Submission.findOne({
        assignment: assignmentId,
        student: studentId
      });

      if (submission && submission.status === 'submitted') {
        return res.status(400).json({ message: 'Assignment already submitted' });
      }

      // Handle file uploads from S3 or local storage
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const attachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: hasAWSConfig ? file.location : `/uploads/assignments/${file.filename}`,
        fileSize: file.size,
        fileType: file.mimetype,
        fileKey: hasAWSConfig ? file.key : file.filename,
        uploadedAt: new Date()
      }));

      if (!submission) {
        submission = new Submission({
          assignment: assignmentId,
          student: studentId,
          startedAt: new Date()
        });
      }

      // Update submission
      submission.attachments = attachments;
      submission.content = 'File submission'; // Default content for file submissions
      submission.isLateSubmission = isLate;
      
      await submission.submit();
      await submission.populate([
        { path: 'assignment', select: 'title type totalPoints' },
        { path: 'student', select: 'name email studentId' }
      ]);

      res.json({
        message: 'File assignment submitted successfully',
        filesUploaded: attachments.length,
        submission
      });
    } catch (error) {
      console.error('Submit file assignment error:', error);
      res.status(500).json({ message: 'Server error while submitting file assignment' });
    }
  }

  // Add attachments to existing assignment (Teachers only)
  async addAssignmentAttachments(req, res) {
    try {
      const { assignmentId } = req.params;
      const teacherId = req.user._id;

      // Check if assignment exists and belongs to the teacher
      const assignment = await Assignment.findOne({ _id: assignmentId, teacher: teacherId });
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found or access denied' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files were uploaded' });
      }

      // Process uploaded files
      console.log('Processing files, hasAWSConfig:', hasAWSConfig);
      console.log('File objects:', req.files.map(f => ({
        originalname: f.originalname,
        filename: f.filename,
        key: f.key,
        location: f.location,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype,
        allProperties: Object.keys(f)
      })));

      const attachments = req.files.map(file => {
        let fileKey, fileUrl;
        
        if (hasAWSConfig) {
          // S3 storage
          fileKey = file.key;
          fileUrl = file.location;
        } else {
          // Local storage
          fileKey = file.filename;
          fileUrl = `/uploads/assignments/${file.filename}`;
        }
        
        console.log(`File ${file.originalname}: fileKey = ${fileKey}, fileUrl = ${fileUrl}`);
        
        return {
          fileName: file.originalname,
          fileUrl: fileUrl,
          fileKey: fileKey,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        };
      });

      // Add attachments to assignment
      assignment.attachments = assignment.attachments || [];
      assignment.attachments.push(...attachments);
      await assignment.save();

      res.json({
        message: 'Attachments added successfully',
        attachments: attachments,
        totalAttachments: assignment.attachments.length
      });

    } catch (error) {
      console.error('Add assignment attachments error:', error);
      res.status(500).json({ message: 'Server error while adding attachments' });
    }
  }

  // Download assignment attachment
  async downloadAttachment(req, res) {
    try {
      const { assignmentId, attachmentId } = req.params;
      
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
          const user = await User.findById(decoded.id);
          if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
          }
          userId = user._id;
          userRole = user.role;
        } catch (tokenError) {
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
      } else {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get assignment with attachments
      const assignment = await Assignment.findById(assignmentId).populate('classroom', 'students teacher');
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // Check user permissions
      const hasAccess = userRole === 'teacher' 
        ? assignment.teacher.toString() === userId.toString() // Teacher owns assignment
        : assignment.classroom.students.some(s => s.student.toString() === userId.toString()); // Student is in classroom

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this assignment' });
      }

      // Find the attachment
      const attachment = assignment.attachments.find(att => att._id.toString() === attachmentId);
      if (!attachment) {
        return res.status(404).json({ message: 'Attachment not found' });
      }

      console.log('Attachment found:', {
        fileName: attachment.fileName,
        fileKey: attachment.fileKey,
        hasAWSConfig
      });

      // Handle S3 download with signed URL
      if (hasAWSConfig && attachment.fileKey) {
        const { getSignedUrl } = require('../services/s3Service');
        
        try {
          const signedUrl = getSignedUrl(attachment.fileKey, attachment.fileName);
          
          if (signedUrl) {
            // Redirect to signed URL for download
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
      
      // Check if fileKey exists and is valid
      if (!attachment.fileKey) {
        return res.status(404).json({ message: 'File path not found' });
      }
      
      const filePath = path.join(process.cwd(), 'uploads', 'assignments', attachment.fileKey);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on server' });
      }

      // Set proper headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
      
      // Stream file to prevent memory issues with large files
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Download attachment error:', error);
      res.status(500).json({ message: 'Server error while downloading attachment' });
    }
  }
}

module.exports = new AssignmentController();