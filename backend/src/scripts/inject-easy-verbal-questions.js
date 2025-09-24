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

// 20 Easy Verbal Ability and Reading Comprehension Questions
const easyVerbalAbilityQuestions = [
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Choose the correct synonym for "Happy":',
    options: {
      A: 'Sad',
      B: 'Joyful',
      C: 'Angry',
      D: 'Confused'
    },
    correctAnswer: 'B',
    explanation: 'Joyful is a synonym of happy, both meaning feeling or showing pleasure and contentment.',
    tags: ['synonyms', 'vocabulary', 'word meaning']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Select the antonym of "Hot":',
    options: {
      A: 'Warm',
      B: 'Cool',
      C: 'Boiling',
      D: 'Cold'
    },
    correctAnswer: 'D',
    explanation: 'Cold is the direct antonym of hot, representing opposite temperatures.',
    tags: ['antonyms', 'vocabulary', 'opposites']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Complete the sentence: "She _____ to school every day."',
    options: {
      A: 'go',
      B: 'goes',
      C: 'going',
      D: 'gone'
    },
    correctAnswer: 'B',
    explanation: 'For third person singular (she), we use "goes" in simple present tense.',
    tags: ['grammar', 'verb forms', 'subject-verb agreement']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Identify the part of speech of the underlined word: "The CAT is sleeping."',
    options: {
      A: 'Verb',
      B: 'Adjective',
      C: 'Noun',
      D: 'Adverb'
    },
    correctAnswer: 'C',
    explanation: 'CAT is a noun as it names a person, place, or thing (in this case, an animal).',
    tags: ['parts of speech', 'nouns', 'grammar']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Choose the correctly spelled word:',
    options: {
      A: 'Recieve',
      B: 'Receive',
      C: 'Receve',
      D: 'Receiv'
    },
    correctAnswer: 'B',
    explanation: 'The correct spelling is "Receive" - remember the rule "i before e except after c".',
    tags: ['spelling', 'orthography', 'word formation']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Read the passage: "The sun rises in the east and sets in the west. This happens every day." What is the main idea?',
    options: {
      A: 'The sun is hot',
      B: 'Daily movement of the sun',
      C: 'The sun is bright',
      D: 'Day and night cycle'
    },
    correctAnswer: 'B',
    explanation: 'The passage focuses on the daily movement of the sun from east to west.',
    tags: ['reading comprehension', 'main idea', 'passage analysis']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Choose the correct article: "I saw _____ elephant at the zoo."',
    options: {
      A: 'a',
      B: 'an',
      C: 'the',
      D: 'no article needed'
    },
    correctAnswer: 'B',
    explanation: 'We use "an" before words starting with vowel sounds. "Elephant" starts with a vowel sound.',
    tags: ['articles', 'grammar', 'vowel sounds']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'What is the plural form of "Child"?',
    options: {
      A: 'Childs',
      B: 'Childes',
      C: 'Children',
      D: 'Childies'
    },
    correctAnswer: 'C',
    explanation: 'Children is the irregular plural form of child.',
    tags: ['plurals', 'irregular forms', 'noun forms']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Choose the correct preposition: "The book is _____ the table."',
    options: {
      A: 'in',
      B: 'on',
      C: 'at',
      D: 'by'
    },
    correctAnswer: 'B',
    explanation: 'We use "on" to show something is on the surface of something else.',
    tags: ['prepositions', 'spatial relationships', 'grammar']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Identify the error in: "He don\'t like chocolate."',
    options: {
      A: 'No error',
      B: 'Should be "doesn\'t"',
      C: 'Should be "chocolate"',
      D: 'Should be "likes"'
    },
    correctAnswer: 'B',
    explanation: 'For third person singular (he), we use "doesn\'t" not "don\'t".',
    tags: ['grammar correction', 'contractions', 'subject-verb agreement']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Read: "Mary loves to read books. She reads for two hours daily." What can we infer about Mary?',
    options: {
      A: 'She is a teacher',
      B: 'She enjoys reading',
      C: 'She writes books',
      D: 'She owns a library'
    },
    correctAnswer: 'B',
    explanation: 'The passage states Mary "loves to read" and reads daily, indicating she enjoys reading.',
    tags: ['inference', 'reading comprehension', 'drawing conclusions']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Choose the word that best fits: "The weather is very _____ today."',
    options: {
      A: 'book',
      B: 'cold',
      C: 'run',
      D: 'happy'
    },
    correctAnswer: 'B',
    explanation: 'Cold is an adjective that can describe weather, while the others don\'t fit grammatically or logically.',
    tags: ['word choice', 'context clues', 'adjectives']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'What is the past tense of "eat"?',
    options: {
      A: 'eated',
      B: 'ate',
      C: 'eaten',
      D: 'eating'
    },
    correctAnswer: 'B',
    explanation: 'Ate is the simple past tense of eat. Eaten is the past participle.',
    tags: ['verb tenses', 'irregular verbs', 'past tense']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Choose the correct sentence:',
    options: {
      A: 'Their going to the store',
      B: 'There going to the store',
      C: 'They\'re going to the store',
      D: 'Theyre going to the store'
    },
    correctAnswer: 'C',
    explanation: 'They\'re is the contraction for "they are". Their shows possession, there shows location.',
    tags: ['homophones', 'contractions', 'commonly confused words']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Read: "Dogs are loyal animals. They make great pets and companions." What is the tone of this passage?',
    options: {
      A: 'Negative',
      B: 'Positive',
      C: 'Neutral',
      D: 'Angry'
    },
    correctAnswer: 'B',
    explanation: 'The passage uses positive words like "loyal" and "great" to describe dogs.',
    tags: ['tone', 'reading comprehension', 'author\'s attitude']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Which word is a compound word?',
    options: {
      A: 'Running',
      B: 'Beautiful',
      C: 'Sunshine',
      D: 'Quickly'
    },
    correctAnswer: 'C',
    explanation: 'Sunshine is made up of two words: sun + shine, making it a compound word.',
    tags: ['compound words', 'word formation', 'vocabulary']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Choose the correct comparative form of "good":',
    options: {
      A: 'gooder',
      B: 'better',
      C: 'best',
      D: 'more good'
    },
    correctAnswer: 'B',
    explanation: 'Better is the comparative form of good. Best is the superlative form.',
    tags: ['comparatives', 'irregular adjectives', 'degrees of comparison']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Identify the subject in: "The red car stopped suddenly."',
    options: {
      A: 'red',
      B: 'car',
      C: 'The red car',
      D: 'stopped'
    },
    correctAnswer: 'C',
    explanation: 'The complete subject is "The red car" - the article, adjective, and noun together.',
    tags: ['sentence structure', 'subjects', 'grammar']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'Read: "It was raining heavily. Sarah took her umbrella." What is the relationship between these sentences?',
    options: {
      A: 'Cause and effect',
      B: 'Contrast',
      C: 'Comparison',
      D: 'No relationship'
    },
    correctAnswer: 'A',
    explanation: 'The rain caused Sarah to take her umbrella - this shows cause and effect relationship.',
    tags: ['sentence relationships', 'cause and effect', 'logical connections']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'easy',
    question: 'What does the idiom "Break the ice" mean?',
    options: {
      A: 'To break something made of ice',
      B: 'To start a conversation',
      C: 'To feel cold',
      D: 'To be very strong'
    },
    correctAnswer: 'B',
    explanation: 'Break the ice means to initiate conversation or make people feel more comfortable in social situations.',
    tags: ['idioms', 'figurative language', 'expressions']
  }
];

const injectEasyVerbalAbilityQuestions = async () => {
  try {
    await connectDB();
    
    // Clear existing questions for this category and difficulty (optional)
    await Question.deleteMany({ 
      category: 'Verbal Ability and Reading Comprehension', 
      difficulty: 'easy' 
    });
    
    // Insert new questions
    const result = await Question.insertMany(easyVerbalAbilityQuestions);
    console.log(`Successfully inserted ${result.length} easy Verbal Ability and Reading Comprehension questions`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error injecting questions:', error);
    process.exit(1);
  }
};

// Run the injection
if (require.main === module) {
  injectEasyVerbalAbilityQuestions();
}

module.exports = { injectEasyVerbalAbilityQuestions };