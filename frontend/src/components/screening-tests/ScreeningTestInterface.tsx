'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  CheckCircle, 
  AlertCircle,
  Timer,
  Target,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Question {
  _id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  category: string;
  difficulty: string;
  points: number;
  timeLimit: number;
}

interface TestAttempt {
  _id: string;
  title: string;
  description: string;
  totalTimeLimit: number;
  totalQuestions: number;
  questions: Question[];
  settings: {
    allowMultipleAttempts: boolean;
    showResultsImmediately: boolean;
    showCorrectAnswers: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    preventBackNavigation: boolean;
  };
  attemptId: string;
  attemptNumber: number;
}

interface ScreeningTestInterfaceProps {
  attemptId: string;
}

const ScreeningTestInterface: React.FC<ScreeningTestInterfaceProps> = ({ attemptId }) => {
  const [testData, setTestData] = useState<TestAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  // Load test data
  useEffect(() => {
    fetchTestData();
  }, [attemptId]);

  // Timer effect
  useEffect(() => {
    if (!testData || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testData, timeRemaining]);

  // Track question time
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  const fetchTestData = async () => {
    try {
      // This would typically come from the start test endpoint
      // For now, we'll fetch the attempt data
      const response = await fetch(`/api/screening-tests/attempt/${attemptId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load test data');
      }

      const data = await response.json();
      setTestData(data.data);
      setTimeRemaining(data.data.totalTimeLimit * 60); // Convert minutes to seconds
      
      // Initialize question times
      const initialTimes: Record<string, number> = {};
      data.data.questions.forEach((q: Question) => {
        initialTimes[q._id] = 0;
      });
      setQuestionTimes(initialTimes);

    } catch (error) {
      console.error('Error loading test:', error);
      toast.error('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const updateQuestionTime = useCallback(() => {
    if (!testData) return;
    
    const currentQuestion = testData.questions[currentQuestionIndex];
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
    setQuestionTimes(prev => ({
      ...prev,
      [currentQuestion._id]: (prev[currentQuestion._id] || 0) + timeSpent
    }));
  }, [testData, currentQuestionIndex, questionStartTime]);

  const handleAnswerChange = async (questionId: string, answer: string) => {
    updateQuestionTime();
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // Submit answer to backend
    try {
      await fetch(`/api/screening-tests/attempt/${attemptId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          questionId,
          selectedAnswer: answer,
          timeSpent: questionTimes[questionId] || 0
        })
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      // Don't show error to user to avoid distraction
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0 && !testData?.settings.preventBackNavigation) {
      updateQuestionTime();
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (testData && currentQuestionIndex < testData.questions.length - 1) {
      updateQuestionTime();
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleFlagQuestion = () => {
    if (!testData) return;
    
    const currentQuestion = testData.questions[currentQuestionIndex];
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion._id)) {
        newSet.delete(currentQuestion._id);
      } else {
        newSet.add(currentQuestion._id);
      }
      return newSet;
    });
  };

  const handleSubmitTest = async () => {
    if (submitting || !testData) return;
    
    try {
      setSubmitting(true);
      updateQuestionTime();

      const response = await fetch(`/api/screening-tests/attempt/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to submit test');
      }

      const result = await response.json();
      
      // Navigate to results page
      window.location.href = `/screening-test/result/${attemptId}`;
      
    } catch (error) {
      console.error('Error submitting test:', error);
      toast.error('Failed to submit test');
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const handleAutoSubmit = () => {
    if (!submitting) {
      toast.error('Time up! Test will be submitted automatically.');
      handleSubmitTest();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining > 300) return 'text-green-600'; // > 5 minutes
    if (timeRemaining > 120) return 'text-yellow-600'; // > 2 minutes
    return 'text-red-600'; // <= 2 minutes
  };

  const getProgressPercentage = () => {
    if (!testData) return 0;
    const answeredQuestions = Object.keys(answers).length;
    return (answeredQuestions / testData.questions.length) * 100;
  };

  const getQuestionStatus = (questionId: string) => {
    if (answers[questionId]) return 'answered';
    if (flaggedQuestions.has(questionId)) return 'flagged';
    return 'unanswered';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Test Not Found</h2>
          <p className="text-gray-600">The test you're looking for could not be loaded.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = testData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === testData.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{testData.title}</h1>
              <p className="text-sm text-gray-600">
                Attempt #{testData.attemptNumber} • Question {currentQuestionIndex + 1} of {testData.questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Timer className="h-5 w-5 text-gray-500" />
                <span className={`text-lg font-mono font-semibold ${getTimeColor()}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              <Button
                onClick={() => setShowSubmitDialog(true)}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                Submit Test
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress: {Object.keys(answers).length} of {testData.questions.length} answered</span>
              <span>{getProgressPercentage().toFixed(0)}% Complete</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Questions</CardTitle>
                <CardDescription>Click to navigate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {testData.questions.map((question, index) => (
                    <Button
                      key={question._id}
                      variant={index === currentQuestionIndex ? 'default' : 'outline'}
                      size="sm"
                      className={`w-full h-10 text-xs ${
                        getQuestionStatus(question._id) === 'answered' 
                          ? 'bg-green-100 border-green-300 text-green-800' 
                          : getQuestionStatus(question._id) === 'flagged'
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                          : ''
                      }`}
                      onClick={() => {
                        updateQuestionTime();
                        setCurrentQuestionIndex(index);
                      }}
                    >
                      {index + 1}
                      {getQuestionStatus(question._id) === 'answered' && (
                        <CheckCircle className="h-3 w-3 ml-1" />
                      )}
                      {flaggedQuestions.has(question._id) && (
                        <Flag className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
                    <span>Answered ({Object.keys(answers).length})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
                    <span>Flagged ({flaggedQuestions.size})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-white border border-gray-300 rounded mr-2"></div>
                    <span>Not Answered ({testData.questions.length - Object.keys(answers).length})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {currentQuestion.category}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          currentQuestion.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                          currentQuestion.difficulty === 'medium' ? 'border-yellow-500 text-yellow-700' :
                          'border-red-500 text-red-700'
                        }`}
                      >
                        {currentQuestion.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-relaxed">
                      Question {currentQuestionIndex + 1}: {currentQuestion.question}
                    </CardTitle>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFlagQuestion}
                    className={flaggedQuestions.has(currentQuestion._id) ? 'bg-yellow-100 border-yellow-300' : ''}
                  >
                    <Flag className={`h-4 w-4 ${flaggedQuestions.has(currentQuestion._id) ? 'text-yellow-600' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <RadioGroup
                  value={answers[currentQuestion._id] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQuestion._id, value)}
                >
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                      <RadioGroupItem value={key} id={`option-${key}`} />
                      <Label 
                        htmlFor={`option-${key}`}
                        className="flex-1 cursor-pointer text-sm leading-relaxed"
                      >
                        <span className="font-medium mr-2">({key})</span>
                        {value}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0 || testData.settings.preventBackNavigation}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <div className="text-sm text-gray-500">
                    Time on this question: {formatTime(Math.floor((Date.now() - questionStartTime) / 1000))}
                  </div>

                  {isLastQuestion ? (
                    <Button
                      onClick={() => setShowSubmitDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Review & Submit
                    </Button>
                  ) : (
                    <Button onClick={handleNextQuestion}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Test Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Questions Answered:</span>
                  <span className="font-medium ml-2">{Object.keys(answers).length} of {testData.questions.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Questions Flagged:</span>
                  <span className="font-medium ml-2">{flaggedQuestions.size}</span>
                </div>
                <div>
                  <span className="text-gray-600">Time Remaining:</span>
                  <span className="font-medium ml-2">{formatTime(timeRemaining)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium ml-2">{getProgressPercentage().toFixed(0)}%</span>
                </div>
              </div>
            </div>
            
            {Object.keys(answers).length < testData.questions.length && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    You have {testData.questions.length - Object.keys(answers).length} unanswered questions.
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowSubmitDialog(false)}
                disabled={submitting}
              >
                Continue Test
              </Button>
              <Button
                onClick={handleSubmitTest}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Test'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScreeningTestInterface;