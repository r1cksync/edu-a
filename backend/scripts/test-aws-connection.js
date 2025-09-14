#!/usr/bin/env node

/**
 * AWS S3 Connection Test
 * Tests AWS SDK configuration and S3 connectivity
 */

const AWS = require('aws-sdk');
require('dotenv').config();

async function testAWSConnection() {
  console.log('🔍 Testing AWS S3 Configuration...\n');

  // Check environment variables
  console.log('1. Checking environment variables:');
  console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'Not set (will use default)'}`);
  console.log(`   S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME ? '✅ Set' : '❌ Missing'}`);

  try {
    console.log('\n2. Initializing S3 client...');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    console.log('✅ S3 client initialized');

    console.log('\n3. Testing S3 connection...');
    const result = await s3.listBuckets().promise();
    console.log('✅ S3 connection successful');
    console.log(`   Found ${result.Buckets.length} buckets`);

    // Check if our specific bucket exists
    const bucketExists = result.Buckets.some(bucket => bucket.Name === process.env.S3_BUCKET_NAME);
    if (bucketExists) {
      console.log(`✅ Bucket '${process.env.S3_BUCKET_NAME}' exists`);
    } else {
      console.log(`❌ Bucket '${process.env.S3_BUCKET_NAME}' not found`);
      console.log('   Available buckets:', result.Buckets.map(b => b.Name).join(', '));
    }

    console.log('\n4. Testing bucket access...');
    const objects = await s3.listObjectsV2({
      Bucket: process.env.S3_BUCKET_NAME,
      MaxKeys: 1
    }).promise();
    console.log('✅ Bucket access successful');

  } catch (error) {
    console.log('❌ AWS S3 test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    console.log(`   Status: ${error.statusCode}`);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.log('\n💡 The AWS Access Key ID is invalid');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.log('\n💡 The AWS Secret Access Key is incorrect');
    } else if (error.code === 'NoSuchBucket') {
      console.log('\n💡 The S3 bucket does not exist or is in a different region');
    } else {
      console.log('\n💡 Check your AWS credentials and permissions');
    }
  }
}

testAWSConnection();