'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, 
  XCircle, AlertCircle, Eye, Save, Send, Timer
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
  category: 'quantitative' | 'logical' | 'verbal';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface ScreeningTestInterface {
  _id: string;
  screeningTest: {
    _id: string;
    title: string;
    description: string;
    totalQuestions: number;
    timeLimit: number;
    passingScore: number;
  };
  student: string;
  attemptNumber: number;
  questions: Question[];
  answers: Record<string, string>;
  flaggedQuestions: string[];
  startTime: string;
  timeSpent: number;
  isCompleted: boolean;
  navigationPattern: Array<{
    questionId: string;
    timestamp: Date;
    action: 'visit' | 'answer' | 'flag' | 'unflag';
  }>;
}

interface TakeScreeningTestProps {
  attemptId: string;
}

const TakeScreeningTest: React.FC<TakeScreeningTestProps> = ({ attemptId }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [testData, setTestData] = useState<ScreeningTestInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState<number>(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchTestData();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [attemptId]);

  useEffect(() => {
    if (testData && !testData.isCompleted) {
      startTimer();
      startAutoSave();
    }
  }, [testData]);

  useEffect(() => {
    if (testData && currentQuestionIndex < testData.questions.length) {
      const currentQuestionId = testData.questions[currentQuestionIndex]._id;
      setVisited(prev => {
        const newSet = new Set(prev);
        newSet.add(currentQuestionId);
        return newSet;
      });
      
      // Track start time for this question if not already tracked
      setQuestionStartTimes(prev => ({
        ...prev,
        [currentQuestionId]: prev[currentQuestionId] || Date.now()
      }));
      
      recordNavigation(currentQuestionId, 'visit');
    }
  }, [currentQuestionIndex]);

  const fetchTestData = async () => {
    try {
      const data = await apiClient.get<{ success: boolean; data: ScreeningTestInterface }>(`/screening-tests/attempt/${attemptId}`);
      
      if (data.success) {
        const attempt = data.data;
        setTestData(attempt);
        setAnswers(attempt.answers || {});
        setFlaggedQuestions(new Set(attempt.flaggedQuestions || []));
        
        // Initialize question start time for the first question
        if (attempt.questions.length > 0) {
          const firstQuestionId = attempt.questions[0]._id;
          const now = Date.now();
          setQuestionStartTimes({ [firstQuestionId]: now });
          setCurrentQuestionStartTime(now);
        }
        
        // Calculate time remaining
        const startTime = new Date(attempt.startTime);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const totalTime = attempt.screeningTest.timeLimit * 60; // Convert to seconds
        setTimeRemaining(Math.max(0, totalTime - elapsed));
      } else {
        toast.error('Failed to load test');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast.error('Error loading test');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startAutoSave = () => {
    autoSaveRef.current = setInterval(() => {
      saveProgress();
    }, 30000); // Auto-save every 30 seconds
  };

  const saveProgress = async () => {
    if (!testData) return;
    
    try {
      setAutoSaving(true);
      await apiClient.post(`/screening-tests/attempt/${attemptId}/save`, {
        answers,
        flaggedQuestions: Array.from(flaggedQuestions),
        timeSpent: (testData.screeningTest.timeLimit * 60) - timeRemaining
      });
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const recordNavigation = async (questionId: string, action: string) => {
    try {
      await apiClient.post(`/screening-tests/attempt/${attemptId}/navigation`, {
        questionId,
        action,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Navigation tracking error:', error);
    }
  };

  const handleAnswerSelect = async (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    recordNavigation(questionId, 'answer');

    // Calculate total time spent on this question (accumulated + current session)
    const currentSessionTime = currentQuestionStartTime > 0 ? 
      Math.floor((Date.now() - currentQuestionStartTime) / 1000) : 0;
    const totalTimeSpent = (questionTimeSpent[questionId] || 0) + currentSessionTime;
    const timeSpent = Math.max(1, totalTimeSpent); // Minimum 1 second

    // Update the accumulated time for this question
    setQuestionTimeSpent(prev => ({
      ...prev,
      [questionId]: totalTimeSpent
    }));

    // Reset current session start time since we're submitting an answer
    setCurrentQuestionStartTime(Date.now());

    // Submit answer to backend
    try {
      await apiClient.post(`/screening-tests/attempt/${attemptId}/answer`, {
        questionId,
        selectedAnswer: answer,
        timeSpent
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleFlagToggle = (questionId: string) => {
    const isFlagged = flaggedQuestions.has(questionId);
    if (isFlagged) {
      setFlaggedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
      recordNavigation(questionId, 'unflag');
    } else {
      setFlaggedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.add(questionId);
        return newSet;
      });
      recordNavigation(questionId, 'flag');
    }
  };

  const handleQuestionNavigation = (index: number) => {
    if (index >= 0 && index < (testData?.questions.length || 0)) {
      // Save time spent on current question before switching
      if (currentQuestionStartTime > 0 && testData?.questions[currentQuestionIndex]) {
        const currentQuestionId = testData.questions[currentQuestionIndex]._id;
        const timeSpentOnCurrent = Math.floor((Date.now() - currentQuestionStartTime) / 1000);
        setQuestionTimeSpent(prev => ({
          ...prev,
          [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpentOnCurrent
        }));
      }

      const questionId = testData?.questions[index]._id;
      if (questionId) {
        // Only set first visit time if question hasn't been visited before
        setQuestionStartTimes(prev => ({
          ...prev,
          [questionId]: prev[questionId] || Date.now()
        }));
        
        // Set current question start time for this session
        setCurrentQuestionStartTime(Date.now());
      }
      setCurrentQuestionIndex(index);
    }
  };

  const handleAutoSubmit = async () => {
    if (testData && !submitting) {
      await submitTest(true);
    }
  };

  const submitTest = async (isAutoSubmit = false) => {
    if (!testData) return;
    
    // Save time spent on current question before submitting
    if (currentQuestionStartTime > 0 && testData?.questions[currentQuestionIndex]) {
      const currentQuestionId = testData.questions[currentQuestionIndex]._id;
      const timeSpentOnCurrent = Math.floor((Date.now() - currentQuestionStartTime) / 1000);
      setQuestionTimeSpent(prev => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpentOnCurrent
      }));
    }
    
    try {
      setSubmitting(true);
      
      const data = await apiClient.post<{ success: boolean; data: { attemptId: string } }>(`/screening-tests/attempt/${attemptId}/submit`, {
        answers,
        flaggedQuestions: Array.from(flaggedQuestions),
        timeSpent: (testData.screeningTest.timeLimit * 60) - timeRemaining,
        isAutoSubmit
      });

      if (data.success) {
        toast.success(isAutoSubmit ? 'Test auto-submitted due to time limit' : 'Test submitted successfully!');
        router.push(`/screening-test/result/${data.data.attemptId}`);
      } else {
        toast.error('Failed to submit test');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Error submitting test');
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getQuestionStatusIcon = (questionId: string, index: number) => {
    const isAnswered = answers[questionId];
    const isFlagged = flaggedQuestions.has(questionId);
    const isVisited = visited.has(questionId);
    const isCurrent = index === currentQuestionIndex;

    if (isCurrent) {
      return <Eye className="w-4 h-4 text-blue-600" />;
    } else if (isAnswered) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (isFlagged) {
      return <Flag className="w-4 h-4 text-yellow-600" />;
    } else if (isVisited) {
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
    } else {
      return <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'quantitative': return 'bg-blue-100 text-blue-800';
      case 'logical': return 'bg-green-100 text-green-800';
      case 'verbal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Test not found</p>
      </div>
    );
  }

  if (testData.isCompleted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Test Already Completed</h3>
        <p className="text-gray-500 mb-4">You have already completed this screening test.</p>
        <Button onClick={() => router.push(`/screening-test/result/${attemptId}`)}>
          View Results
        </Button>
      </div>
    );
  }

  const currentQuestion = testData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / testData.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flaggedQuestions.size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{testData.screeningTest.title}</h1>
              <p className="text-sm text-gray-600">Attempt #{testData.attemptNumber}</p>
            </div>
            <div className="flex items-center space-x-4">
              {autoSaving && (
                <div className="flex items-center text-sm text-gray-600">
                  <Save className="w-4 h-4 mr-1 animate-pulse" />
                  Saving...
                </div>
              )}
              <div className={`flex items-center px-3 py-1 rounded-lg ${
                timeRemaining <= 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                <Timer className="w-4 h-4 mr-2" />
                {formatTime(timeRemaining)}
              </div>
              <Button 
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-sm">Question Navigator</CardTitle>
                <div className="text-xs text-gray-600">
                  Progress: {answeredCount}/{testData.questions.length} answered
                </div>
                <Progress value={progress} className="w-full" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {testData.questions.map((q, index) => (
                    <Button
                      key={q._id}
                      variant={index === currentQuestionIndex ? 'default' : 'outline'}
                      size="sm"
                      className={`relative p-2 h-10 ${
                        answers[q._id] ? 'bg-green-50 border-green-200' : 
                        flaggedQuestions.has(q._id) ? 'bg-yellow-50 border-yellow-200' : ''
                      }`}
                      onClick={() => handleQuestionNavigation(index)}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs">{index + 1}</span>
                        <div className="absolute -top-1 -right-1">
                          {getQuestionStatusIcon(q._id, index)}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center">
                    <CheckCircle className="w-3 h-3 text-green-600 mr-2" />
                    <span>{answeredCount} Answered</span>
                  </div>
                  <div className="flex items-center">
                    <Flag className="w-3 h-3 text-yellow-600 mr-2" />
                    <span>{flaggedCount} Flagged</span>
                  </div>
                  <div className="flex items-center">
                    <AlertCircle className="w-3 h-3 text-gray-400 mr-2" />
                    <span>{visited.size - answeredCount} Visited</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Question {currentQuestionIndex + 1} of {testData.questions.length}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getCategoryColor(currentQuestion.category)}>
                        {currentQuestion.category}
                      </Badge>
                      <Badge variant="outline" className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-1 ${getDifficultyColor(currentQuestion.difficulty)}`}></div>
                        {currentQuestion.difficulty}
                      </Badge>
                      <Badge variant="outline">
                        {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant={flaggedQuestions.has(currentQuestion._id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFlagToggle(currentQuestion._id)}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    {flaggedQuestions.has(currentQuestion._id) ? 'Unflag' : 'Flag'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <p className="text-lg text-gray-900">{currentQuestion.question}</p>
                </div>

                <div className="space-y-3">
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <label
                      key={key}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        answers[currentQuestion._id] === key 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion._id}
                        value={key}
                        checked={answers[currentQuestion._id] === key}
                        onChange={(e) => handleAnswerSelect(currentQuestion._id, e.target.value)}
                        className="sr-only"
                      />
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 mr-3 ${
                        answers[currentQuestion._id] === key 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion._id] === key && (
                          <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                        )}
                      </div>
                      <span className="text-gray-900">{key}. {value}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => handleQuestionNavigation(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <div className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {testData.questions.length}
              </div>

              <Button
                onClick={() => handleQuestionNavigation(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === testData.questions.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Answered:</span> {answeredCount}/{testData.questions.length}
                </div>
                <div>
                  <span className="font-medium">Flagged:</span> {flaggedCount}
                </div>
                <div>
                  <span className="font-medium">Time Left:</span> {formatTime(timeRemaining)}
                </div>
                <div>
                  <span className="font-medium">Progress:</span> {progress.toFixed(1)}%
                </div>
              </div>
            </div>

            {answeredCount < testData.questions.length && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  You have {testData.questions.length - answeredCount} unanswered questions. 
                  These will be marked as incorrect.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                Continue Test
              </Button>
              <Button 
                onClick={() => submitTest()}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TakeScreeningTest;