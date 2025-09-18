const VideoClass = require('../models/VideoClass');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const Post = require('../models/Post');
const { videoService } = require('../services/videoCallingService');
const Attendance = require('../models/Attendance');

class VideoClassController {
  
  // Helper function to create announcement posts for video classes
  static async createVideoClassAnnouncement(videoClass, type = 'scheduled') {
    try {
      let content = '';
      let title = '';
      
      if (type === 'scheduled') {
        const startTime = new Date(videoClass.scheduledStartTime);
        const endTime = new Date(videoClass.scheduledEndTime);
        const duration = Math.round((endTime - startTime) / (1000 * 60)); // duration in minutes
        
        title = `📅 Video Class Scheduled: ${videoClass.title}`;
        content = `🎓 **Video Class Scheduled**\n\n` +
                 `**Class:** ${videoClass.title}\n` +
                 `**Date:** ${startTime.toLocaleDateString('en-US', { 
                   weekday: 'long', 
                   year: 'numeric', 
                   month: 'long', 
                   day: 'numeric' 
                 })}\n` +
                 `**Time:** ${startTime.toLocaleTimeString('en-US', { 
                   hour: '2-digit', 
                   minute: '2-digit',
                   hour12: true 
                 })} - ${endTime.toLocaleTimeString('en-US', { 
                   hour: '2-digit', 
                   minute: '2-digit',
                   hour12: true 
                 })}\n` +
                 `**Duration:** ${duration} minutes\n\n`;
        
        if (videoClass.description) {
          content += `**Description:** ${videoClass.description}\n\n`;
        }
        
        content += `📝 **Important Notes:**\n` +
                  `• Join the class from the "Video Classes" tab\n` +
                  `• Make sure you have a stable internet connection\n` +
                  `• Classes can be joined 15 minutes before the scheduled time\n`;
        
        if (!videoClass.allowLateJoin) {
          content += `• ⚠️ Late joining is not allowed for this class\n`;
        }
        
        if (videoClass.isRecorded) {
          content += `• 🎥 This class will be recorded for later viewing\n`;
        }
        
      } else if (type === 'instant_started') {
        title = `🔴 LIVE: ${videoClass.title}`;
        content = `🔴 **LIVE VIDEO CLASS**\n\n` +
                 `**Class:** ${videoClass.title}\n` +
                 `**Status:** Live Now! 🎥\n` +
                 `**Started:** ${new Date().toLocaleTimeString('en-US', { 
                   hour: '2-digit', 
                   minute: '2-digit',
                   hour12: true 
                 })}\n\n`;
        
        if (videoClass.description) {
          content += `**About:** ${videoClass.description}\n\n`;
        }
        
        content += `🚀 **How to Join:**\n` +
                  `1. Go to the "Video Classes" tab\n` +
                  `2. Click "Join Class" next to this live session\n` +
                  `3. You'll be automatically connected to the video call\n\n` +
                  `📱 **Tips:**\n` +
                  `• Use headphones for better audio quality\n` +
                  `• Ensure good lighting if using video\n` +
                  `• Have your questions ready!\n\n` +
                  `⏰ Don't miss out - join now!`;
                  
      } else if (type === 'ended') {
        const duration = videoClass.actualDuration || 0;
        const attendanceRate = videoClass.attendancePercentage || 0;
        
        title = `✅ Class Completed: ${videoClass.title}`;
        content = `✅ **VIDEO CLASS COMPLETED**\n\n` +
                 `**Class:** ${videoClass.title}\n` +
                 `**Duration:** ${duration} minutes\n` +
                 `**Attendance:** ${videoClass.totalStudentsAttended}/${videoClass.totalStudentsInvited} students (${attendanceRate}%)\n` +
                 `**Ended:** ${new Date().toLocaleTimeString('en-US', { 
                   hour: '2-digit', 
                   minute: '2-digit',
                   hour12: true 
                 })}\n\n`;
        
        if (videoClass.isRecorded) {
          content += `🎥 **Recording Available**\n` +
                    `The class recording will be available in the "Video Classes" tab shortly.\n\n`;
        }
        
        content += `📚 **Next Steps:**\n` +
                  `• Review any materials shared during the class\n` +
                  `• Complete any assignments given\n` +
                  `• Reach out if you have questions about the session\n\n` +
                  `Thank you for attending! 🎓`;
                  
      } else if (type === 'cancelled') {
        const startTime = new Date(videoClass.scheduledStartTime);
        const endTime = new Date(videoClass.scheduledEndTime);
        
        title = `❌ Class Cancelled: ${videoClass.title}`;
        content = `❌ **VIDEO CLASS CANCELLED**\n\n` +
                 `**Class:** ${videoClass.title}\n` +
                 `**Originally Scheduled:** ${startTime.toLocaleDateString('en-US', { 
                   weekday: 'long', 
                   year: 'numeric', 
                   month: 'long', 
                   day: 'numeric' 
                 })} at ${startTime.toLocaleTimeString('en-US', { 
                   hour: '2-digit', 
                   minute: '2-digit',
                   hour12: true 
                 })}\n` +
                 `**Cancelled:** ${new Date().toLocaleTimeString('en-US', { 
                   hour: '2-digit', 
                   minute: '2-digit',
                   hour12: true 
                 })}\n\n`;
        
        if (videoClass.description) {
          content += `**About:** ${videoClass.description}\n\n`;
        }
        
        content += `📝 **Important Information:**\n` +
                  `• This scheduled video class has been cancelled\n` +
                  `• No action is required from students\n` +
                  `• Watch for announcements about any rescheduled sessions\n` +
                  `• Contact your teacher if you have questions\n\n` +
                  `🔄 **What's Next:**\n` +
                  `• Your teacher may reschedule this class\n` +
                  `• Check the "Video Classes" tab for updates\n` +
                  `• Continue with other course materials\n\n` +
                  `We apologize for any inconvenience caused.`;
      }
      
      // Create the announcement post
      const announcementPost = new Post({
        classroom: videoClass.classroom,
        author: videoClass.teacher,
        title: title,
        content: content,
        type: 'announcement',
        tags: ['video-class', type, 'important'],
        metadata: {
          videoClassId: videoClass._id,
          videoClassType: type,
          scheduledTime: videoClass.scheduledStartTime,
          isUrgent: type === 'instant_started' || type === 'cancelled'
        }
      });
      
      await announcementPost.save();
      await announcementPost.populate([
        { path: 'author', select: 'name email profilePicture' },
        { path: 'classroom', select: 'name classCode' }
      ]);
      
      console.log(`Video class announcement created: ${title}`);
      return announcementPost;
      
    } catch (error) {
      console.error('Error creating video class announcement:', error);
      // Don't throw error - announcement creation should not break video class creation
      return null;
    }
  }

