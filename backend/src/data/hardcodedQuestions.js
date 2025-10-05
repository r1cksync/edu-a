// Hardcoded questions for screening test to eliminate database issues
// This file contains all 180 questions across 3 categories

const quantitativeQuestions = require('./quantitativeQuestions');
const logicalQuestions = require('./logicalQuestions');
const verbalQuestions = require('./verbalQuestions');

const hardcodedQuestions = {
  quantitative: quantitativeQuestions,
  logical: logicalQuestions,
  verbal: verbalQuestions
};

// Helper functions
const getQuestionsByCategory = (category, difficulty = null) => {
  if (!hardcodedQuestions[category]) {
    return [];
  }
  
  if (difficulty) {
    return hardcodedQuestions[category][difficulty] || [];
  }
  
  // Return all questions for the category
  return [
    ...hardcodedQuestions[category].easy,
    ...hardcodedQuestions[category].medium,
    ...hardcodedQuestions[category].hard
  ];
};

const getQuestionById = (questionId) => {
  for (const category of Object.keys(hardcodedQuestions)) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const question = hardcodedQuestions[category][difficulty].find(q => q._id === questionId);
      if (question) {
        return question;
      }
    }
  }
  return null;
};

const getAllQuestions = () => {
  const allQuestions = [];
  for (const category of Object.keys(hardcodedQuestions)) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      allQuestions.push(...hardcodedQuestions[category][difficulty]);
    }
  }
  return allQuestions;
};

// Get random questions by difficulty across all categories
const getRandomQuestionsByDifficulty = (difficulty, count = 5, excludeIds = []) => {
  const allDifficultyQuestions = [];
  
  // Collect all questions of the specified difficulty from all categories
  for (const category of Object.keys(hardcodedQuestions)) {
    if (hardcodedQuestions[category][difficulty]) {
      allDifficultyQuestions.push(...hardcodedQuestions[category][difficulty]);
    }
  }
  
  // Filter out excluded questions
  const availableQuestions = allDifficultyQuestions.filter(q => !excludeIds.includes(q._id));
  
  // Shuffle and return requested count
  const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

module.exports = {
  hardcodedQuestions,
  getQuestionsByCategory,
  getQuestionById,
  getAllQuestions,
  getRandomQuestionsByDifficulty
};