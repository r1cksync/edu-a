'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  Clock, TrendingUp, Target, ArrowLeft, Calendar, Brain,
  CheckCircle, XCircle, MinusCircle, Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StudentAttemptHistory {
  student: {
    _id: string;
    name: string;
    email: string;
  };
  attempts: Array<{
    _id: string;
    screeningTest: {
      _id: string;
      title: string;
      totalQuestions: number;
      timeLimit: number;
    };
    attemptNumber: number;
    score: number;
    percentage: number;
    totalTimeSpent: number;
    correctAnswers: number;
    wrongAnswers: number;
    skippedQuestions: number;
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
  }>;
  overallStats: {
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
    improvementRate: number;
    totalTimeSpent: number;
    strongestCategory: string;
    weakestCategory: string;
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

interface StudentHistoryProps {
  onBack: () => void;
}

const StudentHistory: React.FC<StudentHistoryProps> = ({ onBack }) => {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<StudentAttemptHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get(`/screening-tests/student/${user?.id}/history`) as any;
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Error fetching history');
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

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return 'default';
    if (percentage >= 70) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!history || history.attempts.length === 0) {
    return (
      <div className="text-center py-8">
        <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Attempts Yet</h3>
        <p className="text-gray-500 mb-4">You haven't attempted any screening tests yet.</p>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tests
        </Button>
      </div>
    );
  }

  // Group attempts by test
  const attemptsByTest = history.attempts.reduce((acc, attempt) => {
    const testId = attempt.screeningTest._id;
    if (!acc[testId]) {
      acc[testId] = {
        test: attempt.screeningTest,
        attempts: []
      };
    }
    acc[testId].attempts.push(attempt);
    return acc;
  }, {} as Record<string, { test: any; attempts: any[] }>);

  // Prepare data for progress chart
  const progressData = history.attempts
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((attempt, index) => ({
      attempt: index + 1,
      score: attempt.percentage,
      test: attempt.screeningTest.title.substring(0, 20) + '...'
    }));

  // Category performance across all attempts
  const categoryData = [
    {
      category: 'Quantitative',
      accuracy: history.attempts.reduce((sum, attempt) => sum + attempt.categoryPerformance.quantitative.accuracy, 0) / history.attempts.length,
      avgTime: history.attempts.reduce((sum, attempt) => sum + attempt.categoryPerformance.quantitative.averageTime, 0) / history.attempts.length
    },
    {
      category: 'Logical',
      accuracy: history.attempts.reduce((sum, attempt) => sum + attempt.categoryPerformance.logical.accuracy, 0) / history.attempts.length,
      avgTime: history.attempts.reduce((sum, attempt) => sum + attempt.categoryPerformance.logical.averageTime, 0) / history.attempts.length
    },
    {
      category: 'Verbal',
      accuracy: history.attempts.reduce((sum, attempt) => sum + attempt.categoryPerformance.verbal.accuracy, 0) / history.attempts.length,
      avgTime: history.attempts.reduce((sum, attempt) => sum + attempt.categoryPerformance.verbal.averageTime, 0) / history.attempts.length
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tests
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Your Screening Test History</h1>
          <p className="text-gray-600">Track your progress and performance over time</p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.overallStats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Across {Object.keys(attemptsByTest).length} test(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(history.overallStats.bestScore)}`}>
              {formatPercentage(history.overallStats.bestScore)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatPercentage(history.overallStats.averageScore)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${history.overallStats.improvementRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {history.overallStats.improvementRate >= 0 ? '+' : ''}
              {formatPercentage(history.overallStats.improvementRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Since first attempt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(history.overallStats.totalTimeSpent)}</div>
            <p className="text-xs text-muted-foreground">
              Total practice time
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="attempts">All Attempts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Your average performance across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'accuracy' ? formatPercentage(value as number) : formatTime(value as number),
                      name === 'accuracy' ? 'Accuracy' : 'Avg Time'
                    ]} />
                    <Bar dataKey="accuracy" fill="#3B82F6" name="accuracy" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Strengths & Areas for Improvement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">Strongest Category</p>
                    <p className="text-sm text-green-600 capitalize">
                      {history.overallStats.strongestCategory}
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                  <Target className="w-5 h-5 text-yellow-600 mr-3" />
                  <div>
                    <p className="font-medium text-yellow-800">Focus Area</p>
                    <p className="text-sm text-yellow-600 capitalize">
                      {history.overallStats.weakestCategory}
                    </p>
                  </div>
                </div>
                {history.overallStats.improvementRate > 0 && (
                  <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-blue-800">Great Progress!</p>
                      <p className="text-sm text-blue-600">
                        You've improved by {formatPercentage(history.overallStats.improvementRate)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Score Progress Over Time</CardTitle>
              <CardDescription>Track your improvement across all attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="attempt" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [formatPercentage(value as number), 'Score']}
                    labelFormatter={(label) => `Attempt ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attempts" className="space-y-6">
          {Object.entries(attemptsByTest).map(([testId, { test, attempts }]) => (
            <Card key={testId}>
              <CardHeader>
                <CardTitle>{test.title}</CardTitle>
                <CardDescription>
                  {attempts.length} attempt(s) • {test.totalQuestions} questions • {formatTime(test.timeLimit)} time limit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attempts
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((attempt, index) => (
                    <div key={attempt._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">Attempt #{attempt.attemptNumber}</h4>
                            <Badge variant={getPerformanceBadge(attempt.percentage)}>
                              {formatPercentage(attempt.percentage)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(attempt.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            <span className="text-green-600 font-medium">{attempt.correctAnswers}</span> correct • 
                            <span className="text-red-600 font-medium ml-1">{attempt.wrongAnswers}</span> wrong • 
                            <span className="text-gray-600 font-medium ml-1">{attempt.skippedQuestions}</span> skipped
                          </p>
                          <p className="text-sm text-gray-600">
                            Time: {formatTime(attempt.totalTimeSpent)}
                          </p>
                        </div>
                      </div>

                      {/* Category breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {Object.entries(attempt.categoryPerformance).map(([category, performance]) => {
                          const perf = performance as CategoryPerformance;
                          return (
                            <div key={category} className="bg-gray-50 rounded-lg p-3">
                              <h5 className="font-medium capitalize mb-2">{category}</h5>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span>Accuracy:</span>
                                  <span className={getPerformanceColor(perf.accuracy)}>
                                    {formatPercentage(perf.accuracy)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Correct:</span>
                                  <span>{perf.correct}/{perf.total}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Avg Time:</span>
                                  <span>{formatTime(perf.averageTime)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Performance insights */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-medium mb-2">Accuracy Trends</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>First Half:</span>
                              <span>{formatPercentage(attempt.analytics.accuracyTrends.firstHalf)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Second Half:</span>
                              <span>{formatPercentage(attempt.analytics.accuracyTrends.secondHalf)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Improvement:</span>
                              <span className={attempt.analytics.accuracyTrends.improvementRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {attempt.analytics.accuracyTrends.improvementRate >= 0 ? '+' : ''}
                                {formatPercentage(attempt.analytics.accuracyTrends.improvementRate)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-medium mb-2">Test Strategy</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Questions Revisited:</span>
                              <span>{attempt.analytics.confidenceMetrics.questionsRevisited}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Answer Changes:</span>
                              <span>{attempt.analytics.confidenceMetrics.answerChanges}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Avg Time/Question:</span>
                              <span>{formatTime(attempt.analytics.timeSpentPerQuestion)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentHistory;