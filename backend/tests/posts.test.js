const request = require('supertest');
const app = require('../src/server');
const { connect, closeDatabase, clearDatabase } = require('./helpers/db');

describe('Posts and Comments Endpoints', () => {
  let teacherToken, studentToken, otherStudentToken;
  let teacherUser, studentUser, otherStudentUser;
  let classroom;

  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Register teacher
    const teacherData = {
      name: 'Teacher User',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'teacher'
    };

    const teacherResponse = await request(app)
      .post('/api/auth/register')
      .send(teacherData);

    teacherToken = teacherResponse.body.token;
    teacherUser = teacherResponse.body.user;

    // Register student
    const studentData = {
      name: 'Student User',
      email: 'student@example.com',
      password: 'password123',
      role: 'student'
    };

    const studentResponse = await request(app)
      .post('/api/auth/register')
      .send(studentData);

    studentToken = studentResponse.body.token;
    studentUser = studentResponse.body.user;

    // Register another student
    const otherStudentData = {
      name: 'Other Student',
      email: 'other@example.com',
      password: 'password123',
      role: 'student'
    };

    const otherStudentResponse = await request(app)
      .post('/api/auth/register')
      .send(otherStudentData);

    otherStudentToken = otherStudentResponse.body.token;
    otherStudentUser = otherStudentResponse.body.user;

    // Create classroom
    const classroomData = {
      name: 'Test Classroom',
      subject: 'Computer Science'
    };

    const classroomResponse = await request(app)
      .post('/api/classrooms')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(classroomData);

    classroom = classroomResponse.body.classroom;

    // Student joins classroom
    await request(app)
      .post('/api/classrooms/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ classCode: classroom.classCode });

    await request(app)
      .post('/api/classrooms/join')
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ classCode: classroom.classCode });
  });

  describe('POST /api/posts/classroom/:classroomId', () => {
    it('should create post as teacher', async () => {
      const postData = {
        type: 'announcement',
        title: 'Welcome to Class',
        content: 'Welcome everyone to our computer science class!',
        visibility: 'all'
      };

      const response = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Post created successfully');
      expect(response.body.post.title).toBe(postData.title);
      expect(response.body.post.type).toBe('announcement');
      expect(response.body.post.author.name).toBe('Teacher User');
    });

    it('should create post as student when allowed', async () => {
      const postData = {
        type: 'general',
        content: 'I have a question about the assignment'
      };

      const response = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.post.type).toBe('general');
      expect(response.body.post.author.name).toBe('Student User');
    });

    it('should not create post as student when not allowed', async () => {
      // Update classroom to disallow student posts
      await request(app)
        .put(`/api/classrooms/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ allowStudentPosts: false });

      const postData = {
        content: 'This should not be allowed'
      };

      const response = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(postData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Students are not allowed to post in this classroom');
    });

    it('should not create post without access to classroom', async () => {
      // Register a student not in the classroom
      const outsiderData = {
        name: 'Outsider Student',
        email: 'outsider@example.com',
        password: 'password123',
        role: 'student'
      };

      const outsiderResponse = await request(app)
        .post('/api/auth/register')
        .send(outsiderData);

      const postData = {
        content: 'Unauthorized post'
      };

      const response = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${outsiderResponse.body.token}`)
        .send(postData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied to this classroom');
    });

    it('should not create post with invalid data', async () => {
      const invalidData = {
        title: 'Title without content'
        // Missing required content field
      };

      const response = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation Error');
    });
  });

  describe('GET /api/posts/classroom/:classroomId', () => {
    let teacherPost, studentPost;

    beforeEach(async () => {
      // Create teacher post
      const teacherPostData = {
        type: 'announcement',
        title: 'Important Announcement',
        content: 'Please read the syllabus carefully'
      };

      const teacherPostResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(teacherPostData);

      teacherPost = teacherPostResponse.body.post;

      // Create student post
      const studentPostData = {
        type: 'general',
        content: 'When is the next assignment due?'
      };

      const studentPostResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(studentPostData);

      studentPost = studentPostResponse.body.post;
    });

    it('should get classroom posts as teacher', async () => {
      const response = await request(app)
        .get(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts).toHaveLength(2);
      // Posts are sorted by newest first, so the teacher post is at index 1
      expect(response.body.posts[1].title).toBe('Important Announcement');
    });

    it('should get classroom posts as student', async () => {
      const response = await request(app)
        .get(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts).toHaveLength(2);
    });

    it('should filter posts by type', async () => {
      const response = await request(app)
        .get(`/api/posts/classroom/${classroom._id}?type=announcement`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].type).toBe('announcement');
    });

    it('should paginate posts', async () => {
      // Create more posts
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post(`/api/posts/classroom/${classroom._id}`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            content: `Test post ${i + 1}`
          });
      }

      const response = await request(app)
        .get(`/api/posts/classroom/${classroom._id}?page=1&limit=5`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.posts.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should not get posts without classroom access', async () => {
      // Register student not in classroom
      const outsiderData = {
        name: 'Outsider',
        email: 'outsider@example.com',
        password: 'password123',
        role: 'student'
      };

      const outsiderResponse = await request(app)
        .post('/api/auth/register')
        .send(outsiderData);

      const response = await request(app)
        .get(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${outsiderResponse.body.token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied to this classroom');
    });
  });

  describe('GET /api/posts/:postId', () => {
    let post;

    beforeEach(async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post for detailed view'
      };

      const response = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(postData);

      post = response.body.post;
    });

    it('should get post details as authorized user', async () => {
      const response = await request(app)
        .get(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.post.title).toBe('Test Post');
      expect(response.body.post.content).toBe('This is a test post for detailed view');
      expect(response.body.post.author.name).toBe('Teacher User');
    });

    it('should increment view count when getting post', async () => {
      const initialViews = post.views || 0;

      const response = await request(app)
        .get(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.post.views).toBe(initialViews + 1);
    });

    it('should not get post without access', async () => {
      // Register student not in classroom
      const outsiderData = {
        name: 'Outsider',
        email: 'outsider@example.com',
        password: 'password123',
        role: 'student'
      };

      const outsiderResponse = await request(app)
        .post('/api/auth/register')
        .send(outsiderData);

      const response = await request(app)
        .get(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${outsiderResponse.body.token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied to this post');
    });
  });

  describe('PUT /api/posts/:postId', () => {
    let post;

    beforeEach(async () => {
      const postData = {
        title: 'Original Title',
        content: 'Original content'
      };

      const response = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(postData);

      post = response.body.post;
    });

    it('should update post as author', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const response = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post updated successfully');
      expect(response.body.post.title).toBe('Updated Title');
      expect(response.body.post.content).toBe('Updated content');
    });

    it('should not update post as non-author', async () => {
      const updateData = {
        title: 'Hacked Title',
        content: 'Hacked content'
      };

      const response = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Post not found or access denied');
    });
  });

  describe('DELETE /api/posts/:postId', () => {
    let teacherPost, studentPost;

    beforeEach(async () => {
      // Teacher post
      const teacherPostResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ content: 'Teacher post' });

      teacherPost = teacherPostResponse.body.post;

      // Student post
      const studentPostResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Student post' });

      studentPost = studentPostResponse.body.post;
    });

    it('should delete own post as author', async () => {
      const response = await request(app)
        .delete(`/api/posts/${studentPost._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post deleted successfully');

      // Verify post is soft deleted
      const getResponse = await request(app)
        .get(`/api/posts/${studentPost._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should delete student post as teacher', async () => {
      const response = await request(app)
        .delete(`/api/posts/${studentPost._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post deleted successfully');
    });

    it('should not delete post without permission', async () => {
      const response = await request(app)
        .delete(`/api/posts/${teacherPost._id}`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied to delete this post');
    });
  });

  describe('PUT /api/posts/:postId/pin', () => {
    let post;

    beforeEach(async () => {
      const postResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ content: 'Post to be pinned' });

      post = postResponse.body.post;
    });

    it('should pin post as teacher', async () => {
      const response = await request(app)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post pinned successfully');
      expect(response.body.post.isPinned).toBe(true);
    });

    it('should unpin pinned post as teacher', async () => {
      // First pin the post
      await request(app)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${teacherToken}`);

      // Then unpin it
      const response = await request(app)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post unpinned successfully');
      expect(response.body.post.isPinned).toBe(false);
    });

    it('should not pin post as student', async () => {
      const response = await request(app)
        .put(`/api/posts/${post._id}/pin`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only teachers can pin posts');
    });
  });

  describe('POST /api/posts/:postId/like', () => {
    let post;

    beforeEach(async () => {
      const postResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ content: 'Post to be liked' });

      post = postResponse.body.post;
    });

    it('should like post', async () => {
      const response = await request(app)
        .post(`/api/posts/${post._id}/like`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Like toggled successfully');
      expect(response.body.likesCount).toBe(1);
      expect(response.body.isLiked).toBe(true);
    });

    it('should unlike already liked post', async () => {
      // First like
      await request(app)
        .post(`/api/posts/${post._id}/like`)
        .set('Authorization', `Bearer ${studentToken}`);

      // Then unlike
      const response = await request(app)
        .post(`/api/posts/${post._id}/like`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.likesCount).toBe(0);
      expect(response.body.isLiked).toBe(false);
    });
  });

  describe('POST /api/posts/:postId/comments', () => {
    let post;

    beforeEach(async () => {
      const postResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ content: 'Post for commenting' });

      post = postResponse.body.post;
    });

    it('should create comment on post', async () => {
      const commentData = {
        content: 'This is a helpful comment'
      };

      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Comment created successfully');
      expect(response.body.comment.content).toBe(commentData.content);
      expect(response.body.comment.author.name).toBe('Student User');
    });

    it('should create reply to comment', async () => {
      // First create a comment
      const commentResponse = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Original comment' });

      const parentComment = commentResponse.body.comment;

      // Then reply to it
      const replyData = {
        content: 'This is a reply',
        parentComment: parentComment._id
      };

      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(replyData);

      expect(response.status).toBe(201);
      expect(response.body.comment.content).toBe('This is a reply');
      expect(response.body.comment.parentComment).toBe(parentComment._id);
    });

    it('should not create comment when comments are disabled', async () => {
      // Create post with comments disabled
      const noCommentsPostResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ 
          content: 'Post with no comments',
          allowComments: false
        });

      const response = await request(app)
        .post(`/api/posts/${noCommentsPostResponse.body.post._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'This should fail' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Comments are disabled for this post');
    });

    it('should not create comment when student comments are disabled', async () => {
      // Disable student comments in classroom
      await request(app)
        .put(`/api/classrooms/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ allowStudentComments: false });

      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'This should fail' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Students are not allowed to comment in this classroom');
    });

    it('should not create comment with invalid data', async () => {
      const response = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({}); // Missing content

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation Error');
    });
  });

  describe('PUT /api/posts/comments/:commentId', () => {
    let post, comment;

    beforeEach(async () => {
      // Create post
      const postResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ content: 'Post with comment' });

      post = postResponse.body.post;

      // Create comment
      const commentResponse = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Original comment' });

      comment = commentResponse.body.comment;
    });

    it('should update comment as author', async () => {
      const updateData = {
        content: 'Updated comment content'
      };

      const response = await request(app)
        .put(`/api/posts/comments/${comment._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Comment updated successfully');
      expect(response.body.comment.content).toBe('Updated comment content');
    });

    it('should not update comment as non-author', async () => {
      const updateData = {
        content: 'Hacked comment'
      };

      const response = await request(app)
        .put(`/api/posts/comments/${comment._id}`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Comment not found or access denied');
    });
  });

  describe('DELETE /api/posts/comments/:commentId', () => {
    let post, comment;

    beforeEach(async () => {
      // Create post
      const postResponse = await request(app)
        .post(`/api/posts/classroom/${classroom._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ content: 'Post with comment' });

      post = postResponse.body.post;

      // Create comment
      const commentResponse = await request(app)
        .post(`/api/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Comment to be deleted' });

      comment = commentResponse.body.comment;
    });

    it('should delete comment as author', async () => {
      const response = await request(app)
        .delete(`/api/posts/comments/${comment._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Comment deleted successfully');
    });

    it('should delete comment as classroom teacher', async () => {
      const response = await request(app)
        .delete(`/api/posts/comments/${comment._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Comment deleted successfully');
    });

    it('should not delete comment without permission', async () => {
      const response = await request(app)
        .delete(`/api/posts/comments/${comment._id}`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied to delete this comment');
    });
  });
});

module.exports = { app };