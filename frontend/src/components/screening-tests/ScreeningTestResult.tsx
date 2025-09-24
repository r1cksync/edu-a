'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import { 
  Trophy, Target, Clock, TrendingUp, CheckCircle, XCircle, MinusCircle, 
  Award, Brain, BookOpen, ArrowLeft, Share, Download, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TestResult {
  _id: string;
  screeningTest: {
    _id: string;
    title: string;
    description: string;
    totalQuestions: number;
    timeLimit: number;
    passingScore: number;
  };
  student: {
    _id: string;
    name: string;
    email: string;
  };
  attemptNumber: number;
  score: number;
  percentage: number;
  totalTimeSpent: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  isCompleted: boolean;
  createdAt: string;
  categoryPerformance: {
    quantitative: CategoryPerformance;
    logical: CategoryPerformance;
    verbal: CategoryPerformance;
  };
  difficultyPerformance: {
    easy: DifficultyPerformance;
    medium: DifficultyPerformance;
    hard: DifficultyPerformance;
  };
  questionAttempts: Array<{
    question: {
      _id: string;
      question: string;
      category: string;
      difficulty: string;
      correctAnswer: string;
      points: number;
    };
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    confidence: number;
  }>;
  analytics: {
    timeSpentPerQuestion: number;
    speedMetrics: {
      averageTimePerCategory: {
        quantitative: number;
        logical: number;
        verbal: number;
      };
      averageTimePerDifficulty: {
        easy: number;
        medium: number;
        hard: number;
      };
    };
    accuracyTrends: {
      firstHalf: number;
      secondHalf: number;
      improvementRate: number;
    };
    confidenceMetrics: {
      questionsRevisited: number;
      answerChanges: number;
    };
  };
  rank?: {
    position: number;
    totalParticipants: number;
    percentile: number;
  };
}

interface CategoryPerformance {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  averageTime: number;
  accuracy: number;
  score: number;
}

interface DifficultyPerformance {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  averageTime: number;
  accuracy: number;
  score: number;
}

interface ScreeningTestResultProps {
  attemptId: string;
}