  // Schedule a new video class
  async scheduleClass(req, res) {
    try {
      const {
        classroomId,
        title,
        description,
        scheduledStartTime,
        scheduledEndTime,
        type = 'scheduled',
        allowLateJoin = true,
        maxDuration = 120,
        isRecorded = false
      } = req.body;

      const teacherId = req.user._id;
      const userRole = req.user.role;

      // Only teachers can schedule classes
      if (userRole !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can schedule video classes' });
      }

      // Verify teacher has access to classroom
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      if (classroom.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Validate times
      const startTime = new Date(scheduledStartTime);
      const endTime = new Date(scheduledEndTime);
      const now = new Date();

      if (startTime <= now) {
        return res.status(400).json({ message: 'Start time must be in the future' });
      }

      if (endTime <= startTime) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }

      // Check for scheduling conflicts
      const conflictingClass = await VideoClass.findOne({
        classroom: classroomId,
        status: { $in: ['scheduled', 'live'] },
        $or: [
          {
            scheduledStartTime: { $lte: endTime },
            scheduledEndTime: { $gte: startTime }
          }
        ]
      });

      if (conflictingClass) {
        return res.status(400).json({ 
          message: 'There is already a class scheduled during this time',
          conflictingClass: {
            title: conflictingClass.title,
            scheduledStartTime: conflictingClass.scheduledStartTime,
            scheduledEndTime: conflictingClass.scheduledEndTime
          }
        });
      }

      // Get total students in classroom for attendance tracking
      const totalStudents = classroom.students ? classroom.students.length : 0;

      const videoClass = new VideoClass({
        classroom: classroomId,
        teacher: teacherId,
        title,
        description,
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
        type,
        allowLateJoin,
        maxDuration,
        isRecorded,
        totalStudentsInvited: totalStudents
      });

      await videoClass.save();
      await videoClass.populate([
        { path: 'teacher', select: 'name email' },
        { path: 'classroom', select: 'name classCode' }
      ]);

      // Create announcement post for scheduled class
      const announcement = await VideoClassController.createVideoClassAnnouncement(videoClass, 'scheduled');

      res.status(201).json({
        message: 'Video class scheduled successfully',
        videoClass,
        announcement: announcement ? {
          id: announcement._id,
          title: announcement.title
        } : null
      });
    } catch (error) {
      console.error('Schedule class error:', error);
      res.status(500).json({ message: 'Server error while scheduling class' });
    }
  }

