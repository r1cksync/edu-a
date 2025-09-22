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

  /**
   * Generate MCQ questions for refresher sessions based on analysis
   * @param {Object} analysisData - Analysis from analysisService
   * @param {number} numberOfQuestions - Number of questions to generate
   * @param {string} difficulty - Difficulty level
   * @returns {Array} Generated questions with topic metadata
   */
  async generateRefresherQuestions(analysisData, numberOfQuestions, difficulty = 'medium') {
    const models = [
      'llama-3.1-8b-instant',
      'llama3-groq-70b-8192-tool-use-preview',
      'llama3-groq-8b-8192-tool-use-preview'
    ];

    for (const model of models) {
      try {
        console.log(`Trying model: ${model} for refresher questions`);
        const prompt = this.createRefresherPrompt(analysisData, numberOfQuestions, difficulty);
        
        const response = await axios.post(
          `${this.groqBaseUrl}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert tutor creating personalized practice questions to help students improve in their weak areas. Focus on reinforcing understanding and addressing misconceptions.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8, // Slightly higher temperature for variety
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
        console.log(`Successfully generated refresher questions with model: ${model}`);
        
        const questions = this.parseAIResponse(aiResponse, numberOfQuestions);
        
        // Add topic metadata to questions for tracking
        return questions.map(q => ({
          ...q,
          sourceTopics: analysisData.topicAnalysis.slice(0, 3).map(t => t.topic),
          generatedFrom: 'initial_analysis'
        }));
        
      } catch (error) {
        console.error(`Error with model ${model} for refresher:`, error.response?.data || error.message);
        
        if (model === models[models.length - 1]) {
          console.log('All AI models failed for refresher, trying fallback generation...');
          return this.generateFallbackRefresherQuestions(analysisData, numberOfQuestions, difficulty);
        }
        
        continue;
      }
    }
  }

  /**
   * Generate dynamic follow-up questions based on current batch incorrect answers
   * @param {Object} followupAnalysis - Analysis from current batch
   * @param {number} numberOfQuestions - Number of questions to generate
   * @param {string} difficulty - Difficulty level
   * @returns {Array} Generated follow-up questions
   */
  async generateDynamicFollowupQuestions(followupAnalysis, numberOfQuestions, difficulty = 'medium') {
    const models = [
      'llama-3.1-8b-instant',
      'llama3-groq-70b-8192-tool-use-preview',
      'llama3-groq-8b-8192-tool-use-preview'
    ];

    for (const model of models) {
      try {
        console.log(`Trying model: ${model} for dynamic follow-up questions`);
        const prompt = this.createDynamicFollowupPrompt(followupAnalysis, numberOfQuestions, difficulty);
        
        const response = await axios.post(
          `${this.groqBaseUrl}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are an adaptive tutor creating follow-up questions to address specific mistakes and reinforce learning. Focus on similar concepts with different approaches.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.9, // Higher temperature for more varied follow-up questions
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
        console.log(`Successfully generated dynamic follow-up questions with model: ${model}`);
        
        const questions = this.parseAIResponse(aiResponse, numberOfQuestions);
        
        // Add metadata for dynamic questions
        return questions.map(q => ({
          ...q,
          sourceTopics: followupAnalysis.focusedTopics,
          generatedFrom: 'dynamic_followup'
        }));
        
      } catch (error) {
        console.error(`Error with model ${model} for dynamic follow-up:`, error.response?.data || error.message);
        
        if (model === models[models.length - 1]) {
          console.log('All AI models failed for dynamic follow-up, trying fallback generation...');
          return this.generateFallbackDynamicQuestions(followupAnalysis, numberOfQuestions, difficulty);
        }
        
        continue;
      }
    }
  }

  /**
   * Create prompt for initial refresher questions based on analysis
   * @param {Object} analysisData - Analysis results
   * @param {number} numberOfQuestions - Number of questions
   * @param {string} difficulty - Difficulty level
   * @returns {string} Generation prompt
   */
  createRefresherPrompt(analysisData, numberOfQuestions, difficulty) {
    const primaryTopics = analysisData.topicAnalysis.slice(0, 3);
    const sampleErrors = analysisData.incorrectAnswers.slice(0, 3);
    
    let prompt = `Create ${numberOfQuestions} practice MCQ questions for a student who needs reinforcement in these areas:\n\n`;
    
    prompt += `PRIMARY WEAK AREAS:\n`;
    primaryTopics.forEach((topic, index) => {
      prompt += `${index + 1}. ${topic.topic} (${topic.frequency} mistakes)\n`;
      if (topic.concepts.length > 0) {
        prompt += `   Specific concepts: ${topic.concepts.join(', ')}\n`;
      }
    });
    
    prompt += `\nSTUDENT'S RECENT MISTAKES:\n`;
    sampleErrors.forEach((error, index) => {
      prompt += `${index + 1}. ${error.question.substring(0, 100)}...\n`;
      prompt += `   Student answered: "${error.studentAnswer}"\n`;
      prompt += `   Correct answer: "${error.correctAnswer}"\n\n`;
    });
    
    prompt += `\nCREATE QUESTIONS THAT:\n`;
    prompt += `- Focus on the same concepts but with different scenarios\n`;
    prompt += `- Help identify and correct the misconceptions shown\n`;
    prompt += `- Build understanding progressively\n`;
    prompt += `- Include explanations that connect to the original concepts\n\n`;
    
    prompt += `Format: Return valid JSON only, no extra text.\n\n`;
    prompt += `{\n`;
    prompt += `  "questions": [\n`;
    prompt += `    {\n`;
    prompt += `      "question": "Clear question about the weak concepts",\n`;
    prompt += `      "options": [\n`;
    prompt += `        {"text": "Correct answer addressing misconception", "isCorrect": true},\n`;
    prompt += `        {"text": "Common mistake similar to student's error", "isCorrect": false},\n`;
    prompt += `        {"text": "Another plausible but incorrect option", "isCorrect": false},\n`;
    prompt += `        {"text": "Fourth incorrect option", "isCorrect": false}\n`;
    prompt += `      ],\n`;
    prompt += `      "explanation": "Clear explanation addressing the misconception",\n`;
    prompt += `      "difficulty": "${difficulty}",\n`;
    prompt += `      "marks": ${this.getDefaultMarks(difficulty)}\n`;
    prompt += `    }\n`;
    prompt += `  ]\n`;
    prompt += `}\n\n`;
    
    prompt += `Requirements:\n`;
    prompt += `- Difficulty: ${difficulty}\n`;
    prompt += `- Exactly 4 options per question\n`;
    prompt += `- Only one correct answer\n`;
    prompt += `- Focus on topics: ${primaryTopics.map(t => t.topic).join(', ')}\n\n`;
    
    prompt += `Generate exactly ${numberOfQuestions} questions now:`;
    
    return prompt;
  }

  /**
   * Create prompt for dynamic follow-up questions
   * @param {Object} followupAnalysis - Analysis of current batch
   * @param {number} numberOfQuestions - Number of questions
   * @param {string} difficulty - Difficulty level
   * @returns {string} Generation prompt
   */
  createDynamicFollowupPrompt(followupAnalysis, numberOfQuestions, difficulty) {
    let prompt = `The student just completed a quiz and made mistakes. Create ${numberOfQuestions} follow-up questions to help them practice:\n\n`;
    
    prompt += `FOCUS AREAS: ${followupAnalysis.focusedTopics.join(', ')}\n\n`;
    
    prompt += `RECENT MISTAKES:\n`;
    prompt += followupAnalysis.followupPrompt;
    prompt += `\n\n`;
    
    prompt += `CREATE FOLLOW-UP QUESTIONS THAT:\n`;
    prompt += `- Use the same concepts but different examples\n`;
    prompt += `- Help the student recognize patterns in their mistakes\n`;
    prompt += `- Gradually build confidence\n`;
    prompt += `- Are slightly easier than the original questions to reinforce learning\n\n`;
    
    prompt += `Format: Return valid JSON only, no extra text.\n\n`;
    prompt += `{\n`;
    prompt += `  "questions": [\n`;
    prompt += `    {\n`;
    prompt += `      "question": "Question reinforcing the same concept",\n`;
    prompt += `      "options": [\n`;
    prompt += `        {"text": "Correct answer", "isCorrect": true},\n`;
    prompt += `        {"text": "Similar mistake to what student made", "isCorrect": false},\n`;
    prompt += `        {"text": "Another incorrect option", "isCorrect": false},\n`;
    prompt += `        {"text": "Fourth incorrect option", "isCorrect": false}\n`;
    prompt += `      ],\n`;
    prompt += `      "explanation": "Explanation connecting to the original concept",\n`;
    prompt += `      "difficulty": "${difficulty}",\n`;
    prompt += `      "marks": ${this.getDefaultMarks(difficulty)}\n`;
    prompt += `    }\n`;
    prompt += `  ]\n`;
    prompt += `}\n\n`;
    
    prompt += `Requirements:\n`;
    prompt += `- Difficulty: ${difficulty}\n`;
    prompt += `- Exactly 4 options per question\n`;
    prompt += `- Only one correct answer\n`;
    prompt += `- Build on the student's mistakes to reinforce learning\n\n`;
    
    prompt += `Generate exactly ${numberOfQuestions} questions now:`;
    
    return prompt;
  }

  /**
   * Generate fallback refresher questions when AI fails
   * @param {Object} analysisData - Analysis results
   * @param {number} numberOfQuestions - Number of questions
   * @param {string} difficulty - Difficulty level
   * @returns {Array} Fallback questions
   */
  generateFallbackRefresherQuestions(analysisData, numberOfQuestions, difficulty) {
    console.log('Generating fallback refresher questions...');
    
    const questions = [];
    const marks = this.getDefaultMarks(difficulty);
    const topics = analysisData.topicAnalysis.slice(0, 3).map(t => t.topic);
    
    for (let i = 0; i < numberOfQuestions; i++) {
      const topic = topics[i % topics.length] || 'General Knowledge';
      questions.push({
        question: `Practice Question ${i + 1}: What is a key concept in ${topic}?`,
        options: [
          { text: `Fundamental principle of ${topic}`, isCorrect: true },
          { text: `Common misconception about ${topic}`, isCorrect: false },
          { text: `Related but different concept`, isCorrect: false },
          { text: `Unrelated concept`, isCorrect: false }
        ],
        explanation: `This question helps reinforce understanding of ${topic} concepts`,
        difficulty: difficulty,
        marks: marks,
        sourceTopics: [topic],
        generatedFrom: 'initial_analysis'
      });
    }
    
    return questions;
  }

  /**
   * Generate fallback dynamic questions when AI fails
   * @param {Object} followupAnalysis - Analysis of current batch
   * @param {number} numberOfQuestions - Number of questions
   * @param {string} difficulty - Difficulty level
   * @returns {Array} Fallback questions
   */
  generateFallbackDynamicQuestions(followupAnalysis, numberOfQuestions, difficulty) {
    console.log('Generating fallback dynamic questions...');
    
    const questions = [];
    const marks = this.getDefaultMarks(difficulty);
    const topics = followupAnalysis.focusedTopics;
    
    for (let i = 0; i < numberOfQuestions; i++) {
      const topic = topics[i % topics.length] || 'General Knowledge';
      questions.push({
        question: `Follow-up Question ${i + 1}: Which statement about ${topic} is correct?`,
        options: [
          { text: `Correct statement about ${topic}`, isCorrect: true },
          { text: `Common error about ${topic}`, isCorrect: false },
          { text: `Partially correct but incomplete`, isCorrect: false },
          { text: `Completely incorrect statement`, isCorrect: false }
        ],
        explanation: `This follow-up question reinforces correct understanding of ${topic}`,
        difficulty: difficulty,
        marks: marks,
        sourceTopics: [topic],
        generatedFrom: 'dynamic_followup'
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