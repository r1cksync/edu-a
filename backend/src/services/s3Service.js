const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Check if AWS credentials are configured
const hasAWSConfig = !!(
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.S3_BUCKET_NAME
);

// Configure AWS S3 only if credentials are available
let s3;
if (hasAWSConfig) {
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
} else {
  console.warn('⚠️  AWS S3 credentials not configured. File uploads will be disabled.');
}

// Fallback local storage configuration
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/assignments/');
  },
  filename: function (req, file, cb) {
    const userId = req.user._id;
    const assignmentId = req.params.assignmentId;
    const timestamp = Date.now();
    const fileName = `${assignmentId}-${userId}-${timestamp}-${file.originalname}`;
    cb(null, fileName);
  }
});

// Multer S3 configuration for assignment files (with fallback)
const assignmentUpload = multer({
  storage: hasAWSConfig ? multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const userId = req.user._id;
      const assignmentId = req.params.assignmentId;
      const timestamp = Date.now();
      const fileName = `assignments/${assignmentId}/${userId}/${timestamp}-${file.originalname}`;
      cb(null, fileName);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        uploadedBy: req.user._id.toString(),
        assignmentId: req.params.assignmentId
      });
    }
  }) : localStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow PDF and image files
    if (file.mimetype.startsWith('application/pdf') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed!'), false);
    }
  }
});

// Function to delete a file from S3 or local storage
const deleteFileFromS3 = async (fileKey) => {
  try {
    if (hasAWSConfig && s3) {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey
      };
      
      await s3.deleteObject(params).promise();
      return true;
    } else {
      // Handle local file deletion
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join('uploads/assignments/', path.basename(fileKey));
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Function to get signed URL for private files
const getSignedUrl = (fileKey, fileName = null, expiresIn = 3600) => {
  try {
    if (hasAWSConfig && s3) {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        Expires: expiresIn // URL expires in 1 hour by default
      };
      
      // Add proper download headers if filename provided
      if (fileName) {
        params.ResponseContentDisposition = `attachment; filename="${fileName}"`;
        params.ResponseCacheControl = 'no-cache';
      }
      
      return s3.getSignedUrl('getObject', params);
    } else {
      // For local files, return a simple URL
      return `/uploads/assignments/${path.basename(fileKey)}`;
    }
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

// Function to upload assignment attachments (for teachers)
const teacherAttachmentUpload = multer({
  storage: hasAWSConfig ? multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const teacherId = req.user._id;
      const timestamp = Date.now();
      const fileName = `assignment-attachments/${teacherId}/${timestamp}-${file.originalname}`;
      cb(null, fileName);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        uploadedBy: req.user._id.toString(),
        type: 'assignment-attachment'
      });
    }
  }) : localStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for teacher attachments
  },
  fileFilter: function (req, file, cb) {
    // Allow more file types for teacher attachments
    const allowedTypes = [
      'application/pdf',
      'image/',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed!'), false);
    }
  }
});

module.exports = {
  assignmentUpload,
  teacherAttachmentUpload,
  deleteFileFromS3,
  getSignedUrl,
  s3: hasAWSConfig ? s3 : null,
  hasAWSConfig
};