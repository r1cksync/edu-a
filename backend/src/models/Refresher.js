const mongoose = require('mongoose');

// Schema for individual questions in a refresher session
const refresherQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  explanation: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  marks: {
    type: Number,
    default: 2
  },
  studentAnswer: {
    type: Number,
    default: null // Index of selected option
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  timeSpent: {
    type: Number,
    default: 0 // Time in seconds
  },
  generatedFrom: {
    type: String,
    enum: ['initial_analysis', 'dynamic_followup'],
    required: true
  },
  sourceTopics: [String], // Topics this question was generated from
  answeredAt: Date
});

// Schema for refresher sessions
const refresherSessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  sourceDPP: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyPracticeProblem',
    required: true
  },
  sourceSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    // Note: This references a subdocument within DailyPracticeProblem.submissions
    required: true
  },
  // Questions organized by batches (each "Get More Questions" creates a new batch)
  questionBatches: [{
    batchNumber: Number,
    questions: [refresherQuestionSchema],
    generatedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    batchScore: {
      correct: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  }],
  // Overall session metadata
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  totalQuestionsRequested: {
    type: Number,
    required: true
  },
  currentBatch: {
    type: Number,
    default: 0
  },
  // Topics extracted from incorrect answers for AI generation
  incorrectTopics: [{
    topic: String,
    frequency: Number, // How many times student got this topic wrong
    concepts: [String] // Specific concepts within the topic
  }],
  // Session statistics
  sessionStats: {
    totalQuestions: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 },
    averageTimePerQuestion: { type: Number, default: 0 },
    improvementRate: { type: Number, default: 0 } // Improvement from first to last batch
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
refresherSessionSchema.index({ student: 1, classroom: 1 });
refresherSessionSchema.index({ student: 1, status: 1 });
refresherSessionSchema.index({ classroom: 1, status: 1 });
refresherSessionSchema.index({ sourceDPP: 1 });

// Instance methods
refresherSessionSchema.methods.getCurrentBatch = function() {
  return this.questionBatches[this.currentBatch];
};

refresherSessionSchema.methods.addNewBatch = function(questions) {
  this.questionBatches.push({
    batchNumber: this.questionBatches.length,
    questions: questions.map(q => ({
      ...q,
      generatedFrom: this.questionBatches.length === 0 ? 'initial_analysis' : 'dynamic_followup'
    }))
  });
  this.currentBatch = this.questionBatches.length - 1;
  this.lastActivityAt = new Date();
};

refresherSessionSchema.methods.submitBatchAnswers = function(answers) {
  const currentBatch = this.getCurrentBatch();
  if (!currentBatch) return false;

  let correct = 0;
  const now = new Date();

  answers.forEach((answer, index) => {
    if (currentBatch.questions[index]) {
      currentBatch.questions[index].studentAnswer = answer.selectedOption;
      currentBatch.questions[index].timeSpent = answer.timeSpent || 0;
      currentBatch.questions[index].answeredAt = now;
      
      const isCorrect = currentBatch.questions[index].options[answer.selectedOption]?.isCorrect;
      currentBatch.questions[index].isCorrect = isCorrect;
      
      if (isCorrect) correct++;
    }
  });

  currentBatch.batchScore.correct = correct;
  currentBatch.batchScore.total = currentBatch.questions.length;
  currentBatch.completedAt = now;
  this.lastActivityAt = now;

  // Update session stats
  this.updateSessionStats();
  
  return true;
};

refresherSessionSchema.methods.updateSessionStats = function() {
  let totalQuestions = 0;
  let totalCorrect = 0;
  let totalTimeSpent = 0;

  this.questionBatches.forEach(batch => {
    if (batch.completedAt) {
      totalQuestions += batch.questions.length;
      totalCorrect += batch.batchScore.correct;
      totalTimeSpent += batch.questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0);
    }
  });

  this.sessionStats.totalQuestions = totalQuestions;
  this.sessionStats.totalCorrect = totalCorrect;
  this.sessionStats.totalTimeSpent = totalTimeSpent;
  this.sessionStats.averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;
  
  // Calculate improvement rate (comparing first and last completed batches)
  const completedBatches = this.questionBatches.filter(b => b.completedAt);
  if (completedBatches.length >= 2) {
    const firstBatchAccuracy = completedBatches[0].batchScore.correct / completedBatches[0].batchScore.total;
    const lastBatchAccuracy = completedBatches[completedBatches.length - 1].batchScore.correct / completedBatches[completedBatches.length - 1].batchScore.total;
    this.sessionStats.improvementRate = ((lastBatchAccuracy - firstBatchAccuracy) / firstBatchAccuracy) * 100;
  }
};

refresherSessionSchema.methods.getIncorrectAnswersFromCurrentBatch = function() {
  const currentBatch = this.getCurrentBatch();
  if (!currentBatch || !currentBatch.completedAt) return [];

  return currentBatch.questions
    .filter(q => q.isCorrect === false)
    .map(q => ({
      question: q.question,
      correctAnswer: q.options.find(opt => opt.isCorrect)?.text,
      studentAnswer: q.options[q.studentAnswer]?.text,
      explanation: q.explanation,
      sourceTopics: q.sourceTopics,
      difficulty: q.difficulty
    }));
};

refresherSessionSchema.methods.concludeSession = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.updateSessionStats();
};

module.exports = mongoose.model('RefresherSession', refresherSessionSchema);