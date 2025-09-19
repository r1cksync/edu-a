const express = require('express');
const router = express.Router();
const { upload, uploadFile } = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');

// General file upload endpoint
router.post('/', auth, upload.single('file'), uploadFile);

module.exports = router;