const Attendance = require('../models/Attendance');
const VideoClass = require('../models/VideoClass');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const mongoose = require('mongoose');

class AttendanceController {

  // Mark attendance when student joins a class
  async markAttendance(req, res) {
    try {
      const { classId } = req.params;
      const studentId = req.user._id;
      const { status = 'present' } = req.body;

      // Verify student role
      if (req.user.role !== 'student') {
        return res.status(403).json({ message: 'Only students can mark attendance' });
      }

      const attendanceRecord = await Attendance.markAttendance(studentId, classId, status);

      res.json({
        message: 'Attendance marked successfully',
        attendance: attendanceRecord
      });

    } catch (error) {
      console.error('Mark attendance error:', error);
      res.status(500).json({ message: 'Server error while marking attendance' });
    }
  }

  // Update attendance when student leaves
  async updateAttendanceOnLeave(req, res) {
    try {
      const { classId } = req.params;
      const studentId = req.user._id;

      const attendanceRecord = await Attendance.findOne({
        student: studentId,
        videoClass: classId
      });

      if (!attendanceRecord) {
        return res.status(404).json({ message: 'Attendance record not found' });
      }

      // Update left time and calculate duration
      attendanceRecord.leftAt = new Date();
      await attendanceRecord.save();

      res.json({
        message: 'Attendance updated successfully',
        attendance: attendanceRecord
      });

    } catch (error) {
      console.error('Update attendance error:', error);
      res.status(500).json({ message: 'Server error while updating attendance' });
    }
  }

  // Get student's attendance statistics for a classroom
  async getStudentAttendanceStats(req, res) {
    try {
      const { classroomId } = req.params;
      const studentId = req.user.role === 'student' ? req.user._id : req.query.studentId;

      if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
      }

      // Verify access
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      // Check if user has access to view this data
      let hasAccess = false;
      if (req.user.role === 'teacher') {
        hasAccess = classroom.teacher.toString() === req.user._id.toString();
      } else if (req.user.role === 'student') {
        hasAccess = studentId.toString() === req.user._id.toString();
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const stats = await Attendance.getStudentAttendanceStats(studentId, classroomId);

      res.json({
        stats,
        studentId,
        classroomId
      });

    } catch (error) {
      console.error('Get student attendance stats error:', error);
      res.status(500).json({ message: 'Server error while fetching attendance statistics' });
    }
  }

  // Get all students' attendance statistics for a classroom (teacher only)
  async getClassroomAttendanceStats(req, res) {
    try {
      const { classroomId } = req.params;
      const teacherId = req.user._id;

      // Verify teacher role and ownership
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can view classroom attendance statistics' });
      }

      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      if (classroom.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      const stats = await Attendance.getClassroomAttendanceStats(classroomId);

      // Get total classes conducted
      const totalClassesConducted = await VideoClass.countDocuments({
        classroom: classroomId,
        status: 'ended'
      });

      // Get total students enrolled
      const totalStudentsEnrolled = classroom.students ? classroom.students.length : 0;

      // Calculate overall stats
      const totalAttendanceRecords = stats.length;
      let averageAttendanceRate = 0;
      
      if (stats.length > 0) {
        const totalAttendancePercentage = stats.reduce((sum, student) => sum + (student.attendancePercentage || 0), 0);
        averageAttendanceRate = totalAttendancePercentage / stats.length;
      }

      // Group stats by class and student for easier frontend consumption
      const studentAttendanceStats = stats.map(student => ({
        student: {
          _id: student._id,
          name: student.studentName,
          email: student.studentEmail
        },
        totalClasses: student.totalClasses,
        attendedClasses: student.presentClasses + student.lateClasses,
        attendancePercentage: student.attendancePercentage || 0
      }));

      res.json({
        totalClassesHosted: totalClassesConducted,
        totalStudentsEnrolled,
        averageAttendanceRate,
        totalAttendanceRecords,
        classAttendanceStats: [], // TODO: Add class-level stats if needed
        studentAttendanceStats,
        classroomId,
        classroomName: classroom.name
      });

    } catch (error) {
      console.error('Get classroom attendance stats error:', error);
      res.status(500).json({ message: 'Server error while fetching classroom attendance statistics' });
    }
  }

