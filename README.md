# 🎓 Shayak - Comprehensive Educational Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://mongodb.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-orange)](https://tensorflow.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)


Live Website Link : https://sahayak-deployment-frontend.onrender.com/




A modern, AI-powered educational platform designed to replace Google Classroom with advanced features including real-time student engagement monitoring, interactive quizzes, comprehensive attendance tracking, and seamless video class management.

Videos : https://www.youtube.com/watch?v=44cze2HiUXg, 
         https://drive.google.com/file/d/1EzHMsx9InIu8ZmWBII7oHxwfDYVXQJLA/view?usp=drivesdk

## 🌟 Key Features

### 📚 Core Educational Features
- **Modern Classroom Management**: Create and manage virtual classrooms with intuitive UI
- **Interactive Assignments**: Create, distribute, and grade assignments with rich media support
- **Student Enrollment**: Seamless student registration and classroom joining
- **Real-time Collaboration**: Discussion posts, comments, and peer interaction
- **Grade Management**: Comprehensive grading system with analytics

### 🎥 Video Class Management
- **Live Video Classes**: Integrated video conferencing for remote learning
- **Class Scheduling**: Advanced scheduling with timezone support
- **Recording & Playback**: Automatic class recording and playback functionality
- **Interactive Whiteboard**: Real-time collaborative whiteboard during classes
- **Screen Sharing**: Teacher and student screen sharing capabilities

### 📊 Advanced Attendance & Engagement
- **AI-Powered Engagement Monitoring**: Real-time student engagement analysis using computer vision
- **Smart Attendance Tracking**: Automatic attendance marking with join/leave detection
- **Engagement Analytics**: Detailed engagement reports with 6 classification categories:
  - Actively Looking (High engagement)
  - Confused (Medium engagement)
  - Talking to Peers (Medium engagement)
  - Distracted (Low engagement)
  - Bored (Very low engagement)
  - Drowsy (Very low engagement)
- **Attendance Statistics**: Comprehensive attendance analytics and reports

### 🧠 AI-Powered Assessment
- **Adaptive Quizzes**: Smart quiz generation with difficulty adjustment
- **Refresher System**: AI-powered topic refresher with personalized question generation
- **Daily Practice Problems (DPP)**: Automated daily problem sets
- **Real-time Quiz Analytics**: Live quiz performance monitoring
- **Batch Assessment**: Efficient bulk quiz submission and grading

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first design with seamless cross-device experience
- **Advanced Animations**: 120+ sophisticated scroll animations with Framer Motion
- **Spring Physics**: Natural, physics-based animations and interactions
- **Dark/Light Mode**: Comprehensive theme support
- **Accessibility**: WCAG compliant with screen reader support

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14.2.32 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI + shadcn/ui components
- **Animations**: Framer Motion with advanced spring physics
- **State Management**: Zustand for global state
- **Data Fetching**: TanStack React Query
- **Forms**: React Hook Form with validation
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt encryption
- **File Upload**: Multer with AWS S3 integration
- **Real-time**: Socket.IO for live features
- **Task Scheduling**: Node-cron for automated tasks
- **Email**: Nodemailer for notifications
- **Validation**: Joi for data validation

### AI/ML Services
- **Engagement Analysis**: TensorFlow/Keras CNN model
- **Computer Vision**: Python Flask API for real-time engagement detection
- **Deployment**: Render cloud platform for ML services
- **Image Processing**: Base64 encoding for privacy-compliant analysis

### DevOps & Infrastructure
- **Cloud Database**: MongoDB Atlas
- **File Storage**: AWS S3 for media files
- **Deployment**: Ready for Vercel (frontend) and Railway/Heroku (backend)
- **Environment**: Docker-ready configuration
- **Monitoring**: Health check endpoints and error tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)
- AWS S3 bucket (for file uploads)
- Python 3.8+ (for engagement analysis)

### 1. Clone the Repository
```bash
git clone https://github.com/r1cksync/edu-a.git
cd edu-a
```

### 2. Environment Setup

#### Backend Environment (.env)
```bash
# Navigate to backend directory
cd backend

# Create .env file
cp .env.example .env

# Edit .env with your configurations:
NODE_ENV=development
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name

# Email Configuration (Nodemailer)
EMAIL_FROM=your_email@domain.com
EMAIL_USER=your_smtp_username
EMAIL_PASS=your_smtp_password
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587

# Engagement API
ENGAGEMENT_API_URL=http://localhost:5000
```

#### Frontend Environment (.env.local)
```bash
# Navigate to frontend directory
cd ../frontend

# Create .env.local file
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 4. Database Setup
```bash
# The application will automatically create necessary collections
# Make sure your MongoDB Atlas cluster is running and accessible
```

### 5. AI Engagement Service Setup (Optional)
```bash
cd "online class attendence model and training ipynb/engagement-api-service"

# Install Python dependencies
pip install -r requirements.txt

