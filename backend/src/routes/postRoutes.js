const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { auth, requireTeacher } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Global routes
router.get('/', auth, postController.getAllPosts);

// Post routes
router.post('/classroom/:classroomId', auth, validateRequest(schemas.createPost), postController.createPost);
router.get('/classroom/:classroomId', auth, postController.getClassroomPosts);
router.get('/:postId', auth, postController.getPost);
router.put('/:postId', auth, postController.updatePost);
router.delete('/:postId', auth, postController.deletePost);
router.put('/:postId/pin', auth, postController.togglePin);
router.post('/:postId/like', auth, postController.toggleLike);

// Comment routes
router.post('/:postId/comments', auth, validateRequest(schemas.createComment), postController.createComment);
router.put('/comments/:commentId', auth, postController.updateComment);
router.delete('/comments/:commentId', auth, postController.deleteComment);

module.exports = router;