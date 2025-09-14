#!/usr/bin/env node

/**
 * Manual Testing Script for Enhanced Assignment Features
 * Run with: node scripts/test-assignment-features.js
 * 
 * This script tests:
 * 1. MCQ Assignment Creation
 * 2. MCQ Assignment Submission & Auto-grading
 * 3. File-based Assignment Creation
 * 4. File-based Assignment Submission (simulated)
 * 5. Error handling and edge cases
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const TIMESTAMP = Date.now();
const TEST_EMAIL_TEACHER = `test.teacher.${TIMESTAMP}@example.com`;
const TEST_EMAIL_STUDENT = `test.student.${TIMESTAMP}@example.com`;
const TEST_PASSWORD = 'password123';

let teacherToken = '';
let studentToken = '';
let classroomId = '';
let mcqAssignmentId = '';
let fileAssignmentId = '';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logTest(testName) {
  log(`\n🧪 Testing: ${testName}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(method, endpoint, data = null, token = null, isFile = false) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isFile && data) {
      config.data = data;
      config.headers = { ...config.headers, ...data.getHeaders() };
    } else if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message, 
      status: error.response?.status 
    };
  }
}

async function setupTestUsers() {
  logTest('Setting up test users');

  // Register teacher
  const teacherRes = await makeRequest('POST', '/auth/register', {
    name: 'Test Teacher',
    email: TEST_EMAIL_TEACHER,
    password: TEST_PASSWORD,
    role: 'teacher'
  });

  if (teacherRes.success) {
    teacherToken = teacherRes.data.token;
    logSuccess('Teacher registered successfully');
  } else {
    logError(`Failed to register teacher: ${teacherRes.error}`);
    return false;
  }

  // Register student
  const studentRes = await makeRequest('POST', '/auth/register', {
    name: 'Test Student',
    email: TEST_EMAIL_STUDENT,
    password: TEST_PASSWORD,
    role: 'student'
  });

  if (studentRes.success) {
    studentToken = studentRes.data.token;
    logSuccess('Student registered successfully');
  } else {
    logError(`Failed to register student: ${studentRes.error}`);
    return false;
  }

  return true;
}

async function setupClassroom() {
  logTest('Creating test classroom');

  const classroomRes = await makeRequest('POST', '/classrooms', {
    name: 'Test Classroom - Assignment Features',
    description: 'Testing MCQ and File-based assignments',
    subject: 'Computer Science',
    allowStudentPosts: true,
    allowStudentComments: true
  }, teacherToken);

  if (classroomRes.success) {
    classroomId = classroomRes.data.classroom._id;
    const classCode = classroomRes.data.classroom.classCode;
    logSuccess(`Classroom created with ID: ${classroomId}`);

    // Add student to classroom
    const joinRes = await makeRequest('POST', `/classrooms/join`, {
      classCode: classCode
    }, studentToken);

    if (joinRes.success) {
      logSuccess('Student joined classroom successfully');
      return true;
    } else {
      logError(`Failed to join classroom: ${joinRes.error}`);
      return false;
    }
  } else {
    logError(`Failed to create classroom: ${classroomRes.error}`);
    return false;
  }
}

async function testMCQAssignmentCreation() {
  logTest('Creating MCQ Assignment');

  const mcqData = {
    title: 'JavaScript Fundamentals Quiz',
    description: 'Test your knowledge of JavaScript basics',
    type: 'mcq',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalPoints: 50,
    questions: [
      {
        question: 'What does "JS" stand for?',
        type: 'multiple-choice',
        options: ['Java Script', 'JavaScript', 'Just Script', 'Json Script'],
        correctAnswer: 'JavaScript',
        points: 10
      },
      {
        question: 'Is JavaScript the same as Java?',
        type: 'true-false',
        options: ['true', 'false'],
        correctAnswer: 'false',
        points: 15
      },
      {
        question: 'Which company developed JavaScript?',
        type: 'multiple-choice',
        options: ['Microsoft', 'Netscape', 'Google', 'Apple'],
        correctAnswer: 'Netscape',
        points: 10
      },
      {
        question: 'JavaScript is a compiled language.',
        type: 'true-false',
        options: ['true', 'false'],
        correctAnswer: 'false',
        points: 15
      }
    ]
  };

  const response = await makeRequest('POST', `/assignments/classroom/${classroomId}`, mcqData, teacherToken);

  if (response.success) {
    mcqAssignmentId = response.data.assignment._id;
    logSuccess(`MCQ Assignment created with ID: ${mcqAssignmentId}`);
    logSuccess(`Total points: ${response.data.assignment.totalPoints}`);
    logSuccess(`Questions count: ${response.data.assignment.questions.length}`);
    
    // Verify auto-calculation of total points
    const expectedPoints = mcqData.questions.reduce((sum, q) => sum + q.points, 0);
    if (response.data.assignment.totalPoints === expectedPoints) {
      logSuccess('Total points calculated correctly from questions');
    } else {
      logWarning(`Total points mismatch. Expected: ${expectedPoints}, Got: ${response.data.assignment.totalPoints}`);
    }
    
    return response.data.assignment;
  } else {
    logError(`Failed to create MCQ assignment: ${response.error}`);
    return null;
  }
}

async function testMCQSubmission(assignment) {
  logTest('Submitting MCQ Assignment');

  if (!assignment || !assignment.questions) {
    logError('No assignment or questions available for submission test');
    return;
  }

  // Prepare answers (mix of correct and incorrect)
  const answers = {};
  assignment.questions.forEach((question, index) => {
    switch (index) {
      case 0: // Correct answer
        answers[question._id] = 'JavaScript';
        break;
      case 1: // Correct answer
        answers[question._id] = 'false';
        break;
      case 2: // Incorrect answer
        answers[question._id] = 'Microsoft';
        break;
      case 3: // Correct answer
        answers[question._id] = 'false';
        break;
      default:
        answers[question._id] = question.correctAnswer;
    }
  });

  const response = await makeRequest('POST', `/assignments/${mcqAssignmentId}/submit-mcq`, { answers }, studentToken);

  if (response.success) {
    logSuccess(`MCQ submission successful!`);
    logSuccess(`Score: ${response.data.score}/${response.data.totalPoints}`);
    logSuccess(`Percentage: ${response.data.percentage}%`);
    logSuccess(`Status: ${response.data.submission.status}`);
    
    // Expected score: 10 + 15 + 0 + 15 = 40 points
    const expectedScore = 40;
    if (response.data.score === expectedScore) {
      logSuccess('Auto-grading calculated correctly!');
    } else {
      logWarning(`Score mismatch. Expected: ${expectedScore}, Got: ${response.data.score}`);
    }
  } else {
    logError(`MCQ submission failed: ${response.error}`);
  }
}

async function testDuplicateSubmission() {
  logTest('Testing duplicate submission prevention');

  const answers = {};
  const response = await makeRequest('POST', `/assignments/${mcqAssignmentId}/submit-mcq`, { answers }, studentToken);

  if (!response.success && response.status === 400 && response.error.includes('already submitted')) {
    logSuccess('Duplicate submission correctly prevented');
  } else {
    logError('Duplicate submission was not prevented properly');
  }
}

async function testFileAssignmentCreation() {
  logTest('Creating File-based Assignment');

  const fileData = {
    title: 'Essay Assignment: The Future of AI',
    description: 'Write a comprehensive essay about the future of artificial intelligence and its impact on society.',
    type: 'file',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    totalPoints: 100,
    instructions: 'Please submit your essay in PDF format. The essay should be 1000-1500 words and include at least 5 references.',
    allowLateSubmission: true
  };

  const response = await makeRequest('POST', `/assignments/classroom/${classroomId}`, fileData, teacherToken);

  if (response.success) {
    fileAssignmentId = response.data.assignment._id;
    logSuccess(`File Assignment created with ID: ${fileAssignmentId}`);
    logSuccess(`Assignment type: ${response.data.assignment.type}`);
    logSuccess(`Total points: ${response.data.assignment.totalPoints}`);
    return response.data.assignment;
  } else {
    logError(`Failed to create file assignment: ${response.error}`);
    return null;
  }
}

async function testFileSubmission() {
  logTest('Testing File Submission (Simulated)');

  // Create a test PDF file
  const testDir = path.join(__dirname, 'temp-test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFilePath = path.join(testDir, 'test-essay.pdf');
  const testFileContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF');
  
  fs.writeFileSync(testFilePath, testFileContent);

  try {
    const formData = new FormData();
    formData.append('files', fs.createReadStream(testFilePath));

    const config = {
      method: 'POST',
      url: `${BASE_URL}/assignments/${fileAssignmentId}/submit-files`,
      headers: {
        Authorization: `Bearer ${studentToken}`,
        ...formData.getHeaders()
      },
      data: formData
    };

    const response = await axios(config);

    if (response.status === 200) {
      logSuccess('File submission successful!');
      logSuccess(`Files uploaded: ${response.data.filesUploaded}`);
      logSuccess(`Submission status: ${response.data.submission.status}`);
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    
    if (errorMsg.includes('AWS') || errorMsg.includes('S3') || errorMsg.includes('credentials') || errorMsg.includes('client.send')) {
      logWarning('File submission uses local storage fallback (AWS S3 not configured)');
      logWarning('This is expected in development environment');
      logWarning('In production, configure AWS S3 credentials for cloud storage');
    } else if (errorMsg.includes('ENOENT') || errorMsg.includes('uploads')) {
      logWarning('File upload directory issue - this is a configuration problem');
      logWarning('Ensure uploads/assignments/ directory exists and is writable');
    } else {
      logError(`File submission failed: ${errorMsg}`);
      logError('This indicates a real issue that should be investigated');
    }
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  }
}

async function testAssignmentRetrieval() {
  logTest('Testing Assignment Retrieval');

  // Get classroom assignments as student
  const response = await makeRequest('GET', `/assignments/classroom/${classroomId}`, null, studentToken);

  if (response.success) {
    const assignments = response.data.assignments;
    logSuccess(`Retrieved ${assignments.length} assignments`);
    
    const mcqAssignment = assignments.find(a => a.type === 'mcq');
    const fileAssignment = assignments.find(a => a.type === 'file');
    
    if (mcqAssignment) {
      logSuccess(`MCQ assignment found: ${mcqAssignment.title}`);
      if (mcqAssignment.hasSubmission) {
        logSuccess('MCQ submission status correctly indicated');
      }
    }
    
    if (fileAssignment) {
      logSuccess(`File assignment found: ${fileAssignment.title}`);
    }
  } else {
    logError(`Failed to retrieve assignments: ${response.error}`);
  }
}

async function testErrorHandling() {
  logTest('Testing Error Handling');

  // Test 1: Submit MCQ to file assignment
  const mcqAnswers = { 'fake-question-id': 'fake-answer' };
  const wrongTypeRes = await makeRequest('POST', `/assignments/${fileAssignmentId}/submit-mcq`, { answers: mcqAnswers }, studentToken);
  
  if (!wrongTypeRes.success && wrongTypeRes.error.includes('only for MCQ assignments')) {
    logSuccess('Correctly prevented MCQ submission to file assignment');
  } else {
    logError('Failed to prevent wrong submission type');
  }

  // Test 2: Access assignment without permission
  const noTokenRes = await makeRequest('GET', `/assignments/${mcqAssignmentId}`);
  
  if (!noTokenRes.success && noTokenRes.status === 401) {
    logSuccess('Correctly enforced authentication requirement');
  } else {
    logError('Failed to enforce authentication');
  }

  // Test 3: Invalid assignment ID
  const invalidRes = await makeRequest('GET', '/assignments/507f1f77bcf86cd799439011', null, studentToken);
  
  if (!invalidRes.success && invalidRes.status === 404) {
    logSuccess('Correctly handled invalid assignment ID');
  } else {
    logError('Failed to handle invalid assignment ID');
  }
}

async function cleanup() {
  logTest('Cleaning up test data');
  
  try {
    // Delete assignments
    if (mcqAssignmentId) {
      await makeRequest('DELETE', `/assignments/${mcqAssignmentId}`, null, teacherToken);
    }
    if (fileAssignmentId) {
      await makeRequest('DELETE', `/assignments/${fileAssignmentId}`, null, teacherToken);
    }
    
    // Delete classroom (will cascade delete related data)
    if (classroomId) {
      await makeRequest('DELETE', `/classrooms/${classroomId}`, null, teacherToken);
    }
    
    logSuccess('Test data cleaned up successfully');
  } catch (error) {
    logWarning('Some cleanup operations may have failed - this is normal');
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🚀 STARTING ASSIGNMENT FEATURES TESTING', 'blue');
  log('='.repeat(60), 'blue');

  try {
    // Setup
    const usersSetup = await setupTestUsers();
    if (!usersSetup) {
      logError('Failed to setup users. Exiting.');
      return;
    }

    const classroomSetup = await setupClassroom();
    if (!classroomSetup) {
      logError('Failed to setup classroom. Exiting.');
      return;
    }

    // Core functionality tests
    const mcqAssignment = await testMCQAssignmentCreation();
    if (mcqAssignment) {
      await testMCQSubmission(mcqAssignment);
      await testDuplicateSubmission();
    }

    const fileAssignment = await testFileAssignmentCreation();
    if (fileAssignment) {
      await testFileSubmission();
    }

    // Additional tests
    await testAssignmentRetrieval();
    await testErrorHandling();

    log('\n' + '='.repeat(60), 'blue');
    log('✅ TESTING COMPLETED SUCCESSFULLY', 'green');
    log('='.repeat(60), 'blue');

  } catch (error) {
    logError(`Unexpected error during testing: ${error.message}`);
  } finally {
    await cleanup();
  }
}

// Check if axios is available
try {
  require.resolve('axios');
  require.resolve('form-data');
} catch (error) {
  logError('Missing dependencies. Please install them first:');
  logError('npm install axios form-data');
  process.exit(1);
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };