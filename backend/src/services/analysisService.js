const DailyPracticeProblem = require('../models/DailyPracticeProblem');

class AnalysisService {
  /**
   * Analyze student's incorrect answers from a DPP submission
   * @param {string} studentId - Student's user ID
   * @param {string} submissionId - DPP submission ID
   * @returns {Object} Analysis result with incorrect topics and concepts
   */
  async analyzeIncorrectAnswers(studentId, submissionId) {
    try {
      // Get the DPP with the specific submission
      const dpp = await DailyPracticeProblem.findOne({
        'submissions._id': submissionId
      })
      .populate('submissions.student', 'name email');

      if (!dpp) {
        throw new Error('DPP submission not found');
      }

      // Find the specific submission within the DPP
      const submission = dpp.submissions.id(submissionId);
      
      if (!submission) {
        throw new Error('DPP submission not found');
      }

      if (submission.student._id.toString() !== studentId) {
        throw new Error('Submission does not belong to this student');
      }

      const incorrectAnswers = [];
      const topicFrequency = new Map();
      const conceptMap = new Map();

      // Analyze each answer
      submission.answers.forEach((answer, index) => {
        const question = dpp.questions[index];
        if (!question) return;

        const correctOption = question.options.find(opt => opt.isCorrect);
        const studentOption = question.options[answer.selectedOption];
        
        // If answer is incorrect
        if (!studentOption || !studentOption.isCorrect) {
          const incorrectAnswer = {
            questionIndex: index,
            question: question.question,
            correctAnswer: correctOption?.text,
            studentAnswer: studentOption?.text || 'No answer',
            explanation: question.explanation || '',
            difficulty: question.difficulty || 'medium',
            marks: question.marks || 2,
            timeSpent: answer.timeSpent || 0
          };

          incorrectAnswers.push(incorrectAnswer);

          // Extract topics and concepts from the question
          const extractedTopics = this.extractTopicsFromQuestion(question);
          extractedTopics.forEach(topic => {
            topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
            
            // Extract concepts within each topic
            const concepts = this.extractConceptsFromQuestion(question, topic);
            if (concepts.length > 0) {
              conceptMap.set(topic, [...(conceptMap.get(topic) || []), ...concepts]);
            }
          });
        }
      });

      // Create topic analysis for AI generation
      const topicAnalysis = Array.from(topicFrequency.entries())
        .map(([topic, frequency]) => ({
          topic,
          frequency,
          concepts: [...new Set(conceptMap.get(topic) || [])], // Remove duplicates
          priority: this.calculateTopicPriority(frequency, incorrectAnswers.length)
        }))
        .sort((a, b) => b.priority - a.priority); // Sort by priority

      return {
        submission: {
          id: submission._id,
          dppTitle: dpp.title,
          studentName: submission.student.name,
          totalQuestions: dpp.questions.length,
          incorrectCount: incorrectAnswers.length,
          accuracy: ((dpp.questions.length - incorrectAnswers.length) / dpp.questions.length) * 100
        },
        incorrectAnswers,
        topicAnalysis,
        improvementAreas: this.identifyImprovementAreas(incorrectAnswers, topicAnalysis),
        generationPrompt: this.createGenerationPrompt(topicAnalysis, incorrectAnswers)
      };

    } catch (error) {
      console.error('Error analyzing incorrect answers:', error);
      throw error;
    }
  }

