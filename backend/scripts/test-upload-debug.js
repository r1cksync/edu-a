#!/usr/bin/env node

/**
 * Direct File Upload Test with Error Debugging
 * This script will attempt to upload a file using the same configuration as our backend
 */

const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function testDirectUpload() {
  console.log('🔍 Testing Direct File Upload with Debug...\n');

  const app = express();
  
  try {
    // Create S3 instance exactly like our service
    console.log('1. Creating S3 instance...');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    console.log('✅ S3 instance created');
    console.log(`   Region: ${s3.config.region}`);
    console.log(`   Bucket: ${process.env.S3_BUCKET_NAME}`);

    // Create multer-s3 configuration exactly like our service
    console.log('\n2. Creating multer-s3 configuration...');
    const upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        key: function (req, file, cb) {
          const fileName = `test-uploads/${Date.now()}-${file.originalname}`;
          console.log(`   Uploading to key: ${fileName}`);
          cb(null, fileName);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, {
            fieldName: file.fieldname,
            uploadedBy: 'test-user',
            testUpload: 'true'
          });
        }
      }),
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
      },
      fileFilter: function (req, file, cb) {
        console.log(`   Processing file: ${file.originalname} (${file.mimetype})`);
        if (file.mimetype.startsWith('application/pdf') || file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only PDF and image files are allowed!'), false);
        }
      }
    });
    console.log('✅ Multer-S3 configuration created');

    // Create a simple express route to test upload
    app.use(express.json());
    app.post('/test-upload', upload.array('files', 5), (req, res) => {
      console.log('✅ Upload successful!');
      console.log(`   Files uploaded: ${req.files.length}`);
      req.files.forEach((file, index) => {
        console.log(`   File ${index + 1}:`);
        console.log(`     Name: ${file.originalname}`);
        console.log(`     Size: ${file.size} bytes`);
        console.log(`     Key: ${file.key}`);
        console.log(`     Location: ${file.location}`);
      });
      
      res.json({
        success: true,
        filesUploaded: req.files.length,
        files: req.files.map(f => ({
          name: f.originalname,
          size: f.size,
          key: f.key,
          location: f.location
        }))
      });
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.log('❌ Upload error caught:');
      console.log(`   Error message: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      console.log(`   Stack trace: ${error.stack}`);
      
      res.status(500).json({
        error: error.message,
        code: error.code
      });
    });

    const server = app.listen(3999, () => {
      console.log('✅ Test server started on port 3999');
      simulateUpload();
    });

    // Simulate upload using axios
    async function simulateUpload() {
      try {
        console.log('\n3. Creating test file...');
        const testDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }

        const testFilePath = path.join(testDir, 'test-upload.pdf');
        const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj<<>>\nendobj\ntrailer<<>>\n%%EOF');
        fs.writeFileSync(testFilePath, pdfContent);
        console.log('✅ Test PDF created');

        console.log('\n4. Uploading file...');
        const FormData = require('form-data');
        const axios = require('axios');

        const formData = new FormData();
        formData.append('files', fs.createReadStream(testFilePath));

        const response = await axios.post('http://localhost:3999/test-upload', formData, {
          headers: formData.getHeaders(),
          timeout: 30000
        });

        console.log('✅ Upload test completed successfully!');
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);

        // Cleanup
        fs.unlinkSync(testFilePath);
        fs.rmdirSync(testDir);
        server.close();
        
      } catch (uploadError) {
        console.log('❌ Upload test failed:');
        console.log(`   Error: ${uploadError.response?.data?.error || uploadError.message}`);
        console.log(`   Status: ${uploadError.response?.status}`);
        
        server.close();
      }
    }

  } catch (error) {
    console.log('❌ Configuration test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

testDirectUpload();