  // Start an instant class
  async startInstantClass(req, res) {
    try {
      const {
        classroomId,
        title = 'Instant Class',
        description = '',
        maxDuration = 120
      } = req.body;

      const teacherId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can start instant classes' });
      }

      const classroom = await Classroom.findById(classroomId);
      if (!classroom || classroom.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Check if there's already a live class
      const existingLiveClass = await VideoClass.findOne({
        classroom: classroomId,
        status: 'live'
      });

      if (existingLiveClass) {
        return res.status(400).json({ 
          message: 'There is already a live class in this classroom',
          liveClass: existingLiveClass
        });
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + maxDuration * 60000);
      const totalStudents = classroom.students ? classroom.students.length : 0;

      // Generate meeting credentials
      const tempClassId = `instant_${Date.now()}_${teacherId}`;
      const meetingCredentials = await videoService.generateMeeting({
        classId: tempClassId,
        title,
        teacherId: teacherId.toString(),
        maxParticipants: totalStudents + 5, // Add buffer for teacher and TAs
        recordingEnabled: false // Instant classes typically not recorded
      });

      const videoClass = new VideoClass({
        classroom: classroomId,
        teacher: teacherId,
        title,
        description,
        scheduledStartTime: now,
        scheduledEndTime: endTime,
        actualStartTime: now,
        type: 'instant',
        status: 'live',
        maxDuration,
        totalStudentsInvited: totalStudents,
        meetingId: meetingCredentials.meetingId,
        meetingUrl: meetingCredentials.meetingUrl,
        meetingPassword: meetingCredentials.meetingPassword
      });

      await videoClass.save();
      await videoClass.populate([
        { path: 'teacher', select: 'name email' },
        { path: 'classroom', select: 'name classCode' }
      ]);

      // Create announcement post for instant live class
      const announcement = await VideoClassController.createVideoClassAnnouncement(videoClass, 'instant_started');

      res.status(201).json({
        message: 'Instant class started successfully',
        videoClass,
        announcement: announcement ? {
          id: announcement._id,
          title: announcement.title
        } : null
      });
    } catch (error) {
      console.error('Start instant class error:', error);
      res.status(500).json({ message: 'Server error while starting instant class' });
    }
  }

