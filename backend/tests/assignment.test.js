const request = require('supertest');
const app = require('../src/server');
const { connect, closeDatabase, clearDatabase } = require('./helpers/db');

describe('Assignment and Submission Endpoints', () => {
  let teacherToken, studentToken;
  let teacherUser, studentUser;
  let classroom;

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
  });

  describe('POST /api/assignments/classroom/:classroomId', () => {
    it('should create assignment as teacher', async () => {
      const assignmentData = {
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator program',
        type: 'assignment',
        totalPoints: 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        instructions: 'Follow the requirements carefully'
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(assignmentData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Assignment created successfully');
      expect(response.body.assignment.title).toBe(assignmentData.title);
      expect(response.body.assignment.totalPoints).toBe(100);
      expect(response.body.assignment.isPublished).toBe(false);
    });

    it('should create quiz with questions as teacher', async () => {
      const quizData = {
        title: 'Programming Quiz 1',
        description: 'Test your programming knowledge',
        type: 'quiz',
        totalPoints: 50,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        timeLimit: 60, // 60 minutes
        questions: [
          {
            question: 'What is a variable?',
            type: 'multiple-choice',
            options: ['A container for data', 'A function', 'A loop', 'None of the above'],
            correctAnswer: 'A container for data',
            points: 10
          },
          {
            question: 'What does HTML stand for?',
            type: 'short-answer',
            correctAnswer: 'HyperText Markup Language',
            points: 15
          }
        ]
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(quizData);

      expect(response.status).toBe(201);
      expect(response.body.assignment.type).toBe('quiz');
      expect(response.body.assignment.questions).toHaveLength(2);
      expect(response.body.assignment.timeLimit).toBe(60);
    });

    it('should not create assignment as student', async () => {
      const assignmentData = {
        title: 'Unauthorized Assignment',
        description: 'This should not be created',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(assignmentData);

      expect(response.status).toBe(403);
    });

    it('should not create assignment with invalid data', async () => {
      const invalidData = {
        title: 'Test Assignment'
        // Missing required fields
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation Error');
    });

    it('should not create assignment for non-owned classroom', async () => {
      // Register another teacher
      const otherTeacherData = {
        name: 'Other Teacher',
        email: 'other-teacher@example.com',
        password: 'password123',
        role: 'teacher'
      };

      const otherTeacherResponse = await request(app)
        .post('/api/auth/register')
        .send(otherTeacherData);

      const assignmentData = {
        title: 'Unauthorized Assignment',
        description: 'This should not be created',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${otherTeacherResponse.body.token}`)
        .send(assignmentData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Classroom not found or access denied');
    });
  });

  describe('GET /api/assignments/classroom/:classroomId', () => {
    let assignment;

    beforeEach(async () => {
      const assignmentData = {
        title: 'Test Assignment',
        description: 'Test description',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(assignmentData);

      assignment = response.body.assignment;
    });

    it('should get assignments as teacher', async () => {
      const response = await request(app)
        .get(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assignments).toHaveLength(1);
      expect(response.body.assignments[0].title).toBe('Test Assignment');
      expect(response.body.assignments[0].submissionStats).toBeDefined();
    });

    it('should not get unpublished assignments as student', async () => {
      const response = await request(app)
        .get(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assignments).toHaveLength(0); // Unpublished assignments not visible
    });

    it('should get published assignments as student', async () => {
      // Publish the assignment
      await request(app)
        .put(`/api/assignments/${assignment._id}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      const response = await request(app)
        .get(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assignments).toHaveLength(1);
      expect(response.body.assignments[0].submissionStatus).toBe('not-started');
    });
  });

  describe('PUT /api/assignments/:assignmentId/publish', () => {
    let assignment;

    beforeEach(async () => {
      const assignmentData = {
        title: 'Test Assignment',
        description: 'Test description',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(assignmentData);

      assignment = response.body.assignment;
    });

    it('should publish assignment as teacher', async () => {
      const response = await request(app)
        .put(`/api/assignments/${assignment._id}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Assignment published successfully');
      expect(response.body.assignment.isPublished).toBe(true);
      expect(response.body.assignment.publishedAt).toBeDefined();
    });

    it('should not publish assignment as student', async () => {
      const response = await request(app)
        .put(`/api/assignments/${assignment._id}/publish`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/assignments/:assignmentId/submit', () => {
    let assignment, quiz;

    beforeEach(async () => {
      // Create and publish regular assignment
      const assignmentData = {
        title: 'Programming Assignment',
        description: 'Create a program',
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

      // Create and publish quiz
      const quizData = {
        title: 'Programming Quiz',
        description: 'Test your knowledge',
        type: 'quiz',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [
          {
            question: 'What is 2 + 2?',
            type: 'multiple-choice',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 10
          }
        ]
      };

      const quizResponse = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(quizData);

      quiz = quizResponse.body.assignment;

      await request(app)
        .put(`/api/assignments/${quiz._id}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);
    });

    it('should submit assignment as student', async () => {
      const submissionData = {
        content: 'Here is my solution to the programming assignment.'
      };

      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submissionData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Assignment submitted successfully');
      expect(response.body.submission.content).toBe(submissionData.content);
      expect(response.body.submission.status).toBe('submitted');
      expect(response.body.submission.submittedAt).toBeDefined();
    });

    it('should submit quiz with answers as student', async () => {
      const submissionData = {
        answers: [
          {
            questionId: quiz.questions[0]._id,
            answer: '4'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/assignments/${quiz._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submissionData);

      expect(response.status).toBe(200);
      expect(response.body.submission.status).toBe('graded'); // Auto-graded
      expect(response.body.submission.grade.points).toBe(10);
      expect(response.body.submission.grade.percentage).toBe(100);
    });

    it('should not submit unpublished assignment', async () => {
      // Create unpublished assignment
      const unpublishedAssignmentData = {
        title: 'Unpublished Assignment',
        description: 'This is not published',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const unpublishedResponse = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(unpublishedAssignmentData);

      const submissionData = {
        content: 'Trying to submit to unpublished assignment'
      };

      const response = await request(app)
        .post(`/api/assignments/${unpublishedResponse.body.assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submissionData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Assignment is not yet published');
    });

    it('should not submit assignment as teacher', async () => {
      const submissionData = {
        content: 'Teacher trying to submit'
      };

      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(submissionData);

      expect(response.status).toBe(403);
    });

    it('should not submit assignment twice', async () => {
      const submissionData = {
        content: 'First submission'
      };

      // First submission
      await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submissionData);

      // Second submission attempt
      const response = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Second submission' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Assignment already submitted');
    });

    it('should handle late submission based on settings', async () => {
      // Create assignment with past due date and no late submissions allowed
      const pastDueAssignmentData = {
        title: 'Past Due Assignment',
        description: 'This assignment is past due',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        allowLateSubmission: false
      };

      const pastDueResponse = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(pastDueAssignmentData);

      await request(app)
        .put(`/api/assignments/${pastDueResponse.body.assignment._id}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      const submissionData = {
        content: 'Late submission attempt'
      };

      const response = await request(app)
        .post(`/api/assignments/${pastDueResponse.body.assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submissionData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Assignment deadline has passed and late submissions are not allowed');
    });
  });

  describe('GET /api/assignments/:assignmentId/submissions', () => {
    let assignment, submission;

    beforeEach(async () => {
      // Create and publish assignment
      const assignmentData = {
        title: 'Test Assignment',
        description: 'Test description',
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

      // Submit assignment
      const submissionResponse = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Test submission' });

      submission = submissionResponse.body.submission;
    });

    it('should get assignment submissions as teacher', async () => {
      const response = await request(app)
        .get(`/api/assignments/${assignment._id}/submissions`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(1);
      expect(response.body.submissions[0].content).toBe('Test submission');
      expect(response.body.submissions[0].student.name).toBe('Student User');
      expect(response.body.total).toBe(1);
    });

    it('should not get submissions as student', async () => {
      const response = await request(app)
        .get(`/api/assignments/${assignment._id}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/assignments/submissions/:submissionId/grade', () => {
    let assignment, submission;

    beforeEach(async () => {
      // Create, publish and submit assignment
      const assignmentData = {
        title: 'Gradable Assignment',
        description: 'This will be graded',
        totalPoints: 100,
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

      const submissionResponse = await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Student work to be graded' });

      submission = submissionResponse.body.submission;
    });

    it('should grade submission as teacher', async () => {
      const gradeData = {
        points: 85,
        feedback: 'Good work! You can improve by adding more comments to your code.'
      };

      const response = await request(app)
        .put(`/api/assignments/submissions/${submission._id}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(gradeData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Submission graded successfully');
      expect(response.body.submission.grade.points).toBe(85);
      expect(response.body.submission.grade.percentage).toBe(85);
      expect(response.body.submission.grade.letterGrade).toBe('B');
      expect(response.body.submission.grade.feedback).toBe(gradeData.feedback);
      expect(response.body.submission.status).toBe('graded');
      expect(response.body.submission.gradedAt).toBeDefined();
    });

    it('should not grade submission as student', async () => {
      const gradeData = {
        points: 100,
        feedback: 'Student trying to grade themselves'
      };

      const response = await request(app)
        .put(`/api/assignments/submissions/${submission._id}/grade`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(gradeData);

      expect(response.status).toBe(403);
    });

    it('should calculate correct letter grades', async () => {
      const testCases = [
        { points: 95, expectedGrade: 'A' },
        { points: 88, expectedGrade: 'B' },
        { points: 75, expectedGrade: 'C' },
        { points: 65, expectedGrade: 'D' },
        { points: 45, expectedGrade: 'F' }
      ];

      for (const testCase of testCases) {
        const gradeData = {
          points: testCase.points,
          feedback: `Test grade: ${testCase.points}`
        };

        const response = await request(app)
          .put(`/api/assignments/submissions/${submission._id}/grade`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(gradeData);

        expect(response.body.submission.grade.letterGrade).toBe(testCase.expectedGrade);
        expect(response.body.submission.grade.percentage).toBe(testCase.points);
      }
    });
  });

  describe('GET /api/assignments/:assignmentId', () => {
    let assignment;

    beforeEach(async () => {
      const assignmentData = {
        title: 'Detailed Assignment',
        description: 'Assignment with full details',
        instructions: 'Follow these steps carefully',
        totalPoints: 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(assignmentData);

      assignment = response.body.assignment;

      await request(app)
        .put(`/api/assignments/${assignment._id}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);
    });

    it('should get assignment details as teacher', async () => {
      const response = await request(app)
        .get(`/api/assignments/${assignment._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assignment.title).toBe('Detailed Assignment');
      expect(response.body.assignment.instructions).toBe('Follow these steps carefully');
      expect(response.body.submission).toBeNull(); // Teacher has no submission
    });

    it('should get assignment details with submission as student', async () => {
      // Submit assignment first
      await request(app)
        .post(`/api/assignments/${assignment._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'My submission' });

      const response = await request(app)
        .get(`/api/assignments/${assignment._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assignment.title).toBe('Detailed Assignment');
      expect(response.body.submission).toBeDefined();
      expect(response.body.submission.content).toBe('My submission');
    });

    it('should not get unpublished assignment as student', async () => {
      // Create unpublished assignment
      const unpublishedData = {
        title: 'Unpublished Assignment',
        description: 'This is not published yet',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const unpublishedResponse = await request(app)
        .post(`/api/assignments/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(unpublishedData);

      const response = await request(app)
        .get(`/api/assignments/${unpublishedResponse.body.assignment._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Assignment not found');
    });
  });
});

module.exports = { app };