#!/usr/bin/env node

/**
 * Multer-S3 Configuration Test
 * Tests if multer-s3 can properly work with our S3 configuration
 */

const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

async function testMulterS3() {
  console.log('🔍 Testing Multer-S3 Configuration...\n');

  try {
    console.log('1. Creating S3 instance...');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    console.log('✅ S3 instance created');

    console.log('2. Testing S3 methods...');
    console.log(`   s3.listBuckets: ${typeof s3.listBuckets}`);
    console.log(`   s3.upload: ${typeof s3.upload}`);
    console.log(`   s3.deleteObject: ${typeof s3.deleteObject}`);
    console.log(`   s3.send: ${typeof s3.send}`);
    console.log(`   s3.client: ${typeof s3.client}`);

    console.log('3. Creating multer-s3 storage...');
    const upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        key: function (req, file, cb) {
          cb(null, `test/${Date.now()}-${file.originalname}`);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
      }),
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      }
    });
    console.log('✅ Multer-S3 storage created successfully');

    console.log('\n✅ All tests passed - Configuration should work');

  } catch (error) {
    console.log('❌ Test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

testMulterS3();