  // Start a scheduled class
  async startClass(req, res) {
    try {
      const { classId } = req.params;
      const teacherId = req.user._id;

      const videoClass = await VideoClass.findById(classId)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode');

      if (!videoClass) {
        return res.status(404).json({ message: 'Video class not found' });
      }

      if (videoClass.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Only the teacher can start this class' });
      }

      if (videoClass.status !== 'scheduled') {
        return res.status(400).json({ message: `Class is already ${videoClass.status}` });
      }

      // Check if it's time to start (allow starting 15 minutes early)
      const now = new Date();
      const earlyStartTime = new Date(videoClass.scheduledStartTime.getTime() - 15 * 60000);

      if (now < earlyStartTime) {
        return res.status(400).json({ 
          message: 'Class can only be started 15 minutes before scheduled time',
          scheduledStartTime: videoClass.scheduledStartTime
        });
      }

      // Generate meeting credentials
      const meetingCredentials = await videoService.generateMeeting({
        classId: videoClass._id.toString(),
        title: videoClass.title,
        teacherId: teacherId.toString(),
        maxParticipants: videoClass.totalStudentsInvited + 5, // Add buffer for teacher and TAs
        recordingEnabled: videoClass.isRecorded
      });

      // Update video class with meeting details
      videoClass.meetingId = meetingCredentials.meetingId;
      videoClass.meetingUrl = meetingCredentials.meetingUrl;
      videoClass.meetingPassword = meetingCredentials.meetingPassword;

      await videoClass.startClass();

      // Create announcement post when scheduled class goes live
      const announcement = await VideoClassController.createVideoClassAnnouncement(videoClass, 'instant_started');

      res.json({
        message: 'Class started successfully',
        videoClass,
        announcement: announcement ? {
          id: announcement._id,
          title: announcement.title
        } : null
      });
    } catch (error) {
      console.error('Start class error:', error);
      res.status(500).json({ message: 'Server error while starting class' });
    }
  }

  // End a class
  async endClass(req, res) {
    try {
      const { classId } = req.params;
      const teacherId = req.user._id;

      const videoClass = await VideoClass.findById(classId)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode')
        .populate('participants.student', 'name email');

      if (!videoClass) {
        return res.status(404).json({ message: 'Video class not found' });
      }

      if (videoClass.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Only the teacher can end this class' });
      }

      if (videoClass.status !== 'live') {
        return res.status(400).json({ message: 'Class is not currently live' });
      }

      await videoClass.endClass();

      // Create announcement post when class ends
      const announcement = await VideoClassController.createVideoClassAnnouncement(videoClass, 'ended');

      res.json({
        message: 'Class ended successfully',
        videoClass,
        announcement: announcement ? {
          id: announcement._id,
          title: announcement.title
        } : null,
        summary: {
          duration: videoClass.actualDuration,
          totalStudentsInvited: videoClass.totalStudentsInvited,
          totalStudentsAttended: videoClass.totalStudentsAttended,
          attendancePercentage: videoClass.attendancePercentage
        }
      });
    } catch (error) {
      console.error('End class error:', error);
      res.status(500).json({ message: 'Server error while ending class' });
    }
  }

  // Join a class (for students)
  async joinClass(req, res) {
    try {
      const { classId } = req.params;
      const studentId = req.user._id;
      const userRole = req.user.role;

      if (userRole !== 'student') {
        return res.status(403).json({ message: 'Only students can join classes' });
      }

      const videoClass = await VideoClass.findById(classId)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode students');

      if (!videoClass) {
        return res.status(404).json({ message: 'Video class not found' });
      }

      // Check if student is enrolled in the classroom
      const isEnrolled = videoClass.classroom.students.some(s => 
        s.student.toString() === studentId.toString()
      );

      if (!isEnrolled) {
        return res.status(403).json({ message: 'You are not enrolled in this classroom' });
      }

      if (videoClass.status !== 'live') {
        if (videoClass.status === 'scheduled') {
          return res.status(400).json({ 
            message: 'Class has not started yet',
            scheduledStartTime: videoClass.scheduledStartTime
          });
        } else if (videoClass.status === 'ended') {
          return res.status(400).json({ message: 'Class has already ended' });
        } else {
          return res.status(400).json({ message: 'Class is not available' });
        }
      }

      // Check if late join is allowed
      if (!videoClass.allowLateJoin) {
        const joinTimeLimit = new Date(videoClass.actualStartTime.getTime() + 10 * 60000); // 10 minutes
        if (new Date() > joinTimeLimit) {
          return res.status(400).json({ message: 'Late joining is not allowed for this class' });
        }
      }

      await videoClass.addParticipant(studentId);

      // Automatically mark attendance when student joins
      try {
        await Attendance.markAttendance(studentId, classId, 'present');
        console.log(`Attendance marked for student ${studentId} in class ${classId}`);
      } catch (attendanceError) {
        console.error('Error marking attendance:', attendanceError);
        // Don't fail the join operation if attendance marking fails
      }

      res.json({
        message: 'Joined class successfully',
        videoClass: {
          _id: videoClass._id,
          title: videoClass.title,
          description: videoClass.description,
          meetingId: videoClass.meetingId,
          meetingPassword: videoClass.meetingPassword,
          meetingUrl: videoClass.meetingUrl,
          teacher: videoClass.teacher,
          classroom: videoClass.classroom
        }
      });
    } catch (error) {
      console.error('Join class error:', error);
      res.status(500).json({ message: 'Server error while joining class' });
    }
  }

