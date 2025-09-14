#!/usr/bin/env node

/**
 * Pre-test Health Check Script
 * Verifies backend server and dependencies are ready for testing
 */

const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:3001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shayak';

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

async function checkBackendServer() {
  log('\n🔍 Checking Backend Server...', 'cyan');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    if (response.status === 200) {
      log('✅ Backend server is running and healthy', 'green');
      return true;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('❌ Backend server is not running', 'red');
      log('   Please start the server with: npm run dev', 'yellow');
    } else if (error.code === 'ENOTFOUND') {
      log('❌ Cannot reach backend server', 'red');
      log('   Check if server is running on http://localhost:3001', 'yellow');
    } else {
      log('❌ Backend server health check failed', 'red');
      log(`   Error: ${error.message}`, 'yellow');
    }
    return false;
  }
}

async function checkMongoDB() {
  log('\n🔍 Checking MongoDB Connection...', 'cyan');
  
  try {
    await mongoose.connect(MONGODB_URI, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000 
    });
    log('✅ MongoDB is connected and accessible', 'green');
    await mongoose.connection.close();
    return true;
  } catch (error) {
    log('❌ MongoDB connection failed', 'red');
    log(`   Error: ${error.message}`, 'yellow');
    log('   Please ensure MongoDB is running locally', 'yellow');
    return false;
  }
}

async function checkEnvironmentVariables() {
  log('\n🔍 Checking Environment Variables...', 'cyan');
  
  const required = ['JWT_SECRET'];
  const optional = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
  
  let allGood = true;
  
  for (const envVar of required) {
    if (process.env[envVar]) {
      log(`✅ ${envVar} is set`, 'green');
    } else {
      log(`❌ ${envVar} is missing (required)`, 'red');
      allGood = false;
    }
  }
  
  for (const envVar of optional) {
    if (process.env[envVar]) {
      log(`✅ ${envVar} is set`, 'green');
    } else {
      log(`⚠️  ${envVar} is missing (file upload tests will be limited)`, 'yellow');
    }
  }
  
  return allGood;
}

async function checkAPIEndpoints() {
  log('\n🔍 Checking API Endpoints...', 'cyan');
  
  const endpoints = [
    '/api/auth/register',
    '/api/classrooms',
    '/api/assignments'
  ];
  
  let allGood = true;
  
  for (const endpoint of endpoints) {
    try {
      // Just check if endpoint exists (expect 401 for auth endpoints)
      await axios.get(`${BASE_URL}${endpoint}`, { timeout: 3000 });
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 400)) {
        log(`✅ ${endpoint} is accessible`, 'green');
      } else {
        log(`❌ ${endpoint} is not accessible`, 'red');
        allGood = false;
      }
    }
  }
  
  return allGood;
}

async function checkDependencies() {
  log('\n🔍 Checking Dependencies...', 'cyan');
  
  const deps = ['axios', 'form-data', 'jest', 'supertest'];
  let allGood = true;
  
  for (const dep of deps) {
    try {
      require.resolve(dep);
      log(`✅ ${dep} is installed`, 'green');
    } catch (error) {
      log(`❌ ${dep} is not installed`, 'red');
      allGood = false;
    }
  }
  
  if (!allGood) {
    log('\n   Run: npm install', 'yellow');
  }
  
  return allGood;
}

async function runHealthCheck() {
  log('\n' + '='.repeat(60), 'blue');
  log('🏥 BACKEND HEALTH CHECK', 'blue');
  log('='.repeat(60), 'blue');
  
  const checks = [
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'MongoDB', fn: checkMongoDB },
    { name: 'Backend Server', fn: checkBackendServer },
    { name: 'API Endpoints', fn: checkAPIEndpoints }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      if (!result) allPassed = false;
    } catch (error) {
      log(`❌ ${check.name} check failed: ${error.message}`, 'red');
      allPassed = false;
    }
  }
  
  log('\n' + '='.repeat(60), 'blue');
  
  if (allPassed) {
    log('✅ ALL CHECKS PASSED - Ready for testing!', 'green');
    log('\nYou can now run:', 'cyan');
    log('  npm run test:manual     # Interactive testing', 'cyan');
    log('  npm run test:assignments # Jest testing', 'cyan');
  } else {
    log('❌ SOME CHECKS FAILED - Please fix issues above', 'red');
    log('\nCommon solutions:', 'yellow');
    log('  1. Start MongoDB: mongod', 'yellow');
    log('  2. Start backend: npm run dev', 'yellow');
    log('  3. Install deps: npm install', 'yellow');
    log('  4. Check .env file', 'yellow');
  }
  
  log('='.repeat(60), 'blue');
}

if (require.main === module) {
  runHealthCheck().catch(console.error);
}

module.exports = { runHealthCheck };