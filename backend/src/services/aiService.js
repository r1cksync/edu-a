const axios = require('axios');

class AIService {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqBaseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    
    if (!this.groqApiKey) {
      throw new Error('GROQ_API_KEY is required');
    }
  }

  async generateMCQQuestions(topics, numberOfQuestions, difficulty = 'medium') {
    // List of available models to try in order of preference
    const models = [
      'llama-3.1-8b-instant',
      'llama3-groq-70b-8192-tool-use-preview',
      'llama3-groq-8b-8192-tool-use-preview'
    ];

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        const prompt = this.createMCQPrompt(topics, numberOfQuestions, difficulty);
        
        const response = await axios.post(
          `${this.groqBaseUrl}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert educator. Create multiple choice questions in valid JSON format only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1500
          },
          {
            headers: {
              'Authorization': `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const aiResponse = response.data.choices[0].message.content;
        console.log(`Successfully generated with model: ${model}`);
        return this.parseAIResponse(aiResponse, numberOfQuestions);
        
      } catch (error) {
        console.error(`Error with model ${model}:`, error.response?.data || error.message);
        
        // If this is the last model, try fallback generation
        if (model === models[models.length - 1]) {
          console.log('All AI models failed, trying fallback generation...');
          return this.generateFallbackQuestions(topics, numberOfQuestions, difficulty);
        }
        
        // Otherwise, try the next model
        continue;
      }
    }
  }

  async generateMCQQuestionsFromPDF(pdfContent, numberOfQuestions, difficulty = 'medium') {
    // List of available models to try in order of preference
    const models = [
      'llama-3.1-8b-instant',
      'llama3-groq-70b-8192-tool-use-preview',
      'llama3-groq-8b-8192-tool-use-preview'
    ];

    for (const model of models) {
      try {
        console.log(`Trying model: ${model} for PDF content`);
        const prompt = this.createPDFMCQPrompt(pdfContent, numberOfQuestions, difficulty);
        
        const response = await axios.post(
          `${this.groqBaseUrl}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert educator. Create multiple choice questions based on the provided document content in valid JSON format only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          },
          {
            headers: {
              'Authorization': `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const aiResponse = response.data.choices[0].message.content;
        console.log(`Successfully generated from PDF with model: ${model}`);
        return this.parseAIResponse(aiResponse, numberOfQuestions);
        
      } catch (error) {
        console.error(`Error with model ${model} for PDF:`, error.response?.data || error.message);
        
        // If this is the last model, try fallback generation
        if (model === models[models.length - 1]) {
          console.log('All AI models failed for PDF, trying fallback generation...');
          return this.generateFallbackQuestions('document content', numberOfQuestions, difficulty);
        }
        
        // Otherwise, try the next model
        continue;
      }
    }
  }

  createMCQPrompt(topics, numberOfQuestions, difficulty) {
    return `Create ${numberOfQuestions} multiple choice questions about "${topics}".

Format: Return valid JSON only, no extra text.

{
  "questions": [
    {
      "question": "What is the main concept in number theory?",
      "options": [
        {"text": "Properties of integers", "isCorrect": true},
        {"text": "Geometry shapes", "isCorrect": false},
        {"text": "Calculus derivatives", "isCorrect": false},
        {"text": "Matrix operations", "isCorrect": false}
      ],
      "explanation": "Number theory studies properties of integers",
      "difficulty": "${difficulty}",
      "marks": ${this.getDefaultMarks(difficulty)}
    }
  ]
}

Requirements:
- Difficulty: ${difficulty}
- Exactly 4 options per question
- Only one correct answer
- Educational and clear questions
- Topics: ${topics}

Generate exactly ${numberOfQuestions} questions now:`;
  }

  createPDFMCQPrompt(pdfContent, numberOfQuestions, difficulty) {
    // Truncate PDF content if it's too long to fit in the prompt
    const maxContentLength = 3000;
    const truncatedContent = pdfContent.length > maxContentLength 
      ? pdfContent.substring(0, maxContentLength) + "..."
      : pdfContent;

    return `Based on the following document content, create ${numberOfQuestions} multiple choice questions.

DOCUMENT CONTENT:
${truncatedContent}

Format: Return valid JSON only, no extra text.

{
  "questions": [
    {
      "question": "Based on the document, what is the main concept discussed?",
      "options": [
        {"text": "Correct answer from document", "isCorrect": true},
        {"text": "Plausible but incorrect option", "isCorrect": false},
        {"text": "Another incorrect option", "isCorrect": false},
        {"text": "Fourth incorrect option", "isCorrect": false}
      ],
      "explanation": "Brief explanation referencing the document",
      "difficulty": "${difficulty}",
      "marks": ${this.getDefaultMarks(difficulty)}
    }
  ]
}

Requirements:
- Difficulty: ${difficulty}
- Exactly 4 options per question
- Only one correct answer
- Questions must be based on the document content provided
- Create educational and clear questions
- Include brief explanations that reference the document

Generate exactly ${numberOfQuestions} questions now:`;
  }

  getDefaultMarks(difficulty) {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 1;
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      default:
        return 2;
    }
  }

  parseAIResponse(aiResponse, expectedQuestions) {
    try {
      console.log('Raw AI Response:', aiResponse);
      
      // Clean the response in case there's extra text
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*|\s*```/g, '');
      
      // Replace smart quotes and other problematic characters
      cleanedResponse = cleanedResponse
        .replace(/[""]/g, '"')  // Replace smart quotes with regular quotes
        .replace(/['']/g, "'")  // Replace smart apostrophes
        .replace(/…/g, '...')   // Replace ellipsis
        .replace(/–/g, '-')     // Replace en dash
        .replace(/—/g, '--');   // Replace em dash
      
      // Find JSON object in the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      console.log('Cleaned Response:', cleanedResponse);

      const parsed = JSON.parse(cleanedResponse);
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: questions array not found');
      }

      // Validate each question
      const validatedQuestions = parsed.questions.slice(0, expectedQuestions).map((q, index) => {
        if (!q.question || !q.options || !Array.isArray(q.options)) {
          throw new Error(`Invalid question format at index ${index}`);
        }

        if (q.options.length !== 4) {
          // If not 4 options, pad with dummy options or fix
          while (q.options.length < 4) {
            q.options.push({ text: `Option ${q.options.length + 1}`, isCorrect: false });
          }
          q.options = q.options.slice(0, 4); // Ensure exactly 4 options
        }

        const correctOptions = q.options.filter(opt => opt.isCorrect);
        if (correctOptions.length !== 1) {
          // Fix by making the first option correct if none or multiple are marked
          q.options.forEach((opt, i) => {
            opt.isCorrect = i === 0;
          });
        }

        return {
          question: q.question.trim(),
          options: q.options.map(opt => ({
            text: opt.text.trim(),
            isCorrect: Boolean(opt.isCorrect)
          })),
          explanation: q.explanation?.trim() || `Explanation for: ${q.question.trim()}`,
          difficulty: q.difficulty || difficulty,
          marks: q.marks || this.getDefaultMarks(q.difficulty || difficulty)
        };
      });

      console.log('Validated Questions:', validatedQuestions.length);
      return validatedQuestions;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Response was:', aiResponse);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  generateFallbackQuestions(topics, numberOfQuestions, difficulty) {
    console.log('Generating fallback questions...');
    
    // Generate basic template questions when AI fails
    const questions = [];
    const marks = this.getDefaultMarks(difficulty);
    
    for (let i = 0; i < numberOfQuestions; i++) {
      questions.push({
        question: `Question ${i + 1}: What is an important concept related to ${topics}?`,
        options: [
          { text: `Core concept ${i + 1} of ${topics}`, isCorrect: true },
          { text: `Alternative concept A`, isCorrect: false },
          { text: `Alternative concept B`, isCorrect: false },
          { text: `Alternative concept C`, isCorrect: false }
        ],
        explanation: `This question covers fundamental aspects of ${topics}`,
        difficulty: difficulty,
        marks: marks
      });
    }
    
    return questions;
  }

  async generateSubjectiveQuestions(topics, numberOfQuestions, difficulty = 'medium') {
    // Placeholder for future subjective question generation
    throw new Error('Subjective question generation not yet implemented');
  }
}

module.exports = new AIService();