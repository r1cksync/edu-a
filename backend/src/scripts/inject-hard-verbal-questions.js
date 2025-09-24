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

// 20 Hard Verbal Ability and Reading Comprehension Questions
const hardVerbalAbilityQuestions = [
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Read the complex passage: "The epistemological foundations of postmodern discourse challenge the hegemonic narratives of traditional academia by deconstructing binary oppositions and privileging marginalized voices." What is the primary function of "deconstructing" in this context?',
    options: {
      A: 'Building up arguments',
      B: 'Analyzing and dismantling established structures',
      C: 'Creating new theories',
      D: 'Supporting traditional views'
    },
    correctAnswer: 'B',
    explanation: 'In postmodern discourse, deconstructing refers to critically analyzing and dismantling established binary oppositions to reveal their instability and constructed nature.',
    tags: ['advanced reading comprehension', 'academic discourse', 'critical theory']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Choose the most sophisticated synonym for "perspicacious":',
    options: {
      A: 'Astute',
      B: 'Sagacious',
      C: 'Discerning',
      D: 'All of the above'
    },
    correctAnswer: 'D',
    explanation: 'Perspicacious means having keen insight or discernment. All three options (astute, sagacious, discerning) are sophisticated synonyms with similar meanings.',
    tags: ['advanced vocabulary', 'synonyms', 'word precision']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Analyze the rhetorical strategy: "We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields and in the streets." This demonstrates:',
    options: {
      A: 'Anaphora and climax',
      B: 'Chiasmus and antithesis',
      C: 'Synecdoche and metonymy',
      D: 'Hyperbole and understatement'
    },
    correctAnswer: 'A',
    explanation: 'This Churchill quote uses anaphora (repetition of "we shall fight") and climax (building intensity through escalating locations).',
    tags: ['rhetorical devices', 'anaphora', 'literary analysis']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Complete the complex analogy: MENDACIOUS : VERACITY :: PUSILLANIMOUS : ?',
    options: {
      A: 'Cowardice',
      B: 'Courage',
      C: 'Timidity',
      D: 'Fear'
    },
    correctAnswer: 'B',
    explanation: 'Mendacious (dishonest) is opposite to veracity (truthfulness). Pusillanimous (cowardly) is opposite to courage.',
    tags: ['complex analogies', 'antonyms', 'advanced vocabulary']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Read: "The author\'s deployment of unreliable narration creates a palimpsest of meaning wherein each reading reveals previously obscured interpretations." What does "palimpsest" metaphorically suggest?',
    options: {
      A: 'A single clear meaning',
      B: 'Layered, overwritten meanings',
      C: 'Confused interpretation',
      D: 'Lost significance'
    },
    correctAnswer: 'B',
    explanation: 'A palimpsest is a manuscript with layers of text written over erased earlier text. Here it metaphorically suggests layered meanings revealed through multiple readings.',
    tags: ['metaphorical language', 'literary terminology', 'advanced comprehension']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Identify the logical structure: "If quantum mechanics is correct, then determinism is false. Quantum mechanics has been repeatedly verified. Therefore, determinism is false." This is:',
    options: {
      A: 'Modus ponens',
      B: 'Modus tollens',
      C: 'Hypothetical syllogism',
      D: 'Disjunctive syllogism'
    },
    correctAnswer: 'A',
    explanation: 'Modus ponens follows the form: If P then Q, P is true, therefore Q is true. The argument affirms the antecedent to conclude the consequent.',
    tags: ['logical reasoning', 'syllogisms', 'formal logic']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Choose the sentence that demonstrates proper use of the subjunctive mood:',
    options: {
      A: 'If I was you, I would reconsider',
      B: 'If I were you, I would reconsider',
      C: 'I wish I was taller',
      D: 'He demanded that she goes home'
    },
    correctAnswer: 'B',
    explanation: 'The subjunctive mood uses "were" for all persons in hypothetical conditions. "If I were you" is the correct subjunctive form.',
    tags: ['subjunctive mood', 'advanced grammar', 'hypothetical conditions']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Read: "The protagonist\'s Bildungsroman journey culminates in an epiphanic moment of self-actualization that transcends the conventional denouement." What literary concept is NOT directly referenced?',
    options: {
      A: 'Coming-of-age narrative',
      B: 'Moment of revelation',
      C: 'Story resolution',
      D: 'Stream of consciousness'
    },
    correctAnswer: 'D',
    explanation: 'The passage references Bildungsroman (coming-of-age), epiphanic moment (revelation), and denouement (resolution), but not stream of consciousness.',
    tags: ['literary terminology', 'genre identification', 'narrative techniques']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Analyze the semantic relationship: "The interlocutor\'s desultory remarks obfuscated rather than elucidated the central thesis." The contrast is between:',
    options: {
      A: 'Speech and silence',
      B: 'Clarity and confusion',
      C: 'Truth and falsehood',
      D: 'Brevity and verbosity'
    },
    correctAnswer: 'B',
    explanation: 'The contrast is between obfuscated (made unclear/confused) and elucidated (made clear), representing the semantic opposition of clarity versus confusion.',
    tags: ['semantic analysis', 'word relationships', 'contrast identification']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'What is the most precise meaning of "sui generis" in academic discourse?',
    options: {
      A: 'Self-evident',
      B: 'Of its own kind; unique',
      C: 'Self-generating',
      D: 'Generally accepted'
    },
    correctAnswer: 'B',
    explanation: 'Sui generis is a Latin term meaning "of its own kind" or constituting a class alone, indicating something unique or distinctive.',
    tags: ['Latin terminology', 'academic vocabulary', 'precise meaning']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Read the dense academic text: "The phenomenological reduction brackets the natural attitude to reveal the intentional structures of consciousness that constitute meaning." What is the primary purpose of "bracketing"?',
    options: {
      A: 'To categorize phenomena',
      B: 'To suspend assumptions',
      C: 'To group similar concepts',
      D: 'To eliminate consciousness'
    },
    correctAnswer: 'B',
    explanation: 'In phenomenology, bracketing (epoché) means suspending or setting aside the natural attitude and assumptions to examine pure consciousness and intentional structures.',
    tags: ['philosophical discourse', 'phenomenology', 'technical terminology']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Identify the fallacy: "Professor Smith argues for higher taxes, but he\'s a wealthy academic who doesn\'t understand ordinary people\'s struggles."',
    options: {
      A: 'Straw man',
      B: 'Ad hominem circumstantial',
      C: 'False dilemma',
      D: 'Appeal to authority'
    },
    correctAnswer: 'B',
    explanation: 'Ad hominem circumstantial attacks the person\'s circumstances or situation rather than their argument, suggesting their position is biased due to their circumstances.',
    tags: ['logical fallacies', 'ad hominem', 'argument analysis']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Choose the most sophisticated revision: "The researcher\'s methodology was questioned because of potential biases that might affect the results."',
    options: {
      A: 'The researcher\'s methodology faced scrutiny due to inherent biases that could compromise validity',
      B: 'The researcher\'s approach was criticized for possible prejudices affecting outcomes',
      C: 'People questioned the researcher\'s methods because of biases in the results',
      D: 'The methodology was problematic due to researcher bias'
    },
    correctAnswer: 'A',
    explanation: 'Option A uses more sophisticated vocabulary (scrutiny, inherent, compromise validity) while maintaining precision and academic tone.',
    tags: ['academic writing', 'style elevation', 'vocabulary sophistication']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Analyze the irony: "The fire station burned down while the firefighters were out on a call to extinguish a small brush fire." This exemplifies:',
    options: {
      A: 'Verbal irony',
      B: 'Dramatic irony',
      C: 'Situational irony',
      D: 'Cosmic irony'
    },
    correctAnswer: 'C',
    explanation: 'Situational irony occurs when there\'s a discrepancy between expectation and reality. The irony lies in the fire station burning while firefighters fight fire elsewhere.',
    tags: ['types of irony', 'situational irony', 'literary analysis']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Read: "The postcolonial narrative subverts hegemonic discourse through strategic deployment of vernacular idioms that resist linguistic imperialism." What is the primary literary strategy described?',
    options: {
      A: 'Cultural assimilation',
      B: 'Linguistic resistance',
      C: 'Narrative simplification',
      D: 'Historical documentation'
    },
    correctAnswer: 'B',
    explanation: 'The passage describes using vernacular idioms to resist linguistic imperialism, which constitutes a form of linguistic resistance against dominant discourse.',
    tags: ['postcolonial theory', 'linguistic imperialism', 'resistance strategies']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'What is the precise distinction between "imply" and "infer"?',
    options: {
      A: 'They are synonymous',
      B: 'Imply suggests; infer concludes',
      C: 'Imply is formal; infer is informal',
      D: 'Imply is active; infer is passive'
    },
    correctAnswer: 'B',
    explanation: 'Imply means to suggest something without stating it directly (speaker/writer action). Infer means to conclude or deduce from evidence (listener/reader action).',
    tags: ['word precision', 'commonly confused words', 'semantic distinction']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Analyze the syntactic structure: "Only after experiencing profound loss did she truly understand the value of human connection." This sentence employs:',
    options: {
      A: 'Passive voice',
      B: 'Conditional mood',
      C: 'Inverted syntax for emphasis',
      D: 'Parallel structure'
    },
    correctAnswer: 'C',
    explanation: 'The sentence uses inverted syntax (Only after...) to emphasize the temporal and causal relationship, creating a more dramatic effect than standard word order.',
    tags: ['syntax analysis', 'sentence inversion', 'emphasis techniques']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Read the philosophical passage: "The aporia inherent in deconstructive reading reveals the undecidability that constitutes textual meaning." What does "aporia" signify?',
    options: {
      A: 'Clarity of meaning',
      B: 'Logical contradiction or puzzle',
      C: 'Textual conclusion',
      D: 'Reader response'
    },
    correctAnswer: 'B',
    explanation: 'Aporia refers to a logical contradiction, puzzle, or state of perplexity. In deconstruction, it reveals the undecidability and instability of textual meaning.',
    tags: ['deconstructive theory', 'philosophical terminology', 'textual analysis']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Choose the sentence that correctly uses "comprise":',
    options: {
      A: 'The team is comprised of five members',
      B: 'Five members comprise the team',
      C: 'The team comprises of five members',
      D: 'Five members are comprised in the team'
    },
    correctAnswer: 'B',
    explanation: 'Comprise means "to include" or "to consist of." The whole comprises the parts. "Five members comprise the team" is correct.',
    tags: ['word usage', 'comprise vs. composed', 'precision in language']
  },
  {
    category: 'Verbal Ability and Reading Comprehension',
    difficulty: 'hard',
    question: 'Identify the rhetorical strategy in this complex argument: "While critics dismiss postmodern art as incomprehensible, this very incomprehensibility serves as a mirror reflecting society\'s fragmented condition, thus making the art profoundly comprehensible on a deeper level."',
    options: {
      A: 'Circular reasoning',
      B: 'Paradox resolution',
      C: 'False analogy',
      D: 'Ad hominem'
    },
    correctAnswer: 'B',
    explanation: 'The argument resolves an apparent paradox by showing how incomprehensibility at one level creates comprehensibility at another, deeper level.',
    tags: ['rhetorical analysis', 'paradox resolution', 'complex argumentation']
  }
];

const injectHardVerbalAbilityQuestions = async () => {
  try {
    await connectDB();
    
    // Clear existing questions for this category and difficulty (optional)
    await Question.deleteMany({ 
      category: 'Verbal Ability and Reading Comprehension', 
      difficulty: 'hard' 
    });
    
    // Insert new questions
    const result = await Question.insertMany(hardVerbalAbilityQuestions);
    console.log(`Successfully inserted ${result.length} hard Verbal Ability and Reading Comprehension questions`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error injecting questions:', error);
    process.exit(1);
  }
};

// Run the injection
if (require.main === module) {
  injectHardVerbalAbilityQuestions();
}

module.exports = { injectHardVerbalAbilityQuestions };