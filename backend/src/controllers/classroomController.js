const Classroom = require('../models/Classroom');
const User = require('../models/User');

class ClassroomController {
  // Create a new classroom (Teachers only)
  async createClassroom(req, res) {
    try {
      const { name, description, subject, allowStudentPosts, allowStudentComments } = req.body;
      const teacherId = req.user._id;

      // Generate unique class code
      let classCode;
      let isUnique = false;
      
      while (!isUnique) {
        classCode = Classroom.generateClassCode();
        const existingClassroom = await Classroom.findOne({ classCode });
        if (!existingClassroom) {
          isUnique = true;
        }
      }

      const classroom = new Classroom({
        name,
        description,
        subject,
        classCode,
        teacher: teacherId,
        allowStudentPosts: allowStudentPosts ?? true,
        allowStudentComments: allowStudentComments ?? true
      });

      await classroom.save();
      await classroom.populate('teacher', 'name email teacherId');

      res.status(201).json({
        message: 'Classroom created successfully',
        classroom
      });
    } catch (error) {
      console.error('Create classroom error:', error);
      res.status(500).json({ message: 'Server error while creating classroom' });
    }
  }

  // Get all classrooms for current user
  async getClassrooms(req, res) {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      let classrooms;

      if (userRole === 'teacher') {
        // Get classrooms where user is teacher
        classrooms = await Classroom.find({ teacher: userId, isActive: true })
          .populate('teacher', 'name email teacherId')
          .populate('students.student', 'name email studentId')
          .sort({ createdAt: -1 });
      } else {
        // Get classrooms where user is enrolled as student
        classrooms = await Classroom.find({ 
          'students.student': userId, 
          isActive: true 
        })
          .populate('teacher', 'name email teacherId')
          .populate('students.student', 'name email studentId')
          .sort({ createdAt: -1 });
      }

      res.json({
        classrooms,
        total: classrooms.length
      });
    } catch (error) {
      console.error('Get classrooms error:', error);
      res.status(500).json({ message: 'Server error while fetching classrooms' });
    }
  }

  // Get single classroom details
  async getClassroom(req, res) {
    try {
      const { classroomId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const classroom = await Classroom.findById(classroomId)
        .populate('teacher', 'name email teacherId department')
        .populate('students.student', 'name email studentId');

      if (!classroom || !classroom.isActive) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      // Check if user has access to this classroom
      const hasAccess = userRole === 'teacher' 
        ? classroom.teacher._id.toString() === userId.toString()
        : classroom.students.some(s => s.student._id.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this classroom' });
      }

      // Get current user's enrollment info if student
      let enrollmentInfo = null;
      if (userRole === 'student') {
        enrollmentInfo = classroom.students.find(s => s.student._id.toString() === userId.toString());
      }

      res.json({
        classroom,
        enrollmentInfo
      });
    } catch (error) {
      console.error('Get classroom error:', error);
      res.status(500).json({ message: 'Server error while fetching classroom' });
    }
  }

  // Join classroom with class code (Students only)
  async joinClassroom(req, res) {
    try {
      const { classCode } = req.body;
      const studentId = req.user._id;

      const classroom = await Classroom.findOne({ classCode, isActive: true })
        .populate('teacher', 'name email teacherId');

      if (!classroom) {
        return res.status(404).json({ message: 'Invalid class code' });
      }

      // Check if student is already enrolled
      const isEnrolled = classroom.students.some(s => s.student.toString() === studentId.toString());
      if (isEnrolled) {
        return res.status(400).json({ message: 'You are already enrolled in this classroom' });
      }

      // Add student to classroom
      await classroom.addStudent(studentId);

      await classroom.populate('students.student', 'name email studentId');

      res.json({
        message: 'Successfully joined classroom',
        classroom
      });
    } catch (error) {
      console.error('Join classroom error:', error);
      res.status(500).json({ message: 'Server error while joining classroom' });
    }
  }

  // Update classroom (Teachers only)
  async updateClassroom(req, res) {
    try {
      const { classroomId } = req.params;
      const { name, description, subject, allowStudentPosts, allowStudentComments } = req.body;
      const teacherId = req.user._id;

      const classroom = await Classroom.findOne({ _id: classroomId, teacher: teacherId });

      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found or access denied' });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (subject) updateData.subject = subject;
      if (allowStudentPosts !== undefined) updateData.allowStudentPosts = allowStudentPosts;
      if (allowStudentComments !== undefined) updateData.allowStudentComments = allowStudentComments;

      const updatedClassroom = await Classroom.findByIdAndUpdate(
        classroomId,
        updateData,
        { new: true, runValidators: true }
      ).populate('teacher', 'name email teacherId')
        .populate('students.student', 'name email studentId');

      res.json({
        message: 'Classroom updated successfully',
        classroom: updatedClassroom
      });
    } catch (error) {
      console.error('Update classroom error:', error);
      res.status(500).json({ message: 'Server error while updating classroom' });
    }
  }

  // Remove student from classroom (Teachers only)
  async removeStudent(req, res) {
    try {
      const { classroomId, studentId } = req.params;
      const teacherId = req.user._id;

      const classroom = await Classroom.findOne({ _id: classroomId, teacher: teacherId });

      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found or access denied' });
      }

      await classroom.removeStudent(studentId);

      res.json({
        message: 'Student removed from classroom successfully'
      });
    } catch (error) {
      console.error('Remove student error:', error);
      res.status(500).json({ message: 'Server error while removing student' });
    }
  }

  // Leave classroom (Students only)
  async leaveClassroom(req, res) {
    try {
      const { classroomId } = req.params;
      const studentId = req.user._id;

      const classroom = await Classroom.findById(classroomId);

      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      // Check if student is enrolled
      const isEnrolled = classroom.students.some(s => s.student.toString() === studentId.toString());
      if (!isEnrolled) {
        return res.status(400).json({ message: 'You are not enrolled in this classroom' });
      }

      await classroom.removeStudent(studentId);

      res.json({
        message: 'Left classroom successfully'
      });
    } catch (error) {
      console.error('Leave classroom error:', error);
      res.status(500).json({ message: 'Server error while leaving classroom' });
    }
  }

  // Get classroom students (Teachers only)
  async getClassroomStudents(req, res) {
    try {
      const { classroomId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      let classroom;

      if (userRole === 'teacher') {
        // Teachers can see students in their classrooms
        classroom = await Classroom.findOne({ _id: classroomId, teacher: userId })
          .populate('students.student', 'name email studentId profilePicture');
      } else {
        // Students can see students in classrooms they're enrolled in
        classroom = await Classroom.findOne({ 
          _id: classroomId,
          'students.student': userId
        }).populate('students.student', 'name email studentId profilePicture');
      }

      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found or access denied' });
      }

      res.json({
        students: classroom.students,
        total: classroom.students.length
      });
    } catch (error) {
      console.error('Get classroom students error:', error);
      res.status(500).json({ message: 'Server error while fetching students' });
    }
  }

  // Archive classroom (Teachers only)
  async archiveClassroom(req, res) {
    try {
      const { classroomId } = req.params;
      const teacherId = req.user._id;

      const classroom = await Classroom.findOneAndUpdate(
        { _id: classroomId, teacher: teacherId },
        { isActive: false },
        { new: true }
      );

      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found or access denied' });
      }

      res.json({
        message: 'Classroom archived successfully',
        classroom
      });
    } catch (error) {
      console.error('Archive classroom error:', error);
      res.status(500).json({ message: 'Server error while archiving classroom' });
    }
  }

  // Update student level (Teachers only) - for advanced features
  async updateStudentLevel(req, res) {
    try {
      const { classroomId, studentId } = req.params;
      const { level } = req.body;
      const teacherId = req.user._id;

      if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
        return res.status(400).json({ message: 'Invalid level' });
      }

      const classroom = await Classroom.findOne({ _id: classroomId, teacher: teacherId });

      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found or access denied' });
      }

      await classroom.updateStudentLevel(studentId, level);

      res.json({
        message: 'Student level updated successfully'
      });
    } catch (error) {
      console.error('Update student level error:', error);
      res.status(500).json({ message: 'Server error while updating student level' });
    }
  }
}

module.exports = new ClassroomController();