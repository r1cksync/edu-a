# Shayak Backend - Google Classroom Killer

A comprehensive backend API for an education platform that rivals Google Classroom, built with Next.js, Express, and MongoDB.

## Features

### Core Google Classroom Features
- **User Authentication**: Separate login/registration for teachers and students with JWT tokens
- **Classroom Management**: Create, join, and manage classrooms with unique class codes
- **Assignment System**: Create, publish, submit, and grade assignments with support for quizzes and tests
- **Posts & Comments**: Classroom feed with announcements, materials, and discussions
- **Role-based Access Control**: Different permissions for teachers and students

### Advanced Features (Ready for Implementation)
- **Level-based Learning**: Categorize students into beginner/intermediate/advanced levels
- **Proctored Testing**: Camera, microphone, and tab-switching restrictions for tests
- **AI Analysis**: Performance analysis and personalized recommendations
- **Google Calendar Integration**: Automatic deadline and class reminders
- **Online Classes**: Built-in video conferencing with attendance tracking
- **Cloud Storage**: AWS S3 integration for file storage
- **AI-powered Features**: OpenRouter and Hugging Face integration

## Technology Stack

- **Framework**: Next.js (Express.js API routes)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcryptjs password hashing
- **Validation**: Joi for request validation
- **Testing**: Jest with Supertest for API testing
- **Cloud Services**: AWS S3, Textract, Transcribe
- **AI Services**: OpenRouter, Hugging Face
- **Email**: Nodemailer for notifications

## Project Structure

```
src/
├── controllers/          # Business logic
│   ├── authController.js
│   ├── classroomController.js
│   ├── assignmentController.js
│   ├── postController.js
│   └── userController.js
├── models/              # Database schemas
│   ├── User.js
│   ├── Classroom.js
│   ├── Assignment.js
│   ├── Submission.js
│   ├── Post.js
│   └── Comment.js
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── classroomRoutes.js
│   ├── assignmentRoutes.js
│   ├── postRoutes.js
│   └── userRoutes.js
├── middleware/          # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── validation.js
├── utils/              # Helper functions
└── services/           # External service integrations
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/shayak
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=shayak-storage
   
   # OpenRouter Configuration
   OPENROUTER_API_KEY=your-openrouter-api-key
   
   # Hugging Face Configuration
   HUGGING_FACE_API_KEY=your-huggingface-api-key
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-email-password
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start MongoDB**
   Make sure MongoDB is running locally or update `MONGODB_URI` to point to your MongoDB instance.

6. **Run the application**
   ```bash
   npm run dev
   ```

The server will start on http://localhost:3001

## API Documentation

### Authentication Endpoints

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "teacher", // or "student"
  "department": "Computer Science" // optional for teachers
}
```

#### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile
```
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

### Classroom Endpoints

#### Create Classroom (Teachers only)
```
POST /api/classrooms
Authorization: Bearer <teacher_jwt_token>
Content-Type: application/json

{
  "name": "Introduction to Programming",
  "description": "Learn the basics of programming",
  "subject": "Computer Science"
}
```

#### Join Classroom (Students only)
```
POST /api/classrooms/join
Authorization: Bearer <student_jwt_token>
Content-Type: application/json

{
  "classCode": "ABC123"
}
```

#### Get Classrooms
```
GET /api/classrooms
Authorization: Bearer <jwt_token>
```

### Assignment Endpoints

#### Create Assignment (Teachers only)
```
POST /api/assignments/classroom/{classroomId}
Authorization: Bearer <teacher_jwt_token>
Content-Type: application/json

{
  "title": "Programming Assignment 1",
  "description": "Create a calculator program",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "totalPoints": 100,
  "type": "assignment" // or "quiz", "test"
}
```

#### Submit Assignment (Students only)
```
POST /api/assignments/{assignmentId}/submit
Authorization: Bearer <student_jwt_token>
Content-Type: application/json

{
  "content": "Here is my solution...",
  "answers": [
    {
      "questionId": "question_id",
      "answer": "student_answer"
    }
  ]
}
```

### Posts Endpoints

#### Create Post
```
POST /api/posts/classroom/{classroomId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type": "announcement", // or "material", "general"
  "title": "Important Update",
  "content": "Please read the updated syllabus"
}
```

#### Create Comment
```
POST /api/posts/{postId}/comments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Thanks for the update!",
  "parentComment": "parent_comment_id" // optional for replies
}
```

## Testing

The project includes comprehensive test suites covering all major functionality.

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure
- **auth.test.js**: Authentication and user management tests
- **classroom.test.js**: Classroom creation, joining, and management tests
- **assignment.test.js**: Assignment creation, submission, and grading tests
- **posts.test.js**: Posts and comments functionality tests
- **user.test.js**: User dashboard and profile tests

### Test Coverage
The test suite covers:
- ✅ User registration and authentication
- ✅ Role-based access control
- ✅ Classroom management
- ✅ Assignment lifecycle
- ✅ Submission and grading
- ✅ Posts and comments
- ✅ Dashboard and analytics
- ✅ Error handling
- ✅ Input validation
- ✅ Database operations

## Database Schema

### User Model
- Authentication and profile information
- Role-based fields (student/teacher)
- Profile customization

### Classroom Model
- Class information and settings
- Student enrollment with levels
- Meeting room configuration

### Assignment Model
- Assignment details and settings
- Questions for quizzes/tests
- Proctoring configuration

### Submission Model
- Student submissions
- Grading and feedback
- AI analysis data

### Post Model
- Classroom feed content
- Visibility and targeting settings
- Engagement metrics

### Comment Model
- Threaded comments system
- Moderation features

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Input Validation**: Joi schemas for request validation
- **Role-based Access**: Middleware for permission checking
- **CORS Protection**: Configurable cross-origin resource sharing
- **Error Handling**: Comprehensive error handling and logging

## Performance Features

- **Database Indexing**: Optimized queries with proper indexes
- **Pagination**: Built-in pagination for large datasets
- **Caching Ready**: Structure prepared for Redis caching
- **File Handling**: Efficient file upload and storage

## Deployment

### Environment Setup
1. Set up MongoDB Atlas or self-hosted MongoDB
2. Configure AWS services (S3, SES, etc.)
3. Set up environment variables
4. Configure domain and SSL

### Production Settings
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure proper CORS origins
- Set up logging and monitoring
- Configure backup strategies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Note**: This backend is designed to be the foundation for the complete Shayak education platform. The advanced features like AI analysis, proctored testing, and Google Calendar integration are architecturally planned and can be implemented as needed.