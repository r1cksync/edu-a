const Joi = require('joi');
const { validationResult } = require('express-validator');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        message: 'Validation Error',
        errors
      });
    }
    
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('student', 'teacher').required(),
    studentId: Joi.when('role', {
      is: 'student',
      then: Joi.string().optional(),
      otherwise: Joi.forbidden()
    }),
    teacherId: Joi.when('role', {
      is: 'teacher',
      then: Joi.string().optional(),
      otherwise: Joi.forbidden()
    }),
    department: Joi.string().max(100).optional(),
    phone: Joi.string().optional(),
    dateOfBirth: Joi.date().optional(),
    address: Joi.string().max(500).optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createClassroom: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    subject: Joi.string().min(1).required(),
    allowStudentPosts: Joi.boolean().optional(),
    allowStudentComments: Joi.boolean().optional()
  }),

  joinClassroom: Joi.object({
    classCode: Joi.string().length(6).required().uppercase()
  }),

  createAssignment: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().required(),
    type: Joi.string().valid('assignment', 'quiz', 'test', 'mcq', 'file').optional(),
    totalPoints: Joi.number().min(1).optional(),
    dueDate: Joi.date().required(),
    allowLateSubmission: Joi.boolean().optional(),
    targetLevels: Joi.array().items(Joi.string().valid('beginner', 'intermediate', 'advanced')).optional(),
    instructions: Joi.string().optional(),
    questions: Joi.array().items(Joi.object({
      question: Joi.string().required(),
      type: Joi.string().valid('multiple-choice', 'short-answer', 'essay', 'true-false').required(),
      options: Joi.array().items(Joi.string()).optional(),
      correctAnswer: Joi.string().optional(),
      points: Joi.number().min(0).optional(),
      explanation: Joi.string().optional()
    })).optional(),
    timeLimit: Joi.number().min(1).optional()
  }),

  createPost: Joi.object({
    type: Joi.string().valid('announcement', 'material', 'assignment', 'general').optional(),
    title: Joi.string().max(200).optional(),
    content: Joi.string().required(),
    allowComments: Joi.boolean().optional(),
    visibility: Joi.string().valid('all', 'teachers', 'students').optional(),
    targetLevels: Joi.array().items(Joi.string().valid('beginner', 'intermediate', 'advanced')).optional()
  }),

  createComment: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    parentComment: Joi.string().optional()
  })
};

// Express-validator middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateRequest,
  schemas,
  validate
};