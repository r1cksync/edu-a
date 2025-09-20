const aiService = require('../services/aiService');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Configure multer for PDF uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * Generate MCQ questions using AI
 */
const generateMCQQuestions = async (req, res) => {
  try {
    const { topics, numberOfQuestions, difficulty } = req.body;
    const teacherId = req.user.id;

    // Validation
    if (!topics || typeof topics !== 'string' || topics.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topics are required and must be a non-empty string'
      });
    }

    if (!numberOfQuestions || numberOfQuestions < 1 || numberOfQuestions > 50) {
      return res.status(400).json({
        success: false,
        error: 'Number of questions must be between 1 and 50'
      });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    const selectedDifficulty = difficulty && validDifficulties.includes(difficulty.toLowerCase()) 
      ? difficulty.toLowerCase() 
      : 'medium';

    console.log(`Generating ${numberOfQuestions} MCQ questions for topics: "${topics}" with difficulty: ${selectedDifficulty}`);

    // Generate questions using AI
    const questions = await aiService.generateMCQQuestions(
      topics.trim(),
      parseInt(numberOfQuestions),
      selectedDifficulty
    );

    res.json({
      success: true,
      data: {
        questions,
        metadata: {
          topics: topics.trim(),
          numberOfQuestions: questions.length,
          difficulty: selectedDifficulty,
          generatedAt: new Date().toISOString(),
          generatedBy: teacherId
        }
      }
    });

  } catch (error) {
    console.error('Error generating MCQ questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate MCQ questions'
    });
  }
};

/**
 * Preview generated questions (future enhancement)
 */
const previewQuestions = async (req, res) => {
  try {
    // This could be used for saving draft questions before creating DPP
    const { questions, metadata } = req.body;
    
    // Validate questions format
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Questions array is required'
      });
    }

    // Return preview data (could save to temporary storage in future)
    res.json({
      success: true,
      preview: {
        questions,
        metadata,
        totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        estimatedDuration: questions.length * 2 // 2 minutes per question estimate
      }
    });

  } catch (error) {
    console.error('Error previewing questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview questions'
    });
  }
};

/**
 * Test Groq API connection
 */
const testGroqConnection = async (req, res) => {
  try {
    const testResponse = await aiService.generateMCQQuestions('test topic', 1, 'easy');
    
    res.json({
      success: true,
      message: 'Groq API connection successful',
      testQuestion: testResponse[0]
    });
  } catch (error) {
    console.error('Groq API test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Groq API connection failed'
    });
  }
};

/**
 * Generate MCQ questions from PDF content
 */
const generateMCQQuestionsFromPDF = async (req, res) => {
  try {
    const { numberOfQuestions, difficulty } = req.body;
    const teacherId = req.user.id;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF file is required'
      });
    }

    // Validation
    if (!numberOfQuestions || numberOfQuestions < 1 || numberOfQuestions > 50) {
      return res.status(400).json({
        success: false,
        error: 'Number of questions must be between 1 and 50'
      });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    const selectedDifficulty = difficulty && validDifficulties.includes(difficulty.toLowerCase()) 
      ? difficulty.toLowerCase() 
      : 'medium';

    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from the PDF file'
      });
    }

    console.log(`Extracted ${pdfText.length} characters from PDF`);

    // Generate questions using AI service
    console.log('Generating MCQ questions from PDF content...');
    const questions = await aiService.generateMCQQuestionsFromPDF(
      pdfText, 
      numberOfQuestions, 
      selectedDifficulty
    );

    if (!questions || questions.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate questions from PDF content'
      });
    }

    console.log(`Successfully generated ${questions.length} questions from PDF`);
    
    res.json({
      success: true,
      data: {
        questions,
        metadata: {
          totalQuestions: questions.length,
          difficulty: selectedDifficulty,
          source: 'pdf',
          extractedTextLength: pdfText.length,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error generating questions from PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while generating questions from PDF'
    });
  }
};

module.exports = {
  generateMCQQuestions,
  generateMCQQuestionsFromPDF,
  previewQuestions,
  testGroqConnection,
  upload
};