  // Leave a class (for students)
  async leaveClass(req, res) {
    try {
      const { classId } = req.params;
      const studentId = req.user._id;

      const videoClass = await VideoClass.findById(classId);

      if (!videoClass) {
        return res.status(404).json({ message: 'Video class not found' });
      }

      // Update leave time for attendance tracking
      try {
        const attendanceRecord = await Attendance.findOne({
          student: studentId,
          videoClass: classId
        });

        if (attendanceRecord && !attendanceRecord.leftAt) {
          attendanceRecord.leftAt = new Date();
          attendanceRecord.calculateDuration();
          attendanceRecord.calculateAttendancePercentage();
          await attendanceRecord.save();
        }
      } catch (attendanceError) {
        console.error('Error updating attendance on leave:', attendanceError);
        // Don't fail the leave operation if attendance update fails
      }

      await videoClass.removeParticipant(studentId);

      res.json({
        message: 'Left class successfully'
      });
    } catch (error) {
      console.error('Leave class error:', error);
      res.status(500).json({ message: 'Server error while leaving class' });
    }
  }

  // Get classes for a classroom
  async getClassroomClasses(req, res) {
    try {
      const { classroomId } = req.params;
      const { status = 'all', limit = 20, page = 1 } = req.query;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Verify user has access to classroom
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      let hasAccess = false;
      if (userRole === 'teacher') {
        hasAccess = classroom.teacher.toString() === userId.toString();
      } else {
        hasAccess = classroom.students.some(s => s.student.toString() === userId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      let query = { classroom: classroomId };
      
      if (status !== 'all') {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const classes = await VideoClass.find(query)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode')
        .populate('participants.student', 'name email')
        .sort({ scheduledStartTime: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await VideoClass.countDocuments(query);

      res.json({
        classes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get classroom classes error:', error);
      res.status(500).json({ message: 'Server error while fetching classes' });
    }
  }

  // Get upcoming classes
  async getUpcomingClasses(req, res) {
    try {
      const { classroomId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Verify access
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      let hasAccess = false;
      if (userRole === 'teacher') {
        hasAccess = classroom.teacher.toString() === userId.toString();
      } else {
        hasAccess = classroom.students.some(s => s.student.toString() === userId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      const upcomingClasses = await VideoClass.getUpcomingClasses(classroomId);

      res.json({
        upcomingClasses
      });
    } catch (error) {
      console.error('Get upcoming classes error:', error);
      res.status(500).json({ message: 'Server error while fetching upcoming classes' });
    }
  }

  // Get live classes
  async getLiveClasses(req, res) {
    try {
      const { classroomId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Verify access
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      let hasAccess = false;
      if (userRole === 'teacher') {
        hasAccess = classroom.teacher.toString() === userId.toString();
      } else {
        hasAccess = classroom.students.some(s => s.student.toString() === userId.toString());
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      const liveClasses = await VideoClass.getLiveClasses(classroomId);

      res.json({
        liveClasses
      });
    } catch (error) {
      console.error('Get live classes error:', error);
      res.status(500).json({ message: 'Server error while fetching live classes' });
    }
  }

  // Get class details
  async getClass(req, res) {
    try {
      const { classId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const videoClass = await VideoClass.findById(classId)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode students')
        .populate('participants.student', 'name email');

      if (!videoClass) {
        return res.status(404).json({ message: 'Video class not found' });
      }

      // Check access
      let hasAccess = false;
      if (userRole === 'teacher') {
        hasAccess = videoClass.teacher._id.toString() === userId.toString();
      } else {
        hasAccess = videoClass.classroom.students.some(s => 
          s.student.toString() === userId.toString()
        );
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this class' });
      }

      // Filter sensitive information for students
      if (userRole === 'student') {
        const classData = videoClass.toObject();
        delete classData.meetingPassword; // Students get password only when joining
        res.json({ videoClass: classData });
      } else {
        res.json({ videoClass });
      }
    } catch (error) {
      console.error('Get class error:', error);
      res.status(500).json({ message: 'Server error while fetching class details' });
    }
  }

  // Update class (for teachers)
  async updateClass(req, res) {
    try {
      const { classId } = req.params;
      const {
        title,
        description,
        scheduledStartTime,
        scheduledEndTime,
        allowLateJoin,
        isRecorded
      } = req.body;
      const teacherId = req.user._id;

      const videoClass = await VideoClass.findById(classId)
        .populate('teacher', 'name email')
        .populate('classroom', 'name classCode');

      if (!videoClass) {
        return res.status(404).json({ message: 'Video class not found' });
      }

      if (videoClass.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Only the teacher can update this class' });
      }

      if (videoClass.status === 'live') {
        return res.status(400).json({ message: 'Cannot update a live class' });
      }

      if (videoClass.status === 'ended') {
        return res.status(400).json({ message: 'Cannot update an ended class' });
      }

      // Update allowed fields
      if (title) videoClass.title = title;
      if (description) videoClass.description = description;
      if (scheduledStartTime) {
        const newStartTime = new Date(scheduledStartTime);
        if (newStartTime <= new Date()) {
          return res.status(400).json({ message: 'Start time must be in the future' });
        }
        videoClass.scheduledStartTime = newStartTime;
      }
      if (scheduledEndTime) {
        const newEndTime = new Date(scheduledEndTime);
        if (newEndTime <= videoClass.scheduledStartTime) {
          return res.status(400).json({ message: 'End time must be after start time' });
        }
        videoClass.scheduledEndTime = newEndTime;
      }
      if (allowLateJoin !== undefined) videoClass.allowLateJoin = allowLateJoin;
      if (isRecorded !== undefined) videoClass.isRecorded = isRecorded;

      await videoClass.save();

      res.json({
        message: 'Class updated successfully',
        videoClass
      });
    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({ message: 'Server error while updating class' });
    }
  }

  // Delete/Cancel class (for teachers)
  async deleteClass(req, res) {
    try {
      const { classId } = req.params;
      const teacherId = req.user._id;

      const videoClass = await VideoClass.findById(classId);

      if (!videoClass) {
        return res.status(404).json({ message: 'Video class not found' });
      }

      if (videoClass.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({ message: 'Only the teacher can delete this class' });
      }

      if (videoClass.status === 'live') {
        return res.status(400).json({ message: 'Cannot delete a live class. Please end it first.' });
      }

      if (videoClass.status === 'scheduled') {
        videoClass.status = 'cancelled';
        await videoClass.save();
        
        // Create cancellation announcement
        await VideoClassController.createVideoClassAnnouncement(videoClass, 'cancelled');
        
        res.json({
          message: 'Class cancelled successfully'
        });
      } else {
        // For ended classes, we can actually delete them
        await VideoClass.findByIdAndDelete(classId);
        
        res.json({
          message: 'Class deleted successfully'
        });
      }
    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({ message: 'Server error while deleting class' });
    }
  }
}

module.exports = new VideoClassController();