  /**
   * Extract topics from a question using keywords and context
   * @param {Object} question - Question object
   * @returns {Array} Array of extracted topics
   */
  extractTopicsFromQuestion(question) {
    const topics = new Set();
    const text = `${question.question} ${question.explanation || ''}`.toLowerCase();

    // Define topic keywords mapping
    const topicKeywords = {
      'Mathematics': ['math', 'equation', 'formula', 'calculate', 'solve', 'number', 'algebra', 'geometry', 'calculus', 'arithmetic'],
      'Physics': ['physics', 'force', 'energy', 'motion', 'wave', 'electricity', 'magnetism', 'optics', 'mechanics', 'thermodynamics'],
      'Chemistry': ['chemistry', 'chemical', 'reaction', 'molecule', 'atom', 'element', 'compound', 'solution', 'acid', 'base'],
      'Biology': ['biology', 'cell', 'organism', 'genetics', 'evolution', 'ecosystem', 'photosynthesis', 'respiration', 'DNA', 'protein'],
      'Computer Science': ['programming', 'algorithm', 'data structure', 'computer', 'software', 'code', 'function', 'variable', 'loop'],
      'History': ['history', 'historical', 'ancient', 'medieval', 'modern', 'war', 'civilization', 'empire', 'revolution'],
      'Geography': ['geography', 'geographical', 'climate', 'continent', 'country', 'river', 'mountain', 'ocean', 'population'],
      'English': ['grammar', 'literature', 'poem', 'novel', 'author', 'metaphor', 'sentence', 'paragraph', 'writing'],
      'General Knowledge': ['general', 'world', 'current affairs', 'news', 'famous', 'important', 'significant']
    };

    // Check for topic keywords
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.add(topic);
      }
    }

    // If no specific topic found, classify as general knowledge
    if (topics.size === 0) {
      topics.add('General Knowledge');
    }

    return Array.from(topics);
  }

  /**
   * Extract specific concepts within a topic from question
   * @param {Object} question - Question object
   * @param {string} topic - Topic to extract concepts for
   * @returns {Array} Array of extracted concepts
   */
  extractConceptsFromQuestion(question, topic) {
    const concepts = [];
    const text = `${question.question} ${question.explanation || ''}`.toLowerCase();

    // Define concept keywords for each topic
    const conceptKeywords = {
      'Mathematics': {
        'Algebra': ['variable', 'equation', 'linear', 'quadratic', 'polynomial'],
        'Geometry': ['triangle', 'circle', 'square', 'angle', 'area', 'perimeter'],
        'Calculus': ['derivative', 'integral', 'limit', 'differentiation', 'integration'],
        'Statistics': ['mean', 'median', 'mode', 'probability', 'distribution']
      },
      'Physics': {
        'Mechanics': ['force', 'velocity', 'acceleration', 'momentum', 'motion'],
        'Thermodynamics': ['heat', 'temperature', 'energy', 'entropy', 'gas'],
        'Electromagnetism': ['electric', 'magnetic', 'current', 'voltage', 'field'],
        'Optics': ['light', 'reflection', 'refraction', 'lens', 'mirror']
      },
      'Chemistry': {
        'Organic Chemistry': ['carbon', 'hydrocarbon', 'alcohol', 'acid', 'ester'],
        'Inorganic Chemistry': ['metal', 'ion', 'salt', 'oxidation', 'reduction'],
        'Physical Chemistry': ['reaction rate', 'equilibrium', 'thermochemistry', 'kinetics']
      },
      'Biology': {
        'Cell Biology': ['cell', 'nucleus', 'mitochondria', 'membrane', 'organelle'],
        'Genetics': ['gene', 'DNA', 'chromosome', 'heredity', 'mutation'],
        'Ecology': ['ecosystem', 'food chain', 'biodiversity', 'environment']
      }
    };

    if (conceptKeywords[topic]) {
      for (const [concept, keywords] of Object.entries(conceptKeywords[topic])) {
        if (keywords.some(keyword => text.includes(keyword))) {
          concepts.push(concept);
        }
      }
    }

    return concepts;
  }

  /**
   * Calculate priority for topic based on frequency and difficulty
   * @param {number} frequency - How many times topic appeared in incorrect answers
   * @param {number} totalIncorrect - Total number of incorrect answers
   * @returns {number} Priority score
   */
  calculateTopicPriority(frequency, totalIncorrect) {
    const frequencyScore = (frequency / totalIncorrect) * 100;
    const difficultyMultiplier = 1.2; // Can be adjusted based on difficulty
    return frequencyScore * difficultyMultiplier;
  }

  /**
   * Identify specific improvement areas based on analysis
   * @param {Array} incorrectAnswers - Array of incorrect answers
   * @param {Array} topicAnalysis - Topic analysis results
   * @returns {Array} Array of improvement areas
   */
  identifyImprovementAreas(incorrectAnswers, topicAnalysis) {
    const areas = [];

    // High frequency topics need attention
    topicAnalysis.forEach(topic => {
      if (topic.frequency >= 2) {
        areas.push({
          area: `${topic.topic} fundamentals`,
          reason: `Multiple incorrect answers (${topic.frequency}) in this topic`,
          concepts: topic.concepts,
          priority: 'high'
        });
      }
    });

    // Difficulty-based analysis
    const hardQuestions = incorrectAnswers.filter(ans => ans.difficulty === 'hard');
    if (hardQuestions.length > 0) {
      areas.push({
        area: 'Advanced problem solving',
        reason: `Difficulty with ${hardQuestions.length} hard-level questions`,
        concepts: [],
        priority: 'medium'
      });
    }

    return areas;
  }

  /**
   * Create a generation prompt for AI based on analysis
   * @param {Array} topicAnalysis - Topic analysis results
   * @param {Array} incorrectAnswers - Array of incorrect answers
   * @returns {string} Generation prompt for AI
   */
  createGenerationPrompt(topicAnalysis, incorrectAnswers) {
    const primaryTopics = topicAnalysis.slice(0, 3).map(t => t.topic);
    const keyConcepts = topicAnalysis.flatMap(t => t.concepts).slice(0, 5);
    
    let prompt = `Generate MCQ questions for a student who needs practice in:\n\n`;
    prompt += `Primary Topics: ${primaryTopics.join(', ')}\n`;
    
    if (keyConcepts.length > 0) {
      prompt += `Key Concepts: ${keyConcepts.join(', ')}\n`;
    }
    
    prompt += `\nThe student struggled with:\n`;
    incorrectAnswers.slice(0, 3).forEach((ans, index) => {
      prompt += `${index + 1}. ${ans.question.substring(0, 100)}...\n`;
    });
    
    prompt += `\nFocus on creating questions that reinforce understanding of these concepts with clear explanations.`;
    
    return prompt;
  }

  /**
   * Analyze incorrect answers from current refresher batch for dynamic follow-up
   * @param {Array} incorrectAnswers - Incorrect answers from current batch
   * @returns {Object} Analysis for generating follow-up questions
   */
  analyzeDynamicFollowup(incorrectAnswers) {
    const topicFrequency = new Map();
    const conceptMap = new Map();
    const difficultyLevels = new Map();

    incorrectAnswers.forEach(answer => {
      // Extract topics from incorrect answers
      const topics = answer.sourceTopics || ['General Knowledge'];
      topics.forEach(topic => {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
      });

      // Track difficulty levels
      const difficulty = answer.difficulty || 'medium';
      difficultyLevels.set(difficulty, (difficultyLevels.get(difficulty) || 0) + 1);
    });

    // Create focused prompt for follow-up questions
    const focusedTopics = Array.from(topicFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([topic]) => topic);

    return {
      focusedTopics,
      suggestedDifficulty: this.determineDifficulty(difficultyLevels),
      followupPrompt: this.createFollowupPrompt(focusedTopics, incorrectAnswers)
    };
  }

  /**
   * Determine appropriate difficulty for follow-up questions
   * @param {Map} difficultyLevels - Map of difficulty levels and their frequencies
   * @returns {string} Suggested difficulty level
   */
  determineDifficulty(difficultyLevels) {
    const totalErrors = Array.from(difficultyLevels.values()).reduce((sum, count) => sum + count, 0);
    const hardErrors = difficultyLevels.get('hard') || 0;
    const mediumErrors = difficultyLevels.get('medium') || 0;

    // If mostly hard questions were wrong, provide medium difficulty follow-up
    if (hardErrors / totalErrors > 0.6) {
      return 'medium';
    }
    // If mostly medium questions were wrong, provide easy-medium follow-up
    if (mediumErrors / totalErrors > 0.6) {
      return 'easy';
    }
    // Default to same difficulty
    return 'medium';
  }

  /**
   * Create follow-up prompt for dynamic question generation
   * @param {Array} focusedTopics - Topics to focus on
   * @param {Array} incorrectAnswers - Recent incorrect answers
   * @returns {string} Follow-up generation prompt
   */
  createFollowupPrompt(focusedTopics, incorrectAnswers) {
    let prompt = `Generate follow-up MCQ questions to help the student practice:\n\n`;
    prompt += `Focus Areas: ${focusedTopics.join(', ')}\n\n`;
    prompt += `The student just answered these questions incorrectly:\n`;
    
    incorrectAnswers.forEach((ans, index) => {
      prompt += `${index + 1}. ${ans.question.substring(0, 80)}...\n`;
      prompt += `   Student answered: ${ans.studentAnswer}\n`;
      prompt += `   Correct answer: ${ans.correctAnswer}\n\n`;
    });
    
    prompt += `Create questions that:\n`;
    prompt += `- Reinforce the same concepts but with different scenarios\n`;
    prompt += `- Help identify and correct common misconceptions\n`;
    prompt += `- Build confidence through progressive difficulty\n`;
    prompt += `- Include clear explanations connecting to the original concepts`;
    
    return prompt;
  }
}

module.exports = new AnalysisService();