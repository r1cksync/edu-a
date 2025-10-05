// Simple test controller to debug the issue
const chatWithAI = async (req, res) => {
  try {
    console.log('AI Chat endpoint called');
    res.json({
      success: true,
      response: 'Test response from AI chat',
      metadata: {
        model: 'test',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI response',
      error: error.message,
    });
  }
};

module.exports = {
  chatWithAI,
};