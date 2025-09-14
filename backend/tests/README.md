# Assignment Features Testing Guide

This directory contains comprehensive tests for the newly implemented MCQ and File-based assignment features.

## 🧪 Test Files Overview

### 1. Automated Test Suite (`tests/assignment-features.test.js`)
- **Full Jest/Supertest integration**
- **Comprehensive coverage** of all features
- **Database cleanup** between tests
- **Edge case handling**
- **Performance testing**

### 2. Manual Testing Script (`scripts/test-assignment-features.js`)  
- **Interactive console output** with colors
- **Real API calls** to running server
- **Step-by-step verification**
- **AWS S3 integration testing**
- **Error handling demonstrations**

## 🚀 How to Run Tests

### Prerequisites
1. **MongoDB** must be running locally
2. **Backend server** should be running on `http://localhost:3001`
3. **AWS S3 credentials** configured (optional for file tests)

### Method 1: Manual Interactive Testing (Recommended)
```bash
# Start the backend server first
npm run dev

# In another terminal, run the manual test script
npm run test:manual
```

### Method 2: Automated Jest Testing
```bash
# Run all assignment feature tests
npm run test:assignments

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🎯 What Gets Tested

### MCQ Assignment Features
- ✅ **Assignment Creation** with questions array
- ✅ **Auto-grade Calculation** from question points
- ✅ **Multiple Choice Questions** with options
- ✅ **True/False Questions** support
- ✅ **Answer Submission** with validation
- ✅ **Automatic Scoring** based on correct answers
- ✅ **Duplicate Prevention** (can't submit twice)
- ✅ **Deadline Enforcement**
- ✅ **Access Control** (student must be in classroom)

### File-Based Assignment Features  
- ✅ **Assignment Creation** for file submissions
- ✅ **File Upload Validation** (PDF/Images only)
- ✅ **AWS S3 Integration** (if configured)
- ✅ **File Size Limits** (10MB max)
- ✅ **Multiple File Support**
- ✅ **Submission Tracking**

### Security & Error Handling
- ✅ **Authentication Required** for all endpoints
- ✅ **Role-based Access Control**
- ✅ **Invalid Assignment ID** handling
- ✅ **Malformed Data** validation
- ✅ **Cross-assignment Type** prevention
- ✅ **Concurrent Submission** handling

### Performance Testing
- ✅ **Large Question Arrays** (50+ questions)
- ✅ **Multiple Concurrent Submissions**
- ✅ **Database Query Optimization**

## 📊 Expected Test Results

### Manual Test Script Output
```
🚀 STARTING ASSIGNMENT FEATURES TESTING
============================================================

🧪 Testing: Setting up test users
✅ Teacher registered successfully
✅ Student registered successfully

🧪 Testing: Creating test classroom
✅ Classroom created with ID: [classroom-id]
✅ Student joined classroom successfully

🧪 Testing: Creating MCQ Assignment
✅ MCQ Assignment created with ID: [assignment-id]
✅ Total points: 50
✅ Questions count: 4
✅ Total points calculated correctly from questions

🧪 Testing: Submitting MCQ Assignment
✅ MCQ submission successful!
✅ Score: 40/50
✅ Percentage: 80%
✅ Status: graded
✅ Auto-grading calculated correctly!

🧪 Testing: Testing duplicate submission prevention
✅ Duplicate submission correctly prevented

🧪 Testing: Creating File-based Assignment
✅ File Assignment created with ID: [assignment-id]
✅ Assignment type: file
✅ Total points: 100

🧪 Testing: Testing File Submission (Simulated)
⚠️  File submission failed due to AWS S3 configuration (expected in test environment)

✅ TESTING COMPLETED SUCCESSFULLY
============================================================
```

## 🔧 Configuration Notes

### Environment Variables Needed
```env
# Required for basic functionality
MONGODB_URI=mongodb://localhost:27017/shayak
JWT_SECRET=your-jwt-secret

# Required for file upload testing
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# Optional for test database
MONGODB_TEST_URI=mongodb://localhost:27017/shayak_test
```

### AWS S3 Setup (Optional)
If you want to test file uploads fully:
1. Create an S3 bucket
2. Configure AWS credentials 
3. Set environment variables
4. Ensure bucket has proper CORS settings

Without S3 setup, file tests will show warnings but won't fail.

## 🐛 Troubleshooting

### Common Issues
1. **"Connection refused"** - Make sure backend server is running
2. **"MongoDB connection error"** - Ensure MongoDB is running locally
3. **"AWS credentials not found"** - File upload tests will show warnings (expected)
4. **"Port 3001 already in use"** - Stop other instances of the backend

### Debug Mode
Set `DEBUG=true` environment variable for more verbose output:
```bash
DEBUG=true npm run test:manual
```

## 📝 Test Coverage

The test suite covers:
- **Happy Path Scenarios** ✅
- **Edge Cases** ✅  
- **Error Conditions** ✅
- **Security Vulnerabilities** ✅
- **Performance Edge Cases** ✅
- **Data Integrity** ✅
- **API Contract Compliance** ✅

## 🤝 Contributing

When adding new assignment features:
1. Add tests to `assignment-features.test.js`
2. Update the manual test script if needed
3. Update this README with new test scenarios
4. Ensure all tests pass before committing

Happy testing! 🎉