const ScreeningTestResult: React.FC<ScreeningTestResultProps> = ({ attemptId }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      const data = await apiClient.get<{ success: boolean; data: any }>(`/screening-tests/attempt/${attemptId}/result`);
      
      if (data.success) {
        setResult(data.data);
      } else {
        toast.error('Failed to fetch results');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Error loading results');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPerformanceGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-50' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'quantitative': return '#3B82F6';
      case 'logical': return '#10B981';
      case 'verbal': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const handleRetakeTest = () => {
    if (result) {
      router.push(`/screening-test/${result.screeningTest._id}/start`);
    }
  };

  const handleViewAllAttempts = () => {
    router.push('/screening-tests/history');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Results not found</p>
      </div>
    );
  }

  const performance = getPerformanceGrade(result.percentage);
  const passed = result.percentage >= result.screeningTest.passingScore;

  // Prepare chart data
  const categoryData = Object.entries(result.categoryPerformance).map(([category, data]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    accuracy: data.accuracy,
    averageTime: data.averageTime,
    fill: getCategoryColor(category)
  }));

  const difficultyData = Object.entries(result.difficultyPerformance).map(([difficulty, data]) => ({
    difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    accuracy: data.accuracy,
    correct: data.correct,
    total: data.total
  }));

  const performanceBreakdown = [
    { name: 'Correct', value: result.correctAnswers, color: '#10B981' },
    { name: 'Wrong', value: result.wrongAnswers, color: '#EF4444' },
    { name: 'Skipped', value: result.skippedQuestions, color: '#6B7280' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">{result.screeningTest.title} - Results</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={handleRetakeTest}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retake Test
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Result Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${performance.bg} mb-4`}>
            <span className={`text-3xl font-bold ${performance.color}`}>{performance.grade}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {formatPercentage(result.percentage)}
          </h2>
          <p className="text-lg text-gray-600 mb-4">
            You scored {result.score} out of {result.screeningTest.totalQuestions * 4} points
          </p>
          <div className="flex items-center justify-center space-x-6">
            <Badge variant={passed ? 'default' : 'destructive'} className="text-lg px-4 py-2">
              {passed ? 'PASSED' : 'NOT PASSED'}
            </Badge>
            {result.rank && (
              <Badge variant="outline" className="text-lg px-4 py-2">
                Rank: {result.rank.position}/{result.rank.totalParticipants}
              </Badge>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(result.percentage)}</div>
              <p className="text-xs text-muted-foreground">
                {result.score}/{result.screeningTest.totalQuestions * 4} points
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Taken</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(result.totalTimeSpent)}</div>
              <p className="text-xs text-muted-foreground">
                of {formatTime(result.screeningTest.timeLimit * 60)} allowed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {result.correctAnswers}/{result.screeningTest.totalQuestions}
              </div>
              <p className="text-xs text-muted-foreground">
                {result.wrongAnswers} wrong, {result.skippedQuestions} skipped
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attempt</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{result.attemptNumber}</div>
              <p className="text-xs text-muted-foreground">
                {new Date(result.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="category">Category Analysis</TabsTrigger>
            <TabsTrigger value="questions">Question Review</TabsTrigger>
            <TabsTrigger value="insights">Performance Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={performanceBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {performanceBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${typeof value === 'number' ? value.toFixed(1) : value}%`, 'Accuracy']} />
                      <Bar dataKey="accuracy" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {result.rank && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Ranking</CardTitle>
                  <CardDescription>
                    How you performed compared to other students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-3xl font-bold">{result.rank.position}</div>
                      <div className="text-sm text-gray-600">out of {result.rank.totalParticipants} students</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPercentage(result.rank.percentile)}
                      </div>
                      <div className="text-sm text-gray-600">percentile</div>
                    </div>
                  </div>
                  <Progress value={result.rank.percentile} className="w-full" />
                  <p className="text-sm text-gray-600 mt-2">
                    You performed better than {formatPercentage(result.rank.percentile)} of students
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="category" className="space-y-6">
            <div className="grid gap-6">
              {Object.entries(result.categoryPerformance).map(([category, performance]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded mr-2" 
                        style={{ backgroundColor: getCategoryColor(category) }}
                      ></div>
                      {category.charAt(0).toUpperCase() + category.slice(1)} Reasoning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{formatPercentage(performance.accuracy)}</div>
                        <div className="text-sm text-gray-600">Accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{performance.correct}/{performance.total}</div>
                        <div className="text-sm text-gray-600">Correct</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{formatTime(performance.averageTime)}</div>
                        <div className="text-sm text-gray-600">Avg Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{performance.score}</div>
                        <div className="text-sm text-gray-600">Points</div>
                      </div>
                    </div>
                    <Progress value={performance.accuracy} className="w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Difficulty Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="difficulty" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value, name) => [
                      name === 'accuracy' ? `${typeof value === 'number' ? value.toFixed(1) : value}%` : value,
                      name === 'accuracy' ? 'Accuracy' : 'Count'
                    ]} />
                    <Bar dataKey="accuracy" fill="#3B82F6" name="accuracy" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <div className="space-y-4">
              {result.questionAttempts.map((attempt, index) => (
                <Card key={attempt.question._id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          Question {index + 1}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">{attempt.question.category}</Badge>
                          <Badge variant={
                            attempt.question.difficulty === 'easy' ? 'default' : 
                            attempt.question.difficulty === 'medium' ? 'secondary' : 'destructive'
                          }>
                            {attempt.question.difficulty}
                          </Badge>
                          <Badge variant="outline">{attempt.question.points} points</Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {attempt.isCorrect ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : attempt.selectedAnswer ? (
                          <XCircle className="w-6 h-6 text-red-600" />
                        ) : (
                          <MinusCircle className="w-6 h-6 text-gray-400" />
                        )}
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatTime(attempt.timeSpent)}
                          </div>
                          <div className="text-xs text-gray-600">
                            Time spent
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-gray-900">{attempt.question.question}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700 mr-2">Your answer:</span>
                          {attempt.selectedAnswer ? (
                            <Badge variant={attempt.isCorrect ? 'default' : 'destructive'}>
                              {attempt.selectedAnswer}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not answered</Badge>
                          )}
                        </div>
                        
                        {!attempt.isCorrect && (
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700 mr-2">Correct answer:</span>
                            <Badge variant="default">{attempt.question.correctAnswer}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Accuracy Trends</CardTitle>
                  <CardDescription>How your performance changed during the test</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>First Half</span>
                      <span className="font-medium">{formatPercentage(result.analytics.accuracyTrends.firstHalf)}</span>
                    </div>
                    <Progress value={result.analytics.accuracyTrends.firstHalf} />
                    
                    <div className="flex justify-between items-center">
                      <span>Second Half</span>
                      <span className="font-medium">{formatPercentage(result.analytics.accuracyTrends.secondHalf)}</span>
                    </div>
                    <Progress value={result.analytics.accuracyTrends.secondHalf} />
                    
                    <div className="flex justify-between items-center">
                      <span>Improvement</span>
                      <span className={`font-medium ${
                        result.analytics.accuracyTrends.improvementRate >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.analytics.accuracyTrends.improvementRate >= 0 ? '+' : ''}
                        {formatPercentage(result.analytics.accuracyTrends.improvementRate)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Test Strategy</CardTitle>
                  <CardDescription>Your approach to taking the test</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Avg Time per Question</span>
                      <span className="font-medium">{formatTime(result.analytics.timeSpentPerQuestion)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Questions Revisited</span>
                      <span className="font-medium">{result.analytics.confidenceMetrics.questionsRevisited}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Answer Changes</span>
                      <span className="font-medium">{result.analytics.confidenceMetrics.answerChanges}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Based on your performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.percentage >= result.screeningTest.passingScore ? (
                    <div className="flex items-start p-4 bg-green-50 rounded-lg">
                      <Award className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800">Excellent Performance!</h4>
                        <p className="text-sm text-green-700 mt-1">
                          You've successfully passed this screening test. Consider taking more advanced assessments to further challenge yourself.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start p-4 bg-yellow-50 rounded-lg">
                      <Brain className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Areas for Improvement</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Focus on practicing more questions in your weaker categories. Consider retaking this test after additional preparation.
                        </p>
                      </div>
                    </div>
                  )}

                  {result.analytics.accuracyTrends.improvementRate < 0 && (
                    <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Time Management</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Your accuracy decreased in the second half. Practice with time constraints to maintain performance throughout the test.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <Button variant="outline" onClick={handleViewAllAttempts}>
            <BookOpen className="w-4 h-4 mr-2" />
            View All Attempts
          </Button>
          <Button onClick={handleRetakeTest}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Take Test Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScreeningTestResult;