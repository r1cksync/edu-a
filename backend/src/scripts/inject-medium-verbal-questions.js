const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Question = require('../models/Question');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI exists:', !!mongoUri);
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set. Please check your .env file.');
    }
    
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// 20 Medium Verbal Ability and Reading Comprehension Questions
const mediumVerbalAbilityQuestions = [
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Choose the word that is most nearly opposite in meaning to "Magnanimous":',
    options: {
      A: 'Generous',
      B: 'Petty',
      C: 'Noble',
      D: 'Forgiving'
    },
    correctAnswer: 'B',
    explanation: 'Magnanimous means generous in forgiving, noble-minded. Petty means small-minded, ungenerous - the opposite.',
    tags: ['antonyms', 'advanced vocabulary', 'word meanings']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Read the passage: "The industrial revolution transformed society from agrarian to manufacturing-based economy. This shift brought both prosperity and problems including urbanization, pollution, and labor disputes." What is the author\'s perspective?',
    options: {
      A: 'Completely positive',
      B: 'Completely negative',
      C: 'Balanced view',
      D: 'Indifferent'
    },
    correctAnswer: 'C',
    explanation: 'The author presents both positive aspects (prosperity) and negative aspects (problems), showing a balanced perspective.',
    tags: ['reading comprehension', 'author\'s perspective', 'balanced analysis']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Choose the correct usage: "The committee was _____ about the new policy."',
    options: {
      A: 'ambiguous',
      B: 'ambivalent',
      C: 'ambidextrous',
      D: 'ambient'
    },
    correctAnswer: 'B',
    explanation: 'Ambivalent means having mixed feelings or contradictory ideas about something, which fits the context of a committee\'s opinion.',
    tags: ['word usage', 'context clues', 'vocabulary in context']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Identify the figure of speech: "The classroom was a zoo during recess."',
    options: {
      A: 'Simile',
      B: 'Metaphor',
      C: 'Personification',
      D: 'Alliteration'
    },
    correctAnswer: 'B',
    explanation: 'This is a metaphor as it directly compares the classroom to a zoo without using "like" or "as".',
    tags: ['figures of speech', 'metaphor', 'literary devices']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Complete the analogy: PROLIFIC : PRODUCTIVE :: LACONIC : ?',
    options: {
      A: 'Verbose',
      B: 'Concise',
      C: 'Eloquent',
      D: 'Articulate'
    },
    correctAnswer: 'B',
    explanation: 'Prolific relates to productive (both mean producing much). Laconic means brief in speech, so it relates to concise.',
    tags: ['analogies', 'word relationships', 'vocabulary']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Read: "Although renewable energy sources are becoming more viable, the transition from fossil fuels remains challenging due to infrastructure costs and political resistance." What is the main obstacle mentioned?',
    options: {
      A: 'Technical limitations',
      B: 'Environmental concerns',
      C: 'Financial and political barriers',
      D: 'Public awareness'
    },
    correctAnswer: 'C',
    explanation: 'The passage specifically mentions "infrastructure costs and political resistance" as the main challenges.',
    tags: ['reading comprehension', 'main idea identification', 'detail recognition']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Choose the sentence with correct parallel structure:',
    options: {
      A: 'She likes reading, writing, and to paint',
      B: 'She likes reading, writing, and painting',
      C: 'She likes to read, writing, and painting',
      D: 'She likes reading, to write, and painting'
    },
    correctAnswer: 'B',
    explanation: 'Parallel structure requires consistent grammatical form. "Reading, writing, and painting" are all gerunds.',
    tags: ['parallel structure', 'grammar', 'sentence construction']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'What is the meaning of the prefix "mal-" in words like "malfunction" and "malnutrition"?',
    options: {
      A: 'Good',
      B: 'Bad or wrong',
      C: 'Many',
      D: 'Before'
    },
    correctAnswer: 'B',
    explanation: 'The prefix "mal-" means bad, wrong, or ill, as seen in malfunction (wrong function) and malnutrition (bad nutrition).',
    tags: ['prefixes', 'word formation', 'etymology']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Read: "The protagonist\'s journey from innocence to experience mirrors the universal human condition of growth through adversity." This sentence suggests the story is:',
    options: {
      A: 'A historical account',
      B: 'A coming-of-age narrative',
      C: 'A scientific study',
      D: 'A comedy'
    },
    correctAnswer: 'B',
    explanation: 'The journey from innocence to experience through adversity is characteristic of coming-of-age narratives.',
    tags: ['literary analysis', 'genre identification', 'thematic understanding']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Choose the word that best completes the sentence: "Her argument was so _____ that even her critics were convinced."',
    options: {
      A: 'fallacious',
      B: 'cogent',
      C: 'verbose',
      D: 'ambiguous'
    },
    correctAnswer: 'B',
    explanation: 'Cogent means clear, logical, and convincing, which explains why critics were convinced.',
    tags: ['vocabulary in context', 'logical reasoning', 'word meaning']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Identify the error in: "Between you and I, this secret should remain confidential."',
    options: {
      A: 'Should be "Among you and I"',
      B: 'Should be "Between you and me"',
      C: 'Should be "remain confident"',
      D: 'No error'
    },
    correctAnswer: 'B',
    explanation: 'After prepositions like "between," we use object pronouns. "Me" is the object form of "I."',
    tags: ['pronoun usage', 'grammar correction', 'object pronouns']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Read: "Climate change represents an unprecedented challenge requiring immediate global cooperation. However, national interests often supersede environmental concerns." What does "supersede" mean in this context?',
    options: {
      A: 'Support',
      B: 'Override',
      C: 'Follow',
      D: 'Ignore'
    },
    correctAnswer: 'B',
    explanation: 'Supersede means to take the place of or override something else, indicating national interests take priority over environmental concerns.',
    tags: ['vocabulary in context', 'word meaning', 'context clues']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Choose the most appropriate transition word: "The experiment failed. _____, the researchers learned valuable information."',
    options: {
      A: 'Therefore',
      B: 'However',
      C: 'Similarly',
      D: 'Furthermore'
    },
    correctAnswer: 'B',
    explanation: 'However shows contrast between the failure and the positive outcome of learning valuable information.',
    tags: ['transition words', 'coherence', 'logical connections']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'What is the tone of this passage: "The company\'s decision to lay off workers while giving executives bonuses reveals a disturbing pattern of corporate greed."',
    options: {
      A: 'Neutral',
      B: 'Critical',
      C: 'Supportive',
      D: 'Humorous'
    },
    correctAnswer: 'B',
    explanation: 'Words like "disturbing" and "corporate greed" indicate a critical tone toward the company\'s actions.',
    tags: ['tone analysis', 'author\'s attitude', 'word choice']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Choose the sentence with the correct use of the semicolon:',
    options: {
      A: 'I like apples; oranges, and bananas',
      B: 'She studied hard; therefore, she passed the exam',
      C: 'The meeting is at 3:00; PM',
      D: 'He is tall; and handsome'
    },
    correctAnswer: 'B',
    explanation: 'Semicolons are used before transitional words like "therefore" that connect independent clauses.',
    tags: ['punctuation', 'semicolon usage', 'sentence structure']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Read: "Artificial intelligence has revolutionized many industries, from healthcare to finance. Critics argue that AI may displace workers, while proponents emphasize increased efficiency and innovation." What organizational pattern is used?',
    options: {
      A: 'Chronological',
      B: 'Compare and contrast',
      C: 'Cause and effect',
      D: 'Problem and solution'
    },
    correctAnswer: 'B',
    explanation: 'The passage contrasts critics\' concerns with proponents\' benefits, showing a compare and contrast pattern.',
    tags: ['organizational patterns', 'text structure', 'compare and contrast']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Choose the word with the correct suffix: "The _____ of the new policy was questioned by many."',
    options: {
      A: 'effect',
      B: 'effective',
      C: 'effectiveness',
      D: 'effectual'
    },
    correctAnswer: 'C',
    explanation: 'Effectiveness (noun) fits grammatically after "the" and before "of," indicating the quality of being effective.',
    tags: ['word formation', 'suffixes', 'parts of speech']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Identify the logical fallacy: "Everyone is buying this product, so it must be good."',
    options: {
      A: 'Hasty generalization',
      B: 'Ad hominem',
      C: 'Bandwagon appeal',
      D: 'False dichotomy'
    },
    correctAnswer: 'C',
    explanation: 'Bandwagon appeal assumes something is good or right because many people do it or believe it.',
    tags: ['logical fallacies', 'critical thinking', 'reasoning errors']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Read: "The author\'s use of symbolism throughout the novel creates layers of meaning that reward careful readers." What literary technique is being discussed?',
    options: {
      A: 'Foreshadowing',
      B: 'Symbolism',
      C: 'Irony',
      D: 'Allegory'
    },
    correctAnswer: 'B',
    explanation: 'The passage explicitly mentions "symbolism" as the literary technique creating layers of meaning.',
    tags: ['literary techniques', 'symbolism', 'literary analysis']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'medium',
    question: 'Choose the most concise revision: "In spite of the fact that it was raining heavily, we decided to go for a walk."',
    options: {
      A: 'Despite the heavy rain, we decided to walk',
      B: 'Although it was raining heavily, we walked',
      C: 'Even though there was heavy rain, we walked',
      D: 'Regardless of the rain, we decided to take a walk'
    },
    correctAnswer: 'A',
    explanation: 'Option A is the most concise, eliminating unnecessary words while maintaining the original meaning.',
    tags: ['conciseness', 'revision', 'wordiness elimination']
  }
];

const injectMediumVerbalAbilityQuestions = async () => {
  try {
    await connectDB();
    
    // Clear existing questions for this category and difficulty (optional)
    await Question.deleteMany({ 
      category: 'Verbal Ability and Reading Comprehension', 
      difficulty: 'medium' 
    });
    
    // Insert new questions
    const result = await Question.insertMany(mediumVerbalAbilityQuestions);
    console.log(`Successfully inserted ${result.length} medium Verbal Ability and Reading Comprehension questions`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error injecting questions:', error);
    process.exit(1);
  }
};

// Run the injection
if (require.main === module) {
  injectMediumVerbalAbilityQuestions();
}

module.exports = { injectMediumVerbalAbilityQuestions };