# Start the engagement analysis service
python app.py
```

### 6. Start Development Servers

#### Start Backend Server
```bash
cd backend
npm run dev
# Server will run on http://localhost:3001
```

#### Start Frontend Server
```bash
cd frontend
npm run dev
# Application will run on http://localhost:3000
```

## 📁 Project Structure

```
edu-a/
├── frontend/                          # Next.js React frontend
│   ├── src/
│   │   ├── app/                      # Next.js app router pages
│   │   │   ├── auth/                 # Authentication pages
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   ├── quiz/                 # Quiz system
│   │   │   └── page.tsx              # Landing page with animations
│   │   ├── components/               # React components
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── classroom/            # Classroom management
│   │   │   ├── video-classes/        # Video conferencing
│   │   │   ├── attendance/           # Attendance tracking
│   │   │   ├── engagement/           # AI engagement monitoring
│   │   │   ├── quizzes/              # Quiz components
│   │   │   ├── refresher/            # AI refresher system
│   │   │   └── dpp/                  # Daily practice problems
│   │   ├── lib/                      # Utility libraries
│   │   │   ├── api.ts                # API client
│   │   │   └── utils.ts              # Helper functions
│   │   └── store/                    # Global state management
│   ├── public/                       # Static assets
│   └── package.json
├── backend/                          # Node.js Express backend
│   ├── src/
│   │   ├── controllers/              # Route controllers
│   │   │   ├── authController.js     # Authentication
│   │   │   ├── classroomController.js # Classroom management
│   │   │   ├── attendanceController.js # Attendance tracking
│   │   │   ├── engagementController.js # AI engagement analysis
│   │   │   └── quizController.js     # Quiz management
│   │   ├── models/                   # MongoDB schemas
│   │   │   ├── User.js               # User model
│   │   │   ├── Classroom.js          # Classroom model
│   │   │   ├── Attendance.js         # Attendance records
│   │   │   ├── EngagementAnalysis.js # Engagement data
│   │   │   └── Quiz.js               # Quiz model
│   │   ├── routes/                   # API route definitions
│   │   ├── middleware/               # Custom middleware
│   │   ├── services/                 # Business logic
│   │   └── utils/                    # Helper utilities
│   └── package.json
├── online class attendence model and training ipynb/
│   ├── engagement-api-service/       # Python Flask ML API
│   │   ├── app.py                    # Flask application
│   │   ├── Student_Engagement_Model.h5 # Trained TensorFlow model
│   │   ├── requirements.txt          # Python dependencies
│   │   ├── README.md                 # ML service documentation
│   │   └── DEPLOYMENT_GUIDE.md       # Deployment instructions
│   └── student-engagement-score.ipynb # Model training notebook
└── README.md                         # This file
```

## 🎯 Feature Walkthrough

### 1. Classroom Management
- Create virtual classrooms with custom descriptions
- Invite students via email or class codes
- Manage classroom settings and permissions
- Real-time classroom activity feeds

### 2. Video Classes
- Schedule and conduct live video classes
- Automatic attendance marking on join/leave
- Real-time engagement monitoring during classes
- Class recordings and playback

### 3. AI Engagement Monitoring
- Real-time facial expression analysis
- 6-category engagement classification
- Engagement score calculation (0-1 scale)
- Historical engagement analytics
- Privacy-compliant image processing

### 4. Assessment System
- Create quizzes with multiple question types
- AI-powered adaptive question generation
- Real-time quiz monitoring
- Automated grading and analytics
- Batch quiz submissions

### 5. Attendance Analytics
- Automatic attendance tracking
- Detailed attendance reports
- Student attendance statistics
- Classroom-wide attendance analytics

## 🚀 Deployment Guide

### Frontend Deployment (Vercel)
```bash
# Build the frontend
cd frontend
npm run build

# Deploy to Vercel
npm install -g vercel
vercel --prod
```

### Backend Deployment (Railway/Heroku)
```bash
# Prepare backend for deployment
cd backend

# Create Procfile for Heroku
echo "web: node src/server.js" > Procfile

# Deploy using Railway CLI or Heroku CLI
```

### AI Service Deployment (Render)
```bash
cd "online class attendence model and training ipynb/engagement-api-service"

# Follow the DEPLOYMENT_GUIDE.md for detailed Render deployment steps
```

### Environment Variables for Production
Make sure to set all environment variables in your deployment platform:
- MongoDB connection string
- JWT secrets
- AWS S3 credentials
- Email service credentials
- Engagement API URL

## 📊 Performance Features

### Optimization
- Server-side rendering with Next.js
- Image optimization and lazy loading
- Code splitting and dynamic imports
- Database query optimization
- CDN integration for static assets

### Scalability
- Horizontal scaling ready
- Database indexing for performance
- Caching strategies implemented
- Load balancer compatible
- Microservices architecture ready

## 🔒 Security Features

- JWT-based authentication
- Password encryption with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting
- SQL injection prevention
- XSS protection
- Privacy-compliant image processing

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:assignments   # Test assignment features
npm run test:health        # Health check tests
```

### Frontend Tests
```bash
cd frontend
npm run test               # Run component tests
npm run test:e2e          # Run end-to-end tests
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `GET /api/auth/profile` - Get user profile

### Classroom Endpoints
- `GET /api/classrooms` - Get user's classrooms
- `POST /api/classrooms` - Create new classroom
- `GET /api/classrooms/:id` - Get classroom details
- `POST /api/classrooms/:id/join` - Join classroom

### Engagement Analysis Endpoints
- `POST /api/engagement/analyze` - Analyze student engagement
- `GET /api/engagement/class/:id/history` - Get class engagement history
- `GET /api/engagement/student/:id/history` - Get student engagement history

### Quiz Endpoints
- `POST /api/quiz/create` - Create new quiz
- `GET /api/quiz/:id` - Get quiz details
- `POST /api/quiz/:id/submit` - Submit quiz answers

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Verify MongoDB Atlas credentials
   - Check network access settings
   - Ensure IP whitelisting is configured

2. **Engagement API Not Working**
   - Check if Python service is running
   - Verify TensorFlow model is loaded
   - Check API endpoint configuration

3. **File Upload Issues**
   - Verify AWS S3 credentials
   - Check bucket permissions
   - Ensure CORS is configured on S3

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: [your-email@domain.com]
- Documentation: See individual service README files

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- TensorFlow team for the ML framework
- Next.js team for the React framework
- MongoDB for the database platform
- All open source contributors

---

**Built with ❤️ for modern education**
