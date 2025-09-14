#!/usr/bin/env node

/**
 * Simple File Upload Test
 * Tests if the backend can handle file uploads to local storage
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';

async function testFileUpload() {
  console.log('🔍 Testing File Upload Configuration...\n');

  try {
    // Step 1: Register test users
    console.log('1. Registering test users...');
    const timestamp = Date.now();
    
    const teacherRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test Teacher',
      email: `teacher.${timestamp}@test.com`,
      password: 'password123',
      role: 'teacher'
    });
    
    const studentRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test Student', 
      email: `student.${timestamp}@test.com`,
      password: 'password123',
      role: 'student'
    });

    const teacherToken = teacherRes.data.token;
    const studentToken = studentRes.data.token;
    console.log('✅ Users registered');

    // Step 2: Create classroom
    console.log('2. Creating classroom...');
    const classroomRes = await axios.post(`${BASE_URL}/classrooms`, {
      name: 'Test Classroom',
      description: 'File upload test',
      subject: 'Computer Science',
      allowStudentPosts: true
    }, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const classroomId = classroomRes.data.classroom._id;
    console.log('✅ Classroom created');

    // Step 3: Join classroom
    console.log('3. Student joining classroom...');
    await axios.post(`${BASE_URL}/classrooms/join`, {
      classCode: classroomRes.data.classroom.classCode
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log('✅ Student joined classroom');

    // Step 4: Create file assignment
    console.log('4. Creating file assignment...');
    const assignmentRes = await axios.post(`${BASE_URL}/assignments/classroom/${classroomId}`, {
      title: 'File Upload Test Assignment',
      description: 'Testing file upload functionality',
      type: 'file',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalPoints: 100
    }, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const assignmentId = assignmentRes.data.assignment._id;
    console.log('✅ File assignment created');

    // Step 5: Create test file
    console.log('5. Creating test PDF file...');
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const testFilePath = path.join(testDir, 'test.pdf');
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj<<>>\nendobj\ntrailer<<>>\n%%EOF');
    fs.writeFileSync(testFilePath, pdfContent);
    console.log('✅ Test PDF created');

    // Step 6: Upload file
    console.log('6. Uploading file...');
    const formData = new FormData();
    formData.append('files', fs.createReadStream(testFilePath));

    try {
      const uploadRes = await axios({
        method: 'POST',
        url: `${BASE_URL}/assignments/${assignmentId}/submit-files`,
        headers: {
          Authorization: `Bearer ${studentToken}`,
          ...formData.getHeaders()
        },
        data: formData
      });

      console.log('✅ File upload successful!');
      console.log(`   Files uploaded: ${uploadRes.data.filesUploaded}`);
      console.log(`   Submission ID: ${uploadRes.data.submission._id}`);
      
    } catch (uploadError) {
      console.log('❌ File upload failed:');
      console.log(`   Error: ${uploadError.response?.data?.message || uploadError.message}`);
      console.log(`   Status: ${uploadError.response?.status}`);
      
      // Check if it's an AWS/S3 error
      const errorMsg = uploadError.response?.data?.message || uploadError.message;
      if (errorMsg.includes('client.send') || errorMsg.includes('AWS') || errorMsg.includes('S3')) {
        console.log('\n💡 This appears to be an AWS S3 configuration issue.');
        console.log('   The backend is trying to use S3 but credentials may be missing or invalid.');
        console.log('   Check your environment variables:');
        console.log('   - AWS_ACCESS_KEY_ID');
        console.log('   - AWS_SECRET_ACCESS_KEY'); 
        console.log('   - S3_BUCKET_NAME');
        console.log('   - AWS_REGION');
      }
    }

    // Cleanup
    console.log('\n7. Cleaning up...');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

testFileUpload();