  // Get detailed attendance records for a classroom (teacher only)
  async getDetailedAttendanceRecords(req, res) {
    try {
      const { classroomId } = req.params;
      const { page = 1, limit = 20, studentId, startDate, endDate } = req.query;
      const teacherId = req.user._id;

      // Verify teacher role and ownership
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can view detailed attendance records' });
      }

      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      if (classroom.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Build query
      const query = { classroom: classroomId };
      if (studentId) {
        query.student = studentId;
      }
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const attendanceRecords = await Attendance.find(query)
        .populate('student', 'name email')
        .populate('videoClass', 'title scheduledStartTime actualStartTime actualEndTime')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const totalRecords = await Attendance.countDocuments(query);

      res.json({
        attendanceRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          hasNext: skip + attendanceRecords.length < totalRecords,
          hasPrev: parseInt(page) > 1
        },
        classroomId,
        classroomName: classroom.name
      });

    } catch (error) {
      console.error('Get detailed attendance records error:', error);
      res.status(500).json({ message: 'Server error while fetching attendance records' });
    }
  }

  // Get student's detailed attendance history
  async getStudentAttendanceHistory(req, res) {
    try {
      const { classroomId } = req.params;
      const studentId = req.user.role === 'student' ? req.user._id : req.query.studentId;
      const { page = 1, limit = 20, startDate, endDate } = req.query;

      if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
      }

      // Verify access
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      let hasAccess = false;
      if (req.user.role === 'teacher') {
        hasAccess = classroom.teacher.toString() === req.user._id.toString();
      } else if (req.user.role === 'student') {
        hasAccess = studentId.toString() === req.user._id.toString();
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Build query
      const query = {
        student: studentId,
        classroom: classroomId
      };
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const attendanceHistory = await Attendance.find(query)
        .populate('videoClass', 'title scheduledStartTime actualStartTime actualEndTime status')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const totalRecords = await Attendance.countDocuments(query);

      // Get summary statistics
      const stats = await Attendance.getStudentAttendanceStats(studentId, classroomId);

      res.json({
        attendanceHistory,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          hasNext: skip + attendanceHistory.length < totalRecords,
          hasPrev: parseInt(page) > 1
        },
        studentId,
        classroomId,
        classroomName: classroom.name
      });

    } catch (error) {
      console.error('Get student attendance history error:', error);
      res.status(500).json({ message: 'Server error while fetching attendance history' });
    }
  }

  // Bulk mark attendance (for teachers - emergency situations)
  async bulkMarkAttendance(req, res) {
    try {
      const { classId } = req.params;
      const { attendanceRecords } = req.body; // Array of { studentId, status }
      const teacherId = req.user._id;

      // Verify teacher role
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can bulk mark attendance' });
      }

      // Verify class ownership
      const videoClass = await VideoClass.findById(classId)
        .populate('classroom');

      if (!videoClass) {
        return res.status(404).json({ message: 'Video class not found' });
      }

      if (videoClass.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this class' });
      }

      const results = [];
      for (const record of attendanceRecords) {
        try {
          const attendanceRecord = await Attendance.markAttendance(
            record.studentId,
            classId,
            record.status || 'present'
          );
          results.push({
            studentId: record.studentId,
            success: true,
            attendance: attendanceRecord
          });
        } catch (error) {
          results.push({
            studentId: record.studentId,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        message: 'Bulk attendance marking completed',
        results,
        totalProcessed: attendanceRecords.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

    } catch (error) {
      console.error('Bulk mark attendance error:', error);
      res.status(500).json({ message: 'Server error while bulk marking attendance' });
    }
  }

  // Get attendance dashboard data
  async getAttendanceDashboard(req, res) {
    try {
      const { classroomId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      let hasAccess = false;
      if (userRole === 'teacher') {
        hasAccess = classroom.teacher.toString() === userId.toString();
      } else if (userRole === 'student') {
        hasAccess = classroom.students.some(s => s.student.toString() === userId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      let dashboardData;

      if (userRole === 'teacher') {
        // Teacher dashboard
        const classroomStats = await Attendance.getClassroomAttendanceStats(classroomId);
        const totalClasses = await VideoClass.countDocuments({
          classroom: classroomId,
          status: 'ended'
        });

        const recentAttendance = await Attendance.find({ classroom: classroomId })
          .populate('student', 'name email')
          .populate('videoClass', 'title scheduledStartTime')
          .sort({ createdAt: -1 })
          .limit(10);

        dashboardData = {
          type: 'teacher',
          totalStudents: classroomStats.length,
          totalClasses,
          averageAttendance: classroomStats.length > 0 
            ? Math.round(classroomStats.reduce((acc, student) => acc + student.attendancePercentage, 0) / classroomStats.length)
            : 0,
          studentStats: classroomStats,
          recentAttendance
        };

      } else {
        // Student dashboard
        const stats = await Attendance.getStudentAttendanceStats(userId, classroomId);
        const recentAttendance = await Attendance.find({
          student: userId,
          classroom: classroomId
        })
          .populate('videoClass', 'title scheduledStartTime actualStartTime')
          .sort({ createdAt: -1 })
          .limit(5);

        dashboardData = {
          type: 'student',
          stats,
          recentAttendance,
          attendanceGoal: 75 // Can be configurable
        };
      }

      res.json({
        dashboard: dashboardData,
        classroomName: classroom.name,
        classroomId
      });

    } catch (error) {
      console.error('Get attendance dashboard error:', error);
      res.status(500).json({ message: 'Server error while fetching attendance dashboard' });
    }
  }

  // Sync absences for ended classes (utility method for existing data)
  async syncAbsencesForEndedClasses(req, res) {
    try {
      const { classroomId } = req.params;
      const teacherId = req.user._id;

      // Verify teacher role and ownership
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can sync absences' });
      }

      const classroom = await Classroom.findById(classroomId).populate('students.student');
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      if (classroom.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Get all ended classes in this classroom
      const endedClasses = await VideoClass.find({
        classroom: classroomId,
        status: 'ended'
      });

      let totalNewAbsences = 0;

      for (const videoClass of endedClasses) {
        // Get students who attended this class
        const attendedStudentIds = await Attendance.find({
          videoClass: videoClass._id,
          status: { $in: ['present', 'late'] }
        }).distinct('student');

        // Mark absent students who didn't attend
        for (const studentEntry of classroom.students) {
          const studentId = studentEntry.student._id;
          
          // Check if student didn't attend
          const hasAttended = attendedStudentIds.some(id => id.toString() === studentId.toString());
          
          if (!hasAttended) {
            // Check if attendance record already exists
            const existingRecord = await Attendance.findOne({
              student: studentId,
              videoClass: videoClass._id
            });
            
            if (!existingRecord) {
              // Create absent record
              await Attendance.create({
                student: studentId,
                classroom: videoClass.classroom,
                videoClass: videoClass._id,
                status: 'absent',
                classStartTime: videoClass.actualStartTime || videoClass.scheduledStartTime,
                classEndTime: videoClass.actualEndTime || videoClass.scheduledEndTime,
                attendancePercentage: 0,
                duration: 0
              });
              totalNewAbsences++;
            }
          }
        }
      }

      res.json({
        message: 'Absences synced successfully',
        classesProcessed: endedClasses.length,
        newAbsencesMarked: totalNewAbsences
      });

    } catch (error) {
      console.error('Sync absences error:', error);
      res.status(500).json({ message: 'Server error while syncing absences' });
    }
  }

}

module.exports = new AttendanceController();