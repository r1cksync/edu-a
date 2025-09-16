const quizController = require('./src/controllers/quizController');

console.log('Quiz Controller:', quizController);
console.log('createQuiz method:', quizController.createQuiz);
console.log('Methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(quizController)));