const axios = require('axios');

class EngagementService {
  constructor() {
    this.apiUrl = process.env.ENGAGEMENT_API_URL || 'https://edu-hack-class-classif.onrender.com';
    this.timeout = 30000; // 30 seconds timeout
  }

  /**
   * Analyze engagement from base64 image data
   * @param {string} imageBase64 - Base64 encoded image
   * @returns {Object} Analysis results
   */
  async analyzeEngagement(imageBase64) {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${this.apiUrl}/predict`, {
        image: imageBase64
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.data.success === false) {
        throw new Error(response.data.error || 'Analysis failed');
      }

      // Map the API response to our database format
      const result = {
        predictedClass: response.data.predicted_class,
        confidence: response.data.confidence,
        engagementScore: response.data.engagement_score,
        classProbabilities: {
          activelyLooking: response.data.class_probabilities['Actively Looking'] || 0,
          bored: response.data.class_probabilities['Bored'] || 0,
          confused: response.data.class_probabilities['Confused'] || 0,
          distracted: response.data.class_probabilities['Distracted'] || 0,
          drowsy: response.data.class_probabilities['Drowsy'] || 0,
          talkingToPeers: response.data.class_probabilities['Talking to Peers'] || 0
        },
        apiResponseTime: responseTime
      };

      return result;

    } catch (error) {
      console.error('Engagement analysis failed:', error.message);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Analysis timeout - please try again');
      }
      
      if (error.response) {
        throw new Error(`Analysis failed: ${error.response.data?.error || error.response.statusText}`);
      }
      
      throw new Error('Engagement analysis service unavailable');
    }
  }

  /**
   * Convert uploaded file buffer to base64
   * @param {Buffer} fileBuffer - File buffer from multer
   * @returns {string} Base64 encoded image
   */
  bufferToBase64(fileBuffer) {
    return fileBuffer.toString('base64');
  }

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {boolean} True if valid
   */
  validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Please upload JPG, JPEG, or PNG images only.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Please upload images smaller than 10MB.');
    }

    return true;
  }

  /**
   * Check if engagement API is healthy
   * @returns {boolean} True if API is responding
   */
  async checkApiHealth() {
    try {
      const response = await axios.get(`${this.apiUrl}/`, {
        timeout: 10000
      });
      
      return response.data.status === 'healthy' && response.data.model_loaded === true;
    } catch (error) {
      console.error('Engagement API health check failed:', error.message);
      return false;
    }
  }
}

module.exports = new EngagementService();