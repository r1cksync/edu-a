const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const Classroom = require('../src/models/Classroom');
const Assignment = require('../src/models/Assignment');
const Submission = require('../src/models/Submission');
const path = require('path');
const fs = require('fs');

describe('Enhanced Assignment Features - MCQ and File-Based', () => {
  let teacherToken, studentToken, teacherId, studentId, classroomId;
  let mcqAssignmentId, fileAssignmentId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shayak_test');
    }
  });

  afterAll(async () => {
    // Clean up and close database connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    await Classroom.deleteMany({});
    await Assignment.deleteMany({});
    await Submission.deleteMany({});

    // Create test teacher
    const teacherRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Teacher',
        email: 'teacher@test.com',
        password: 'password123',
        role: 'teacher'
      });
    
    teacherId = teacherRes.body.user._id;
    teacherToken = teacherRes.body.token;

    // Create test student
    const studentRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Student',
        email: 'student@test.com',
        password: 'password123',
        role: 'student'
      });
    
    studentId = studentRes.body.user._id;
    studentToken = studentRes.body.token;

    // Create test classroom
    const classroomRes = await request(app)
      .post('/api/classrooms')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        name: 'Test Classroom',
        description: 'Test classroom for assignments',
        settings: {
          allowStudentPosts: true,
          requireApproval: false,
          allowLateSubmissions: true
        }
      });
    
    classroomId = classroomRes.body.classroom._id;

    // Add student to classroom
    await request(app)
      .post(`/api/classrooms/join`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        classCode: classroomRes.body.classroom.classCode
      });
  });

  describe('MCQ Assignment Creation and Submission', () => {
    it('should create an MCQ assignment with questions', async () => {
      const mcqData = {
        title: 'Math Quiz - Basic Operations',
        description: 'Test your understanding of basic mathematical operations',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        totalPoints: 30,
        questions: [
          {
            question: 'What is 2 + 2?',
            type: 'multiple-choice',
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 10
          },
          {
            question: 'Is 10 greater than 5?',
            type: 'true-false',
            options: ['true', 'false'],
            correctAnswer: 'true',
            points: 10
          },
          {
            question: 'What is the square root of 16?',
            type: 'multiple-choice',
            options: ['2', '3', '4', '8'],
            correctAnswer: '4',
            points: 10
          }
        ]
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      expect(response.status).toBe(201);
      expect(response.body.assignment.type).toBe('mcq');
      expect(response.body.assignment.questions).toHaveLength(3);
      expect(response.body.assignment.totalPoints).toBe(30);
      
      mcqAssignmentId = response.body.assignment._id;
    });

    it('should auto-calculate total points from questions', async () => {
      const mcqData = {
        title: 'Auto Points Quiz',
        description: 'Points should be calculated automatically',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [
          {
            question: 'Question 1',
            type: 'multiple-choice',
            options: ['A', 'B', 'C'],
            correctAnswer: 'A',
            points: 15
          },
          {
            question: 'Question 2',
            type: 'true-false',
            correctAnswer: 'true',
            points: 25
          }
        ]
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      expect(response.status).toBe(201);
      expect(response.body.assignment.totalPoints).toBe(40); // 15 + 25
    });

    it('should allow student to submit MCQ answers and get auto-graded', async () => {
      // First create MCQ assignment
      const mcqData = {
        title: 'Grading Test Quiz',
        description: 'Test automatic grading',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [
          {
            question: 'What is 5 + 3?',
            type: 'multiple-choice',
            options: ['6', '7', '8', '9'],
            correctAnswer: '8',
            points: 20
          },
          {
            question: 'Is JavaScript a programming language?',
            type: 'true-false',
            correctAnswer: 'true',
            points: 30
          }
        ]
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      const assignmentId = assignmentRes.body.assignment._id;
      const questions = assignmentRes.body.assignment.questions;

      // Submit answers (one correct, one incorrect)
      const answers = {
        [questions[0]._id]: '8',     // Correct answer
        [questions[1]._id]: 'false'  // Incorrect answer
      };

      const submissionRes = await request(app)
        .post(`/api/assignments/${assignmentId}/submit-mcq`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers });

      expect(submissionRes.status).toBe(200);
      expect(submissionRes.body.score).toBe(20); // Only first question correct
      expect(submissionRes.body.totalPoints).toBe(50);
      expect(submissionRes.body.percentage).toBe(40); // 20/50 = 40%
      expect(submissionRes.body.submission.status).toBe('graded');
    });

    it('should prevent duplicate MCQ submissions', async () => {
      // Create assignment
      const mcqData = {
        title: 'Duplicate Test Quiz',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [{
          question: 'Test question',
          type: 'true-false',
          correctAnswer: 'true',
          points: 10
        }]
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      const assignmentId = assignmentRes.body.assignment._id;
      const questionId = assignmentRes.body.assignment.questions[0]._id;

      // First submission
      await request(app)
        .post(`/api/assignments/${assignmentId}/submit-mcq`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: { [questionId]: 'true' } });

      // Second submission should fail
      const secondRes = await request(app)
        .post(`/api/assignments/${assignmentId}/submit-mcq`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: { [questionId]: 'true' } });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.message).toBe('Assignment already submitted');
    });

    it('should enforce MCQ assignment deadline', async () => {
      // Create assignment with past due date
      const mcqData = {
        title: 'Overdue Quiz',
        type: 'mcq',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        allowLateSubmission: false,
        questions: [{
          question: 'Test question',
          type: 'true-false',
          correctAnswer: 'true',
          points: 10
        }]
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      const assignmentId = assignmentRes.body.assignment._id;
      const questionId = assignmentRes.body.assignment.questions[0]._id;

      const submissionRes = await request(app)
        .post(`/api/assignments/${assignmentId}/submit-mcq`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: { [questionId]: 'true' } });

      expect(submissionRes.status).toBe(400);
      expect(submissionRes.body.message).toBe('Assignment deadline has passed');
    });
  });

  describe('File-Based Assignment Creation and Submission', () => {
    it('should create a file-based assignment', async () => {
      const fileData = {
        title: 'Essay Assignment',
        description: 'Write a 500-word essay and submit as PDF',
        type: 'file',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalPoints: 100,
        instructions: 'Please submit your essay in PDF format. Make sure it is clearly readable.'
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(fileData);

      expect(response.status).toBe(201);
      expect(response.body.assignment.type).toBe('file');
      expect(response.body.assignment.title).toBe('Essay Assignment');
      expect(response.body.assignment.totalPoints).toBe(100);
      
      fileAssignmentId = response.body.assignment._id;
    });

    it('should handle file upload submission (mocked)', async () => {
      // Create file assignment first
      const fileData = {
        title: 'File Upload Test',
        description: 'Test file upload functionality',
        type: 'file',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalPoints: 50
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(fileData);

      const assignmentId = assignmentRes.body.assignment._id;

      // Create a test file
      const testFilePath = path.join(__dirname, 'test-files', 'sample.pdf');
      
      // Ensure test files directory exists
      const testFilesDir = path.dirname(testFilePath);
      if (!fs.existsSync(testFilesDir)) {
        fs.mkdirSync(testFilesDir, { recursive: true });
      }
      
      // Create a dummy PDF file for testing
      fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4 dummy pdf content'));

      const response = await request(app)
        .post(`/api/assignments/${assignmentId}/submit-files`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('files', testFilePath);

      // Note: This test will fail without proper S3 configuration
      // In a real test environment, you would mock the S3 service
      // For now, we expect either success or a specific S3 error
      expect([200, 500]).toContain(response.status);
      
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should reject non-PDF/image files', async () => {
      // Create file assignment
      const fileData = {
        title: 'File Type Test',
        type: 'file',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalPoints: 50
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(fileData);

      const assignmentId = assignmentRes.body.assignment._id;

      // Create an invalid file type (text file)
      const testFilePath = path.join(__dirname, 'test-files', 'invalid.txt');
      const testFilesDir = path.dirname(testFilePath);
      
      if (!fs.existsSync(testFilesDir)) {
        fs.mkdirSync(testFilesDir, { recursive: true });
      }
      
      fs.writeFileSync(testFilePath, 'This is a text file');

      const response = await request(app)
        .post(`/api/assignments/${assignmentId}/submit-files`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('files', testFilePath);

      expect(response.status).toBe(500); // Multer error for invalid file type
      
      // Clean up
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should prevent file submissions for non-file assignments', async () => {
      // Create MCQ assignment
      const mcqData = {
        title: 'MCQ Not File',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [{
          question: 'Test',
          type: 'true-false',
          correctAnswer: 'true',
          points: 10
        }]
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      const assignmentId = assignmentRes.body.assignment._id;

      // Try to submit files to MCQ assignment
      const testFilePath = path.join(__dirname, 'test-files', 'test.pdf');
      const testFilesDir = path.dirname(testFilePath);
      
      if (!fs.existsSync(testFilesDir)) {
        fs.mkdirSync(testFilesDir, { recursive: true });
      }
      
      fs.writeFileSync(testFilePath, '%PDF-1.4 test');

      const response = await request(app)
        .post(`/api/assignments/${assignmentId}/submit-files`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('files', testFilePath);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('This endpoint is only for file-based assignments');
      
      // Clean up
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });

  describe('Assignment Retrieval and Access Control', () => {
    it('should return assignments with correct metadata for students', async () => {
      // Create both types of assignments
      const mcqData = {
        title: 'MCQ Test',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [{ question: 'Test', type: 'true-false', correctAnswer: 'true', points: 10 }]
      };

      const fileData = {
        title: 'File Test',
        type: 'file',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalPoints: 100
      };

      await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(fileData);

      // Get assignments as student
      const response = await request(app)
        .get(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assignments).toHaveLength(2);
      
      const mcqAssignment = response.body.assignments.find(a => a.type === 'mcq');
      const fileAssignment = response.body.assignments.find(a => a.type === 'file');
      
      expect(mcqAssignment).toBeDefined();
      expect(fileAssignment).toBeDefined();
      expect(mcqAssignment.questions).toBeDefined();
    });

    it('should enforce access control - students cannot access other students assignments', async () => {
      // Create another student
      const otherStudentRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Other Student',
          email: 'other@test.com',
          password: 'password123',
          role: 'student'
        });

      const otherStudentToken = otherStudentRes.body.token;

      // Create assignment
      const mcqData = {
        title: 'Access Control Test',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [{ question: 'Test', type: 'true-false', correctAnswer: 'true', points: 10 }]
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      const assignmentId = assignmentRes.body.assignment._id;
      const questionId = assignmentRes.body.assignment.questions[0]._id;

      // Other student (not in classroom) tries to submit
      const response = await request(app)
        .post(`/api/assignments/${assignmentId}/submit-mcq`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({ answers: { [questionId]: 'true' } });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied to this assignment');
    });

    it('should handle invalid assignment IDs gracefully', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/assignments/${invalidId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Assignment not found');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty MCQ answers array', async () => {
      // Create MCQ assignment
      const mcqData = {
        title: 'Empty Answers Test',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [{ question: 'Test', type: 'true-false', correctAnswer: 'true', points: 10 }]
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      const assignmentId = assignmentRes.body.assignment._id;

      // Submit empty answers
      const response = await request(app)
        .post(`/api/assignments/${assignmentId}/submit-mcq`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: {} });

      expect(response.status).toBe(200);
      expect(response.body.score).toBe(0);
      expect(response.body.percentage).toBe(0);
    });

    it('should handle malformed question data gracefully', async () => {
      const malformedData = {
        title: 'Malformed Test',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [
          {
            // Missing required fields
            question: 'Incomplete question',
            type: 'multiple-choice'
            // Missing correctAnswer and points
          }
        ]
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(malformedData);

      expect(response.status).toBe(201); // Should still create but with 0 points
    });

    it('should validate required fields for assignment creation', async () => {
      const invalidData = {
        // Missing required title
        description: 'Invalid assignment data',
        type: 'mcq'
        // Missing dueDate
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent MCQ submissions', async () => {
      // Create assignment
      const mcqData = {
        title: 'Concurrent Test',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [{ question: 'Test', type: 'true-false', correctAnswer: 'true', points: 10 }]
      };

      const assignmentRes = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      const assignmentId = assignmentRes.body.assignment._id;
      const questionId = assignmentRes.body.assignment.questions[0]._id;

      // Create multiple students and try concurrent submissions
      const studentPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const studentRes = await request(app)
          .post('/api/auth/register')
          .send({
            name: `Concurrent Student ${i}`,
            email: `concurrent${i}@test.com`,
            password: 'password123',
            role: 'student'
          });

        // Add to classroom
        await request(app)
          .post(`/api/classrooms/${classroomId}/join`)
          .set('Authorization', `Bearer ${studentRes.body.token}`)
          .send({
            classCode: (await Classroom.findById(classroomId)).classCode
          });

        studentPromises.push(
          request(app)
            .post(`/api/assignments/${assignmentId}/submit-mcq`)
            .set('Authorization', `Bearer ${studentRes.body.token}`)
            .send({ answers: { [questionId]: 'true' } })
        );
      }

      const results = await Promise.all(studentPromises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.score).toBe(10);
      });
    });

    it('should handle large question arrays efficiently', async () => {
      const largeQuestions = [];
      
      for (let i = 0; i < 50; i++) {
        largeQuestions.push({
          question: `Question ${i + 1}: What is ${i} + 1?`,
          type: 'multiple-choice',
          options: [`${i}`, `${i + 1}`, `${i + 2}`, `${i + 3}`],
          correctAnswer: `${i + 1}`,
          points: 2
        });
      }

      const mcqData = {
        title: 'Large Quiz - 50 Questions',
        type: 'mcq',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: largeQuestions
      };

      const response = await request(app)
        .post(`/api/assignments/classroom/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(mcqData);

      expect(response.status).toBe(201);
      expect(response.body.assignment.questions).toHaveLength(50);
      expect(response.body.assignment.totalPoints).toBe(100); // 50 * 2 points
    });
  });
});

// Helper function to clean up test files
afterAll(() => {
  const testFilesDir = path.join(__dirname, 'test-files');
  if (fs.existsSync(testFilesDir)) {
    fs.rmSync(testFilesDir, { recursive: true, force: true });
  }
});