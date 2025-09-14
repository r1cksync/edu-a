const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const mongoose = require('mongoose');

class UserController {
  // Get user dashboard stats
  async getDashboard(req, res) {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;

      let dashboardData = {};

      if (userRole === 'teacher') {
        // Teacher dashboard
        const classroomsCount = await Classroom.countDocuments({ teacher: userId, isActive: true });
        const assignmentsCount = await Assignment.countDocuments({ teacher: userId });
        const submissionsCount = await Submission.countDocuments({
          assignment: { $in: await Assignment.find({ teacher: userId }).select('_id') }
        });

        const recentClassrooms = await Classroom.find({ teacher: userId, isActive: true })
          .populate('students.student', 'name')
          .sort({ updatedAt: -1 })
          .limit(5);

        const pendingGrading = await Submission.countDocuments({
          assignment: { $in: await Assignment.find({ teacher: userId }).select('_id') },
          status: 'submitted'
        });

        dashboardData = {
          stats: {
            classrooms: classroomsCount,
            assignments: assignmentsCount,
            submissions: submissionsCount,
            pendingGrading
          },
          recentClassrooms: recentClassrooms.map(c => ({
            id: c._id,
            name: c.name,
            studentsCount: c.students.length,
            classCode: c.classCode,
            updatedAt: c.updatedAt
          }))
        };
      } else {
        // Student dashboard
        const enrolledClassrooms = await Classroom.find({ 
          'students.student': userId, 
          isActive: true 
        }).populate('teacher', 'name');

        const assignments = await Assignment.find({
          classroom: { $in: enrolledClassrooms.map(c => c._id) },
          isPublished: true
        });

        const submissions = await Submission.find({ student: userId });
        const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
        const gradedCount = submissions.filter(s => s.status === 'graded').length;

        // Upcoming assignments
        const upcomingAssignments = await Assignment.find({
          classroom: { $in: enrolledClassrooms.map(c => c._id) },
          isPublished: true,
          dueDate: { $gte: new Date() }
        })
          .populate('classroom', 'name')
          .sort({ dueDate: 1 })
          .limit(5);

        dashboardData = {
          stats: {
            classrooms: enrolledClassrooms.length,
            assignments: assignments.length,
            submissions: submittedCount,
            graded: gradedCount
          },
          enrolledClassrooms: enrolledClassrooms.map(c => ({
            id: c._id,
            name: c.name,
            teacher: c.teacher.name,
            classCode: c.classCode
          })),
          upcomingAssignments: upcomingAssignments.map(a => ({
            id: a._id,
            title: a.title,
            classroom: a.classroom.name,
            dueDate: a.dueDate,
            type: a.type
          }))
        };
      }

      res.json(dashboardData);
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ message: 'Server error while fetching dashboard' });
    }
  }

  // Search users (Teachers only - for inviting students)
  async searchUsers(req, res) {
    try {
      const { query, role = 'student' } = req.query;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters' });
      }

      const searchRegex = new RegExp(query, 'i');
      
      const users = await User.find({
        role,
        isActive: true,
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { studentId: searchRegex },
          { teacherId: searchRegex }
        ]
      })
        .select('name email studentId teacherId profilePicture')
        .limit(10);

      res.json({
        users,
        total: users.length
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ message: 'Server error while searching users' });
    }
  }

  // Get user's submission history
  async getSubmissionHistory(req, res) {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, status, classroomId } = req.query;

      let query = { student: userId };
      
      if (status) {
        query.status = status;
      }

      if (classroomId) {
        if (!mongoose.Types.ObjectId.isValid(classroomId)) {
          return res.status(400).json({ message: 'Invalid classroom ID format' });
        }
        const assignments = await Assignment.find({ classroom: classroomId }).select('_id');
        query.assignment = { $in: assignments.map(a => a._id) };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const submissions = await Submission.find(query)
        .populate({
          path: 'assignment',
          select: 'title type totalPoints dueDate',
          populate: {
            path: 'classroom',
            select: 'name classCode'
          }
        })
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Submission.countDocuments(query);

      res.json({
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get submission history error:', error);
      res.status(500).json({ message: 'Server error while fetching submission history' });
    }
  }

  // Get user's grades summary
  async getGradesSummary(req, res) {
    try {
      const userId = req.user._id;
      const { classroomId } = req.query;

      let query = { student: userId, status: 'graded' };

      if (classroomId) {
        const assignments = await Assignment.find({ classroom: classroomId }).select('_id');
        query.assignment = { $in: assignments.map(a => a._id) };
      }

      const submissions = await Submission.find(query)
        .populate({
          path: 'assignment',
          select: 'title type totalPoints dueDate',
          populate: {
            path: 'classroom',
            select: 'name classCode'
          }
        })
        .sort({ 'assignment.dueDate': -1 });

      // Calculate overall statistics
      const totalSubmissions = submissions.length;
      const averageGrade = totalSubmissions > 0 
        ? submissions.reduce((sum, s) => sum + s.grade.percentage, 0) / totalSubmissions 
        : 0;

      // Grade distribution
      const gradeDistribution = {
        A: submissions.filter(s => s.grade.percentage >= 90).length,
        B: submissions.filter(s => s.grade.percentage >= 80 && s.grade.percentage < 90).length,
        C: submissions.filter(s => s.grade.percentage >= 70 && s.grade.percentage < 80).length,
        D: submissions.filter(s => s.grade.percentage >= 60 && s.grade.percentage < 70).length,
        F: submissions.filter(s => s.grade.percentage < 60).length
      };

      res.json({
        submissions,
        summary: {
          totalSubmissions,
          averageGrade: Math.round(averageGrade * 100) / 100,
          gradeDistribution
        }
      });
    } catch (error) {
      console.error('Get grades summary error:', error);
      res.status(500).json({ message: 'Server error while fetching grades summary' });
    }
  }

  // Upload profile picture
  async uploadProfilePicture(req, res) {
    try {
      // This would typically involve file upload middleware like multer
      // For now, we'll just accept a URL
      const { profilePictureUrl } = req.body;
      const userId = req.user._id;

      const user = await User.findByIdAndUpdate(
        userId,
        { profilePicture: profilePictureUrl },
        { new: true }
      ).select('-password');

      res.json({
        message: 'Profile picture updated successfully',
        user
      });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({ message: 'Server error while uploading profile picture' });
    }
  }
}

module.exports = new UserController();