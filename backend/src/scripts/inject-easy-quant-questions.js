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

// 20 Easy Quantitative Aptitude Questions
const easyQuantitativeAptitudeQuestions = [
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is 25% of 80?',
    options: {
      A: '15',
      B: '20',
      C: '25',
      D: '30'
    },
    correctAnswer: 'B',
    explanation: '25% of 80 = (25/100) × 80 = 20',
    tags: ['percentage', 'basic math']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'If a shirt costs ₹500 and is sold at 20% profit, what is the selling price?',
    options: {
      A: '₹580',
      B: '₹600',
      C: '₹620',
      D: '₹650'
    },
    correctAnswer: 'B',
    explanation: 'Selling price = Cost price + Profit = 500 + (20% of 500) = 500 + 100 = ₹600',
    tags: ['profit and loss', 'percentage']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is the simple interest on ₹1000 for 2 years at 5% per annum?',
    options: {
      A: '₹100',
      B: '₹110',
      C: '₹120',
      D: '₹150'
    },
    correctAnswer: 'A',
    explanation: 'SI = (P × R × T) / 100 = (1000 × 5 × 2) / 100 = ₹100',
    tags: ['simple interest', 'interest']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'Find the average of 10, 20, 30, 40, 50.',
    options: {
      A: '25',
      B: '30',
      C: '35',
      D: '40'
    },
    correctAnswer: 'B',
    explanation: 'Average = (10 + 20 + 30 + 40 + 50) / 5 = 150 / 5 = 30',
    tags: ['average', 'arithmetic mean']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'If 3x = 12, what is the value of x?',
    options: {
      A: '3',
      B: '4',
      C: '5',
      D: '6'
    },
    correctAnswer: 'B',
    explanation: '3x = 12, so x = 12/3 = 4',
    tags: ['algebra', 'linear equations']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is 15% of 200?',
    options: {
      A: '25',
      B: '30',
      C: '35',
      D: '40'
    },
    correctAnswer: 'B',
    explanation: '15% of 200 = (15/100) × 200 = 30',
    tags: ['percentage', 'basic math']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'A train travels 60 km in 1 hour. What is its speed in km/h?',
    options: {
      A: '50 km/h',
      B: '55 km/h',
      C: '60 km/h',
      D: '65 km/h'
    },
    correctAnswer: 'C',
    explanation: 'Speed = Distance / Time = 60 km / 1 hour = 60 km/h',
    tags: ['speed', 'time and distance']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is the area of a rectangle with length 8 cm and width 5 cm?',
    options: {
      A: '35 cm²',
      B: '40 cm²',
      C: '45 cm²',
      D: '50 cm²'
    },
    correctAnswer: 'B',
    explanation: 'Area of rectangle = length × width = 8 × 5 = 40 cm²',
    tags: ['geometry', 'area']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'If a pen costs ₹12 and a pencil costs ₹8, what is the total cost of 2 pens and 3 pencils?',
    options: {
      A: '₹48',
      B: '₹50',
      C: '₹52',
      D: '₹54'
    },
    correctAnswer: 'A',
    explanation: 'Total cost = (2 × 12) + (3 × 8) = 24 + 24 = ₹48',
    tags: ['basic math', 'multiplication']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is 12² (12 squared)?',
    options: {
      A: '144',
      B: '124',
      C: '134',
      D: '154'
    },
    correctAnswer: 'A',
    explanation: '12² = 12 × 12 = 144',
    tags: ['squares', 'powers']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'Find the perimeter of a square with side 6 cm.',
    options: {
      A: '20 cm',
      B: '22 cm',
      C: '24 cm',
      D: '26 cm'
    },
    correctAnswer: 'C',
    explanation: 'Perimeter of square = 4 × side = 4 × 6 = 24 cm',
    tags: ['geometry', 'perimeter']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is 1/4 + 1/4?',
    options: {
      A: '1/8',
      B: '1/2',
      C: '2/4',
      D: '1/4'
    },
    correctAnswer: 'B',
    explanation: '1/4 + 1/4 = 2/4 = 1/2',
    tags: ['fractions', 'addition']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'If 20% of a number is 40, what is the number?',
    options: {
      A: '180',
      B: '200',
      C: '220',
      D: '240'
    },
    correctAnswer: 'B',
    explanation: 'Let the number be x. 20% of x = 40, so (20/100) × x = 40, x = 200',
    tags: ['percentage', 'reverse calculation']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is the next number in the sequence: 2, 4, 6, 8, ?',
    options: {
      A: '9',
      B: '10',
      C: '11',
      D: '12'
    },
    correctAnswer: 'B',
    explanation: 'This is an arithmetic sequence with common difference 2. Next term = 8 + 2 = 10',
    tags: ['sequences', 'arithmetic progression']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'How many minutes are there in 2.5 hours?',
    options: {
      A: '120 minutes',
      B: '130 minutes',
      C: '140 minutes',
      D: '150 minutes'
    },
    correctAnswer: 'D',
    explanation: '2.5 hours = 2.5 × 60 = 150 minutes',
    tags: ['time conversion', 'units']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is 0.25 as a fraction?',
    options: {
      A: '1/2',
      B: '1/3',
      C: '1/4',
      D: '1/5'
    },
    correctAnswer: 'C',
    explanation: '0.25 = 25/100 = 1/4',
    tags: ['decimals', 'fractions']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'If a dozen eggs cost ₹60, what is the cost of one egg?',
    options: {
      A: '₹4',
      B: '₹5',
      C: '₹6',
      D: '₹7'
    },
    correctAnswer: 'B',
    explanation: 'Cost of one egg = ₹60 ÷ 12 = ₹5',
    tags: ['division', 'unit rate']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is the LCM of 4 and 6?',
    options: {
      A: '10',
      B: '12',
      C: '14',
      D: '16'
    },
    correctAnswer: 'B',
    explanation: 'Multiples of 4: 4, 8, 12, 16... Multiples of 6: 6, 12, 18... LCM = 12',
    tags: ['LCM', 'multiples']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'What is 7 × 8?',
    options: {
      A: '54',
      B: '56',
      C: '58',
      D: '60'
    },
    correctAnswer: 'B',
    explanation: '7 × 8 = 56',
    tags: ['multiplication', 'tables']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'If the radius of a circle is 7 cm, what is its diameter?',
    options: {
      A: '12 cm',
      B: '13 cm',
      C: '14 cm',
      D: '15 cm'
    },
    correctAnswer: 'C',
    explanation: 'Diameter = 2 × radius = 2 × 7 = 14 cm',
    tags: ['geometry', 'circle']
  }
];

const injectEasyQuantitativeAptitudeQuestions = async () => {
  try {
    await connectDB();
    
    // Clear existing questions for this category and difficulty (optional)
    await Question.deleteMany({ 
      category: 'Quantitative Aptitude', 
      difficulty: 'easy' 
    });
    
    // Insert new questions
    const result = await Question.insertMany(easyQuantitativeAptitudeQuestions);
    console.log(`Successfully inserted ${result.length} easy Quantitative Aptitude questions`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error injecting questions:', error);
    process.exit(1);
  }
};

// Run the injection
if (require.main === module) {
  injectEasyQuantitativeAptitudeQuestions();
}

module.exports = { injectEasyQuantitativeAptitudeQuestions };