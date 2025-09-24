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
  LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import { 
  Clock, TrendingUp, Target, Users, Award, Brain, 
  ArrowLeft, Download, Eye, Calendar, Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ScreeningTestAnalytics {
  testId: string;
  testTitle: string;
  summary: {
    totalAttempts: number;
    uniqueStudents: number;
    averageScore: number;
    completionRate: number;
    highestScore: number;
    lowestScore: number;
  };
  performanceDistribution: {
    excellent: { count: number; percentage: number };
    good: { count: number; percentage: number };
    average: { count: number; percentage: number };
    poor: { count: number; percentage: number };
  };
  questionAnalysis: Array<{
    _id: string;
    question: string;
    category: string;
    difficulty: string;
    correctAnswers: number;
    totalAttempts: number;
    accuracy: number;
    averageTime: number;
  }>;
  timeAnalytics: {
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
  recentAttempts: Array<{
    _id: string;
    student: {
      _id: string;
      name: string;
      email: string;
    };
    score: number;
    percentage: number;
    timeSpent: number;
    createdAt: string;
  }>;
}

interface StudentAttempt {
  _id: string;
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

interface ScreeningTestAnalyticsProps {
  testId: string;
  onBack: () => void;
}

const ScreeningTestAnalytics: React.FC<ScreeningTestAnalyticsProps> = ({ testId, onBack }) => {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<ScreeningTestAnalytics | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<StudentAttempt | null>(null);
  const [showAttemptDetails, setShowAttemptDetails] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    if (user?.role === 'student') {
      fetchStudentAttempts();
    }
  }, [testId]);

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get(`/screening-tests/${testId}/analytics`) as any;
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttempts = async () => {
    try {
      const response = await apiClient.get(`/screening-tests/student/${user?.id}/history`) as any;
      const testAttempts = response.data.attempts.filter(
        (attempt: any) => attempt.screeningTest._id === testId
      );
      setStudentAttempts(testAttempts);
    } catch (error) {
      console.error('Error fetching student attempts:', error);
    }
  };

  const viewAttemptDetails = async (attemptId: string) => {
    try {
      const response = await apiClient.get(`/screening-tests/attempt/${attemptId}/analytics`) as any;
      setSelectedAttempt(response.data);
      setShowAttemptDetails(true);
    } catch (error) {
      console.error('Error fetching attempt details:', error);
      toast.error('Error fetching attempt details');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tests
        </Button>
      </div>
    );
  }

  const categoryData = [
    { name: 'Quantitative', time: analytics.timeAnalytics.averageTimePerCategory.quantitative },
    { name: 'Logical', time: analytics.timeAnalytics.averageTimePerCategory.logical },
    { name: 'Verbal', time: analytics.timeAnalytics.averageTimePerCategory.verbal },
  ];

  const difficultyData = [
    { name: 'Easy', time: analytics.timeAnalytics.averageTimePerDifficulty.easy },
    { name: 'Medium', time: analytics.timeAnalytics.averageTimePerDifficulty.medium },
    { name: 'Hard', time: analytics.timeAnalytics.averageTimePerDifficulty.hard },
  ];

  const performanceData = [
    { name: 'Excellent (90-100%)', value: analytics.performanceDistribution.excellent.count, color: '#10B981' },
    { name: 'Good (70-89%)', value: analytics.performanceDistribution.good.count, color: '#3B82F6' },
    { name: 'Average (50-69%)', value: analytics.performanceDistribution.average.count, color: '#F59E0B' },
    { name: 'Poor (0-49%)', value: analytics.performanceDistribution.poor.count, color: '#EF4444' },
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
          <h1 className="text-2xl font-bold text-gray-900">{analytics.testTitle} - Analytics</h1>
          <p className="text-gray-600">Comprehensive performance analysis</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {user?.role === 'teacher' ? (
        // Teacher Analytics View
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="questions">Question Analysis</TabsTrigger>
            <TabsTrigger value="students">Student Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.summary.totalAttempts}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.summary.uniqueStudents} unique students
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(analytics.summary.averageScore)}</div>
                  <p className="text-xs text-muted-foreground">
                    Range: {formatPercentage(analytics.summary.lowestScore)} - {formatPercentage(analytics.summary.highestScore)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(analytics.summary.completionRate)}</div>
                  <p className="text-xs text-muted-foreground">
                    Students who completed the test
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.performanceDistribution.excellent.count + analytics.performanceDistribution.good.count}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Students scoring 70%+
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={performanceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {performanceData.map((entry, index) => (
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
                  <CardTitle>Average Time by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatTime(value as number), 'Average Time']} />
                      <Bar dataKey="time" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Time by Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={difficultyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatTime(value as number), 'Average Time']} />
                      <Bar dataKey="time" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.recentAttempts.slice(0, 5).map((attempt, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{attempt.student.name}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(attempt.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={attempt.percentage >= 70 ? 'default' : 'secondary'}>
                            {formatPercentage(attempt.percentage)}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatTime(attempt.timeSpent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Question-wise Analysis</CardTitle>
                <CardDescription>Performance breakdown for each question</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.questionAnalysis.map((question, index) => (
                    <div key={question._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium">Q{index + 1}: {question.question.substring(0, 100)}...</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{question.category}</Badge>
                            <Badge variant={
                              question.difficulty === 'easy' ? 'default' : 
                              question.difficulty === 'medium' ? 'secondary' : 'destructive'
                            }>
                              {question.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatPercentage(question.accuracy)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {question.correctAnswers}/{question.totalAttempts} correct
                          </p>
                          <p className="text-sm text-gray-600">
                            Avg: {formatTime(question.averageTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Student Attempts</CardTitle>
                <CardDescription>Detailed view of all attempts by all students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.recentAttempts.map((attempt, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{attempt.student.name}</h4>
                          <p className="text-sm text-gray-600">{attempt.student.email}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(attempt.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={attempt.percentage >= 70 ? 'default' : 'secondary'}>
                            {formatPercentage(attempt.percentage)}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            Score: {attempt.score} | Time: {formatTime(attempt.timeSpent)}
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2"
                            onClick={() => viewAttemptDetails(attempt._id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Student Analytics View
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Attempt History</CardTitle>
              <CardDescription>Track your progress across multiple attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentAttempts.map((attempt, index) => (
                  <div key={attempt._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Attempt #{attempt.attemptNumber}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(attempt.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={attempt.percentage >= 70 ? 'default' : 'secondary'}>
                          {formatPercentage(attempt.percentage)}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          {attempt.correctAnswers}/{attempt.correctAnswers + attempt.wrongAnswers + attempt.skippedQuestions} correct
                        </p>
                        <p className="text-sm text-gray-600">
                          Time: {formatTime(attempt.totalTimeSpent)}
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => viewAttemptDetails(attempt._id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Analytics
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attempt Details Modal */}
      <Dialog open={showAttemptDetails} onOpenChange={setShowAttemptDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detailed Attempt Analytics {selectedAttempt && `- Attempt #${selectedAttempt.attemptNumber}`}
            </DialogTitle>
            <DialogDescription>
              Comprehensive breakdown of performance metrics
            </DialogDescription>
          </DialogHeader>
          
          {selectedAttempt && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{formatPercentage(selectedAttempt.percentage)}</div>
                    <p className="text-sm text-gray-600">Overall Score</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{formatTime(selectedAttempt.totalTimeSpent)}</div>
                    <p className="text-sm text-gray-600">Total Time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedAttempt.correctAnswers}</div>
                    <p className="text-sm text-gray-600">Correct Answers</p>
                  </CardContent>
                </Card>
              </div>

              {/* Category Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Category-wise Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(selectedAttempt.categoryPerformance).map(([category, performance]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium capitalize">{category}</h4>
                          <Badge>{formatPercentage(performance.accuracy)}</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Correct:</span> {performance.correct}
                          </div>
                          <div>
                            <span className="text-gray-600">Wrong:</span> {performance.wrong}
                          </div>
                          <div>
                            <span className="text-gray-600">Skipped:</span> {performance.skipped}
                          </div>
                          <div>
                            <span className="text-gray-600">Avg Time:</span> {formatTime(performance.averageTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Accuracy Trends</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>First Half:</span>
                          <span>{formatPercentage(selectedAttempt.analytics.accuracyTrends.firstHalf)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Second Half:</span>
                          <span>{formatPercentage(selectedAttempt.analytics.accuracyTrends.secondHalf)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Improvement:</span>
                          <span className={selectedAttempt.analytics.accuracyTrends.improvementRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {selectedAttempt.analytics.accuracyTrends.improvementRate >= 0 ? '+' : ''}
                            {formatPercentage(selectedAttempt.analytics.accuracyTrends.improvementRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Confidence Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Questions Revisited:</span>
                          <span>{selectedAttempt.analytics.confidenceMetrics.questionsRevisited}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Answer Changes:</span>
                          <span>{selectedAttempt.analytics.confidenceMetrics.answerChanges}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Time/Question:</span>
                          <span>{formatTime(selectedAttempt.analytics.timeSpentPerQuestion)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScreeningTestAnalytics;