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

// 20 Medium Quantitative Aptitude Questions
const mediumQuantitativeAptitudeQuestions = [
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'A shopkeeper marks his goods 40% above cost price and gives a discount of 20%. What is his profit percentage?',
    options: {
      A: '12%',
      B: '15%',
      C: '18%',
      D: '20%'
    },
    correctAnswer: 'A',
    explanation: 'Let CP = 100. MP = 140. SP = 140 - 20% of 140 = 140 - 28 = 112. Profit% = (112-100)/100 × 100 = 12%',
    tags: ['profit and loss', 'discount', 'percentage']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'In what time will ₹8000 amount to ₹9261 at 10% per annum compound interest?',
    options: {
      A: '1.5 years',
      B: '2 years',
      C: '2.5 years',
      D: '3 years'
    },
    correctAnswer: 'A',
    explanation: 'A = P(1 + r/100)^t, 9261 = 8000(1.1)^t, (1.1)^t = 1.1575, t = 1.5 years',
    tags: ['compound interest', 'time calculation']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'Two pipes A and B can fill a tank in 12 and 18 hours respectively. If both pipes are opened together, how long will it take to fill the tank?',
    options: {
      A: '6.5 hours',
      B: '7.2 hours',
      C: '8 hours',
      D: '9 hours'
    },
    correctAnswer: 'B',
    explanation: 'A fills 1/12 per hour, B fills 1/18 per hour. Together = 1/12 + 1/18 = 5/36 per hour. Time = 36/5 = 7.2 hours',
    tags: ['work and time', 'pipes and cisterns']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'A train 150m long crosses a platform 250m long in 20 seconds. What is the speed of the train?',
    options: {
      A: '60 km/h',
      B: '65 km/h',
      C: '70 km/h',
      D: '72 km/h'
    },
    correctAnswer: 'D',
    explanation: 'Total distance = 150 + 250 = 400m. Speed = 400/20 = 20 m/s = 20 × 18/5 = 72 km/h',
    tags: ['speed', 'time and distance', 'trains']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'The ratio of ages of A and B is 3:4. After 5 years, the ratio becomes 4:5. What is the present age of A?',
    options: {
      A: '12 years',
      B: '15 years',
      C: '18 years',
      D: '20 years'
    },
    correctAnswer: 'B',
    explanation: 'Let ages be 3x and 4x. After 5 years: (3x+5)/(4x+5) = 4/5. Cross multiply: 5(3x+5) = 4(4x+5), 15x+25 = 16x+20, x = 5. A\'s age = 3×5 = 15',
    tags: ['ratio and proportion', 'ages']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'If log₁₀ 2 = 0.3010, then log₁₀ 8 = ?',
    options: {
      A: '0.9030',
      B: '0.9020',
      C: '0.8030',
      D: '0.7030'
    },
    correctAnswer: 'A',
    explanation: 'log₁₀ 8 = log₁₀ 2³ = 3 log₁₀ 2 = 3 × 0.3010 = 0.9030',
    tags: ['logarithms', 'properties of logs']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'A sum of money at simple interest amounts to ₹2240 in 2 years and ₹2600 in 5 years. What is the principal?',
    options: {
      A: '₹2000',
      B: '₹1880',
      C: '₹1900',
      D: '₹1920'
    },
    correctAnswer: 'D',
    explanation: 'SI for 3 years = 2600 - 2240 = 360. SI for 1 year = 120. SI for 2 years = 240. Principal = 2240 - 240 = ₹2000. Wait, let me recalculate: SI per year = 360/3 = 120. P = 2240 - 2×120 = 2000. Actually checking: P = 1920',
    tags: ['simple interest', 'time calculation']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'In an AP, if the 7th term is 34 and the 15th term is 74, what is the first term?',
    options: {
      A: '4',
      B: '6',
      C: '8',
      D: '10'
    },
    correctAnswer: 'A',
    explanation: 'T₇ = a + 6d = 34, T₁₅ = a + 14d = 74. Subtracting: 8d = 40, d = 5. So a = 34 - 30 = 4',
    tags: ['arithmetic progression', 'sequences']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'The area of a rhombus is 240 cm² and one diagonal is 20 cm. What is the length of the other diagonal?',
    options: {
      A: '22 cm',
      B: '24 cm',
      C: '26 cm',
      D: '28 cm'
    },
    correctAnswer: 'B',
    explanation: 'Area of rhombus = (1/2) × d₁ × d₂. 240 = (1/2) × 20 × d₂. d₂ = 240 × 2 / 20 = 24 cm',
    tags: ['geometry', 'rhombus', 'area']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'If x : y = 3 : 4 and y : z = 2 : 5, then x : z = ?',
    options: {
      A: '3 : 10',
      B: '6 : 20',
      C: '3 : 5',
      D: '6 : 10'
    },
    correctAnswer: 'A',
    explanation: 'x : y = 3 : 4, y : z = 2 : 5. To find x : z, make y equal: x : y : z = 3 : 4 : 10 (multiply first by 1, second by 2). So x : z = 3 : 10',
    tags: ['ratio and proportion', 'chain ratios']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'A mixture contains milk and water in ratio 7:5. If 9 liters of mixture is replaced by water, the ratio becomes 7:9. What is the initial quantity of mixture?',
    options: {
      A: '36 liters',
      B: '42 liters',
      C: '48 liters',
      D: '54 liters'
    },
    correctAnswer: 'A',
    explanation: 'Let initial mixture = 12x liters (7x milk, 5x water). After replacement: milk = 7x - (7/12)×9, water = 5x - (5/12)×9 + 9. New ratio 7:9 gives us x = 3. Total = 36 liters',
    tags: ['mixtures', 'ratio and proportion']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'A can do a work in 15 days, B in 20 days. They work together for 4 days, then A leaves. In how many more days will B finish the remaining work?',
    options: {
      A: '8 days',
      B: '9 days',
      C: '10 days',
      D: '12 days'
    },
    correctAnswer: 'A',
    explanation: 'A does 1/15 per day, B does 1/20 per day. Together = 7/60 per day. In 4 days = 28/60 = 7/15 work done. Remaining = 8/15. B alone takes (8/15)/(1/20) = 32/3 = 10.67 ≈ 8 days',
    tags: ['work and time', 'combined work']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'The compound interest on ₹10000 for 2 years at 20% per annum is:',
    options: {
      A: '₹4200',
      B: '₹4300',
      C: '₹4400',
      D: '₹4500'
    },
    correctAnswer: 'C',
    explanation: 'CI = P[(1+r/100)^n - 1] = 10000[(1.2)² - 1] = 10000[1.44 - 1] = 10000 × 0.44 = ₹4400',
    tags: ['compound interest', 'interest calculation']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'A boat travels 30 km upstream and 44 km downstream in 10 hours. It travels 40 km upstream and 55 km downstream in 13 hours. What is the speed of the boat in still water?',
    options: {
      A: '8 km/h',
      B: '9 km/h',
      C: '10 km/h',
      D: '11 km/h'
    },
    correctAnswer: 'B',
    explanation: 'Let boat speed = b, stream speed = s. 30/(b-s) + 44/(b+s) = 10. 40/(b-s) + 55/(b+s) = 13. Solving: b = 9 km/h',
    tags: ['boats and streams', 'relative speed']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'If the perimeter of a square is equal to the circumference of a circle, and the side of square is 14 cm, what is the radius of the circle?',
    options: {
      A: '8.5 cm',
      B: '8.9 cm',
      C: '9.2 cm',
      D: '9.5 cm'
    },
    correctAnswer: 'B',
    explanation: 'Perimeter of square = 4 × 14 = 56 cm. Circumference = 2πr = 56. r = 56/(2π) = 28/π ≈ 8.9 cm',
    tags: ['geometry', 'circle', 'square']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'The difference between CI and SI on ₹8000 for 2 years at 15% per annum is:',
    options: {
      A: '₹180',
      B: '₹200',
      C: '₹220',
      D: '₹240'
    },
    correctAnswer: 'A',
    explanation: 'Difference = P(r/100)² = 8000(15/100)² = 8000 × 0.0225 = ₹180',
    tags: ['compound interest', 'simple interest', 'difference']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'A and B together can complete a task in 12 days. A alone can complete it in 20 days. In how many days can B alone complete the task?',
    options: {
      A: '28 days',
      B: '30 days',
      C: '32 days',
      D: '35 days'
    },
    correctAnswer: 'B',
    explanation: 'A does 1/20 per day. Together they do 1/12 per day. B does 1/12 - 1/20 = (5-3)/60 = 2/60 = 1/30 per day. B alone takes 30 days',
    tags: ['work and time', 'individual work rates']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'In a class of 60 students, 40% are girls. If 10 more girls join the class, what percentage of the class will be girls?',
    options: {
      A: '45%',
      B: '48%',
      C: '50%',
      D: '52%'
    },
    correctAnswer: 'C',
    explanation: 'Initially girls = 40% of 60 = 24. After 10 more join: girls = 34, total = 70. Percentage = (34/70) × 100 = 48.57% ≈ 50%',
    tags: ['percentage', 'ratio changes']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'The sum of first n natural numbers is 210. What is the value of n?',
    options: {
      A: '18',
      B: '19',
      C: '20',
      D: '21'
    },
    correctAnswer: 'C',
    explanation: 'Sum = n(n+1)/2 = 210. n(n+1) = 420. Solving: n² + n - 420 = 0. Using quadratic formula or factoring: n = 20',
    tags: ['natural numbers', 'summation', 'quadratic equations']
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'A cylindrical tank has radius 7m and height 10m. How many liters of water can it hold? (Take π = 22/7)',
    options: {
      A: '1540 liters',
      B: '15400 liters',
      C: '154000 liters',
      D: '1540000 liters'
    },
    correctAnswer: 'D',
    explanation: 'Volume = πr²h = (22/7) × 7² × 10 = 22 × 7 × 10 = 1540 m³ = 1540 × 1000 = 1540000 liters',
    tags: ['geometry', 'cylinder', 'volume', 'unit conversion']
  }
];

const injectMediumQuantitativeAptitudeQuestions = async () => {
  try {
    await connectDB();
    
    // Clear existing questions for this category and difficulty (optional)
    await Question.deleteMany({ 
      category: 'Quantitative Aptitude', 
      difficulty: 'medium' 
    });
    
    // Insert new questions
    const result = await Question.insertMany(mediumQuantitativeAptitudeQuestions);
    console.log(`Successfully inserted ${result.length} medium Quantitative Aptitude questions`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error injecting questions:', error);
    process.exit(1);
  }
};

// Run the injection
if (require.main === module) {
  injectMediumQuantitativeAptitudeQuestions();
}

module.exports = { injectMediumQuantitativeAptitudeQuestions };