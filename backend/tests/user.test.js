const request = require('supertest');
const app = require('../src/server');
const { connect, closeDatabase, clearDatabase } = require('./helpers/db');

describe('User Dashboard and Profile Endpoints', () => {
  let teacherToken, studentToken;
  let teacherUser, studentUser;
  let classroom, assignment;

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

    // Create classroom
    const classroomData = {
      name: 'Test Classroom',
      subject: 'Computer Science'
    };

    const classroomResponse = await request(app)
      .post('/api/classrooms')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(classroomData);

    classroom = classroomResponse.body.classroom;

    // Student joins classroom
    await request(app)
      .post('/api/classrooms/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ classCode: classroom.classCode });

    // Create and publish assignment
    const assignmentData = {
      title: 'Test Assignment',
      description: 'Test assignment for dashboard',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    const assignmentResponse = await request(app)
      .post(`/api/assignments/classroom/${classroom._id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(assignmentData);

    assignment = assignmentResponse.body.assignment;

    await request(app)
      .put(`/api/assignments/${assignment._id}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`);
  });

  describe('GET /api/users/dashboard', () => {
    it('should get teacher dashboard with stats', async () => {
      const response = await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.classrooms).toBe(1);
      expect(response.body.stats.assignments).toBe(1);
      expect(response.body.stats.submissions).toBe(0);
      expect(response.body.stats.pendingGrading).toBe(0);
      expect(response.body.recentClassrooms).toHaveLength(1);
      expect(response.body.recentClassrooms[0].name).toBe('Test Classroom');
    });

    it('should get student dashboard with stats', async () => {
      const response = await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.classrooms).toBe(1);
      expect(response.body.stats.assignments).toBe(1);
      expect(response.body.stats.submissions).toBe(0);
      expect(response.body.stats.graded).toBe(0);
      expect(response.body.enrolledClassrooms).toHaveLength(1);
      expect(response.body.upcomingAssignments).toHaveLength(1);
      expect(response.body.upcomingAssignments[0].title).toBe('Test Assignment');
    });

    it('should update teacher dashboard after submission', async () => {
      // Submit assignment
      await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Test submission' });

      const response = await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.body.stats.submissions).toBe(1);
      expect(response.body.stats.pendingGrading).toBe(1);
    });

    it('should update student dashboard after submission', async () => {
      // Submit assignment
      await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Test submission' });

      const response = await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.stats.submissions).toBe(1);
      expect(response.body.stats.graded).toBe(0);
    });

    it('should not get dashboard without authentication', async () => {
      const response = await request(app)
        .get('/api/users/dashboard');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/search', () => {
    beforeEach(async () => {
      // Register additional users for search testing
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john.doe@example.com',
          password: 'password123',
          role: 'student'
        });

      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          password: 'password123',
          role: 'student'
        });
    });

    it('should search users by name as teacher', async () => {
      const response = await request(app)
        .get('/api/users/search?query=John')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].name).toBe('John Doe');
    });

    it('should search users by email as teacher', async () => {
      const response = await request(app)
        .get('/api/users/search?query=jane.smith')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].email).toBe('jane.smith@example.com');
    });

    it('should limit search results', async () => {
      const response = await request(app)
        .get('/api/users/search?query=student')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeLessThanOrEqual(10);
    });

    it('should not search users as student', async () => {
      const response = await request(app)
        .get('/api/users/search?query=John')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    it('should require minimum query length', async () => {
      const response = await request(app)
        .get('/api/users/search?query=J')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Search query must be at least 2 characters');
    });
  });

  describe('GET /api/users/submissions', () => {
    let submission;

    beforeEach(async () => {
      // Submit assignment
      const submissionResponse = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Test submission for history' });

      submission = submissionResponse.body.submission;
    });

    it('should get submission history as student', async () => {
      const response = await request(app)
        .get('/api/users/submissions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(1);
      expect(response.body.submissions[0].content).toBe('Test submission for history');
      expect(response.body.submissions[0].assignment.title).toBe('Test Assignment');
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter submissions by status', async () => {
      const response = await request(app)
        .get('/api/users/submissions?status=submitted')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(1);
      expect(response.body.submissions[0].status).toBe('submitted');
    });

    it('should filter submissions by classroom', async () => {
      const response = await request(app)
        .get(`/api/users/submissions?classroomId=${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(1);
    });

    it('should paginate submissions', async () => {
      // Create more assignments and submissions
      for (let i = 0; i < 5; i++) {
        const assignmentData = {
          title: `Assignment ${i + 2}`,
          description: `Description ${i + 2}`,
          dueDate: new Date(Date.now() + (i + 8) * 24 * 60 * 60 * 1000)
        };

        const assignmentResponse = await request(app)
          .post(`/api/assignments/classroom/${classroom._id}`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(assignmentData);

        await request(app)
          .put(`/api/assignments/${assignmentResponse.body.assignment._id}/publish`)
          .set('Authorization', `Bearer ${teacherToken}`);

        await request(app)
          .post(`/api/assignments/${assignmentResponse.body.assignment._id}/submit`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ content: `Submission ${i + 2}` });
      }

      const response = await request(app)
        .get('/api/users/submissions?page=1&limit=3')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions.length).toBeLessThanOrEqual(3);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(3);
    });

    it('should not get submissions as teacher', async () => {
      const response = await request(app)
        .get('/api/users/submissions')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(0); // Teacher has no submissions
    });
  });

  describe('GET /api/users/grades', () => {
    let submission;

    beforeEach(async () => {
      // Submit and grade assignment
      const submissionResponse = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Test submission for grading' });

      submission = submissionResponse.body.submission;

      // Grade the submission
      await request(app)
        .put(`/api/assignments/submissions/${submission._id}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          points: 85,
          feedback: 'Good work!'
        });
    });

    it('should get grades summary as student', async () => {
      const response = await request(app)
        .get('/api/users/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(1);
      expect(response.body.submissions[0].grade.points).toBe(85);
      expect(response.body.submissions[0].grade.percentage).toBe(85);
      expect(response.body.summary.totalSubmissions).toBe(1);
      expect(response.body.summary.averageGrade).toBe(85);
      expect(response.body.summary.gradeDistribution.B).toBe(1);
    });

    it('should filter grades by classroom', async () => {
      const response = await request(app)
        .get(`/api/users/grades?classroomId=${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(1);
    });

    it('should calculate grade distribution correctly', async () => {
      // Create more assignments with different grades
      const gradeTestCases = [
        { points: 95, letter: 'A' },
        { points: 75, letter: 'C' },
        { points: 55, letter: 'F' }
      ];

      for (const testCase of gradeTestCases) {
        const assignmentData = {
          title: `Grade Test ${testCase.letter}`,
          description: 'For grade distribution test',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        };

        const assignmentResponse = await request(app)
          .post(`/api/assignments/classroom/${classroom._id}`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(assignmentData);

        await request(app)
          .put(`/api/assignments/${assignmentResponse.body.assignment._id}/publish`)
          .set('Authorization', `Bearer ${teacherToken}`);

        const submissionResponse = await request(app)
          .post(`/api/assignments/${assignmentResponse.body.assignment._id}/submit`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ content: 'Test submission' });

        await request(app)
          .put(`/api/assignments/submissions/${submissionResponse.body.submission._id}/grade`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({ points: testCase.points });
      }

      const response = await request(app)
        .get('/api/users/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.summary.gradeDistribution.A).toBe(1);
      expect(response.body.summary.gradeDistribution.B).toBe(1);
      expect(response.body.summary.gradeDistribution.C).toBe(1);
      expect(response.body.summary.gradeDistribution.F).toBe(1);
    });

    it('should not get grades as teacher', async () => {
      const response = await request(app)
        .get('/api/users/grades')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(0); // Teacher has no graded submissions
    });
  });

  describe('POST /api/users/profile-picture', () => {
    it('should upload profile picture', async () => {
      const profileData = {
        profilePictureUrl: 'https://example.com/profile.jpg'
      };

      const response = await request(app)
        .post('/api/users/profile-picture')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(profileData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile picture updated successfully');
      expect(response.body.user.profilePicture).toBe('https://example.com/profile.jpg');
    });

    it('should not upload profile picture without authentication', async () => {
      const profileData = {
        profilePictureUrl: 'https://example.com/profile.jpg'
      };

      const response = await request(app)
        .post('/api/users/profile-picture')
        .send(profileData);

      expect(response.status).toBe(401);
    });

    it('should update existing profile picture', async () => {
      // First upload
      await request(app)
        .post('/api/users/profile-picture')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ profilePictureUrl: 'https://example.com/old.jpg' });

      // Update with new picture
      const response = await request(app)
        .post('/api/users/profile-picture')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ profilePictureUrl: 'https://example.com/new.jpg' });

      expect(response.status).toBe(200);
      expect(response.body.user.profilePicture).toBe('https://example.com/new.jpg');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid classroom ID in submissions filter', async () => {
      const response = await request(app)
        .get('/api/users/submissions?classroomId=invalid-id')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle invalid status filter in submissions', async () => {
      const response = await request(app)
        .get('/api/users/submissions?status=invalid-status')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(0);
    });

    it('should handle non-existent user in search', async () => {
      const response = await request(app)
        .get('/api/users/search?query=nonexistent')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(0);
    });

    it('should handle empty dashboard for new user', async () => {
      // Register new teacher with no classrooms
      const newTeacherData = {
        name: 'New Teacher',
        email: 'new-teacher@example.com',
        password: 'password123',
        role: 'teacher'
      };

      const newTeacherResponse = await request(app)
        .post('/api/auth/register')
        .send(newTeacherData);

      const response = await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', `Bearer ${newTeacherResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.classrooms).toBe(0);
      expect(response.body.stats.assignments).toBe(0);
      expect(response.body.recentClassrooms).toHaveLength(0);
    });
  });
});

module.exports = { app };