const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { auth } = require('../middleware/auth');

// Get question count by category and difficulty
router.get('/count', auth, async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    
    const count = await Question.countDocuments(filter);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get question count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question count',
      error: error.message
    });
  }
});

// Get question counts by category and difficulty (for test creation)
router.get('/counts', auth, async (req, res) => {
  try {
    const counts = await Question.aggregate([
      {
        $group: {
          _id: {
            category: '$category',
            difficulty: '$difficulty'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          difficulties: {
            $push: {
              difficulty: '$_id.difficulty',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    // Format the response
    const formattedCounts = {
      quantitative: { easy: 0, medium: 0, hard: 0, total: 0 },
      logical: { easy: 0, medium: 0, hard: 0, total: 0 },
      verbal: { easy: 0, medium: 0, hard: 0, total: 0 }
    };

    counts.forEach(category => {
      let categoryKey;
      switch (category._id) {
        case 'Quantitative Aptitude':
          categoryKey = 'quantitative';
          break;
        case 'Logical Reasoning and Data Interpretation':
          categoryKey = 'logical';
          break;
        case 'Verbal Ability and Reading Comprehension':
          categoryKey = 'verbal';
          break;
        default:
          return;
      }

      formattedCounts[categoryKey].total = category.total;
      category.difficulties.forEach(diff => {
        formattedCounts[categoryKey][diff.difficulty] = diff.count;
      });
    });

    res.json({
      success: true,
      data: formattedCounts
    });
  } catch (error) {
    console.error('Get question counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question counts',
      error: error.message
    });
  }
});

// Get questions with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const { 
      category, 
      difficulty, 
      page = 1, 
      limit = 20,
      search 
    } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const questions = await Question.find(filter)
      .select('category difficulty question tags createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Question.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message
    });
  }
});

// Get question by ID (for detailed view)
router.get('/:questionId', auth, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const question = await Question.findById(questionId);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question',
      error: error.message
    });
  }
});

// Get question counts by category and difficulty
router.get('/counts', auth, async (req, res) => {
  try {
    const counts = await Question.aggregate([
      {
        $group: {
          _id: {
            category: '$category',
            difficulty: '$difficulty'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          difficulties: {
            $push: {
              difficulty: '$_id.difficulty',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    // Format the response
    const formattedCounts = {
      quantitative: { easy: 0, medium: 0, hard: 0, total: 0 },
      logical: { easy: 0, medium: 0, hard: 0, total: 0 },
      verbal: { easy: 0, medium: 0, hard: 0, total: 0 }
    };

    counts.forEach(category => {
      let categoryKey;
      switch (category._id) {
        case 'Quantitative Aptitude':
          categoryKey = 'quantitative';
          break;
        case 'Logical Reasoning and Data Interpretation':
          categoryKey = 'logical';
          break;
        case 'Verbal Ability and Reading Comprehension':
          categoryKey = 'verbal';
          break;
        default:
          return;
      }

      formattedCounts[categoryKey].total = category.total;
      category.difficulties.forEach(diff => {
        formattedCounts[categoryKey][diff.difficulty] = diff.count;
      });
    });

    res.json({
      success: true,
      data: formattedCounts
    });
  } catch (error) {
    console.error('Get question counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question counts',
      error: error.message
    });
  }
});

module.exports = router;