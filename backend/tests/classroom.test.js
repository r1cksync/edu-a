const request = require('supertest');
const app = require('../src/server');
const { connect, closeDatabase, clearDatabase } = require('./helpers/db');

describe('Classroom Endpoints', () => {
  let teacherToken, studentToken;
  let teacherUser, studentUser;

  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Register teacher
    const teacherData = {
      name: 'Teacher User',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'teacher',
      department: 'Computer Science'
    };

    const teacherResponse = await request(app)
      .post('/api/auth/register')
      .send(teacherData);

    teacherToken = teacherResponse.body.token;
    teacherUser = teacherResponse.body.user;

    // Register student
    const studentData = {
      name: 'Student User',
      email: 'student@example.com',
      password: 'password123',
      role: 'student'
    };

    const studentResponse = await request(app)
      .post('/api/auth/register')
      .send(studentData);

    studentToken = studentResponse.body.token;
    studentUser = studentResponse.body.user;
  });

  describe('POST /api/classrooms', () => {
    it('should create a classroom as teacher', async () => {
      const classroomData = {
        name: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        subject: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(classroomData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Classroom created successfully');
      expect(response.body.classroom.name).toBe(classroomData.name);
      expect(response.body.classroom.classCode).toBeDefined();
      expect(response.body.classroom.classCode).toHaveLength(6);
    });

    it('should not create classroom as student', async () => {
      const classroomData = {
        name: 'Test Classroom',
        subject: 'Test Subject'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(classroomData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Required role: teacher');
    });

    it('should not create classroom without authentication', async () => {
      const classroomData = {
        name: 'Test Classroom',
        subject: 'Test Subject'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .send(classroomData);

      expect(response.status).toBe(401);
    });

    it('should not create classroom with invalid data', async () => {
      const invalidData = {
        description: 'Missing required fields'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation Error');
    });
  });

  describe('GET /api/classrooms', () => {
    let classroom;

    beforeEach(async () => {
      // Create a classroom as teacher
      const classroomData = {
        name: 'Test Classroom',
        subject: 'Test Subject'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(classroomData);

      classroom = response.body.classroom;
    });

    it('should get teacher classrooms', async () => {
      const response = await request(app)
        .get('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.classrooms).toHaveLength(1);
      expect(response.body.classrooms[0].name).toBe('Test Classroom');
    });

    it('should get empty array for student with no classrooms', async () => {
      const response = await request(app)
        .get('/api/classrooms')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.classrooms).toHaveLength(0);
    });

    it('should not get classrooms without authentication', async () => {
      const response = await request(app)
        .get('/api/classrooms');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/classrooms/join', () => {
    let classroom;

    beforeEach(async () => {
      const classroomData = {
        name: 'Test Classroom',
        subject: 'Test Subject'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(classroomData);

      classroom = response.body.classroom;
    });

    it('should allow student to join classroom with valid code', async () => {
      const joinData = {
        classCode: classroom.classCode
      };

      const response = await request(app)
        .post('/api/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(joinData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully joined classroom');
      expect(response.body.classroom.students).toHaveLength(1);
      expect(response.body.classroom.students[0].student._id).toBe(studentUser.id);
    });

    it('should not allow joining with invalid class code', async () => {
      const joinData = {
        classCode: 'XYZ123'
      };

      const response = await request(app)
        .post('/api/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(joinData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Invalid class code');
    });

    it('should not allow teacher to join classroom', async () => {
      const joinData = {
        classCode: classroom.classCode
      };

      const response = await request(app)
        .post('/api/classrooms/join')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(joinData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Required role: student');
    });

    it('should not allow duplicate enrollment', async () => {
      const joinData = {
        classCode: classroom.classCode
      };

      // First join
      await request(app)
        .post('/api/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(joinData);

      // Second join attempt
      const response = await request(app)
        .post('/api/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(joinData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('You are already enrolled in this classroom');
    });
  });

  describe('GET /api/classrooms/:classroomId', () => {
    let classroom;

    beforeEach(async () => {
      const classroomData = {
        name: 'Test Classroom',
        subject: 'Test Subject'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(classroomData);

      classroom = response.body.classroom;

      // Student joins classroom
      await request(app)
        .post('/api/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ classCode: classroom.classCode });
    });

    it('should get classroom details as teacher', async () => {
      const response = await request(app)
        .get(`/api/classrooms/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.classroom.name).toBe('Test Classroom');
      expect(response.body.classroom.students).toHaveLength(1);
    });

    it('should get classroom details as enrolled student', async () => {
      const response = await request(app)
        .get(`/api/classrooms/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.classroom.name).toBe('Test Classroom');
      expect(response.body.enrollmentInfo).toBeDefined();
      expect(response.body.enrollmentInfo.level).toBe('beginner');
    });

    it('should not get classroom details without access', async () => {
      // Register another student
      const otherStudentData = {
        name: 'Other Student',
        email: 'other@example.com',
        password: 'password123',
        role: 'student'
      };

      const otherResponse = await request(app)
        .post('/api/auth/register')
        .send(otherStudentData);

      const response = await request(app)
        .get(`/api/classrooms/${classroom._id}`)
        .set('Authorization', `Bearer ${otherResponse.body.token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied to this classroom');
    });

    it('should not get non-existent classroom', async () => {
      const response = await request(app)
        .get('/api/classrooms/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Classroom not found');
    });
  });

  describe('PUT /api/classrooms/:classroomId', () => {
    let classroom;

    beforeEach(async () => {
      const classroomData = {
        name: 'Test Classroom',
        subject: 'Test Subject'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(classroomData);

      classroom = response.body.classroom;
    });

    it('should update classroom as teacher', async () => {
      const updateData = {
        name: 'Updated Classroom',
        description: 'Updated description',
        allowStudentPosts: false
      };

      const response = await request(app)
        .put(`/api/classrooms/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Classroom updated successfully');
      expect(response.body.classroom.name).toBe('Updated Classroom');
      expect(response.body.classroom.allowStudentPosts).toBe(false);
    });

    it('should not update classroom as student', async () => {
      const updateData = {
        name: 'Hacked Classroom'
      };

      const response = await request(app)
        .put(`/api/classrooms/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/classrooms/:classroomId/leave', () => {
    let classroom;

    beforeEach(async () => {
      const classroomData = {
        name: 'Test Classroom',
        subject: 'Test Subject'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(classroomData);

      classroom = response.body.classroom;

      // Student joins classroom
      await request(app)
        .post('/api/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ classCode: classroom.classCode });
    });

    it('should allow student to leave classroom', async () => {
      const response = await request(app)
        .delete(`/api/classrooms/${classroom._id}/leave`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Left classroom successfully');

      // Verify student is no longer enrolled
      const classroomResponse = await request(app)
        .get(`/api/classrooms/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(classroomResponse.body.classroom.students).toHaveLength(0);
    });

    it('should not allow leaving classroom not enrolled in', async () => {
      // Create another classroom
      const otherClassroomResponse = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          name: 'Other Classroom',
          subject: 'Other Subject'
        });

      const response = await request(app)
        .delete(`/api/classrooms/${otherClassroomResponse.body.classroom._id}/leave`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('You are not enrolled in this classroom');
    });

    it('should not allow teacher to leave classroom', async () => {
      const response = await request(app)
        .delete(`/api/classrooms/${classroom._id}/leave`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Required role: student');
    });
  });

  describe('GET /api/classrooms/:classroomId/students', () => {
    let classroom;

    beforeEach(async () => {
      const classroomData = {
        name: 'Test Classroom',
        subject: 'Test Subject'
      };

      const response = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(classroomData);

      classroom = response.body.classroom;

      // Student joins classroom
      await request(app)
        .post('/api/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ classCode: classroom.classCode });
    });

    it('should get classroom students as teacher', async () => {
      const response = await request(app)
        .get(`/api/classrooms/${classroom._id}/students`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.students).toHaveLength(1);
      expect(response.body.students[0].student.name).toBe('Student User');
      expect(response.body.total).toBe(1);
    });

    it('should not get students as student', async () => {
      const response = await request(app)
        .get(`/api/classrooms/${classroom._id}/students`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });
});

module.exports = { app };