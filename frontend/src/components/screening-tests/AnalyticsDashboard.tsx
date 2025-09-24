'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Target,
  Trophy,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  ArrowLeft,
  Download,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AttemptAnalytics {
  _id: string;
  student: {
    name: string;
    email: string;
  };
  screeningTest: {
    title: string;
    teacher: {
      name: string;
    };
  };
  attemptNumber: number;
  score: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  totalTimeSpent: number;
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
  createdAt: string;
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

interface AnalyticsDashboardProps {
  attemptId: string;
  userRole: 'student' | 'teacher';
  onBack: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ attemptId, userRole, onBack }) => {
  const [analytics, setAnalytics] = useState<AttemptAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [attemptId]);

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get(`/screening-tests/attempt/${attemptId}/analytics`) as any;
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadgeColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Not Available</h2>
          <p className="text-gray-600">Unable to load analytics for this attempt.</p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const categoryData = [
    {
      name: 'Quantitative',
      accuracy: analytics.categoryPerformance.quantitative.accuracy,
      averageTime: analytics.categoryPerformance.quantitative.averageTime,
      total: analytics.categoryPerformance.quantitative.total
    },
    {
      name: 'Logical',
      accuracy: analytics.categoryPerformance.logical.accuracy,
      averageTime: analytics.categoryPerformance.logical.averageTime,
      total: analytics.categoryPerformance.logical.total
    },
    {
      name: 'Verbal',
      accuracy: analytics.categoryPerformance.verbal.accuracy,
      averageTime: analytics.categoryPerformance.verbal.averageTime,
      total: analytics.categoryPerformance.verbal.total
    }
  ];

  const difficultyData = [
    {
      name: 'Easy',
      accuracy: analytics.difficultyPerformance.easy.accuracy,
      averageTime: analytics.difficultyPerformance.easy.averageTime,
      total: analytics.difficultyPerformance.easy.total
    },
    {
      name: 'Medium',
      accuracy: analytics.difficultyPerformance.medium.accuracy,
      averageTime: analytics.difficultyPerformance.medium.averageTime,
      total: analytics.difficultyPerformance.medium.total
    },
    {
      name: 'Hard',
      accuracy: analytics.difficultyPerformance.hard.accuracy,
      averageTime: analytics.difficultyPerformance.hard.averageTime,
      total: analytics.difficultyPerformance.hard.total
    }
  ];

  const pieData = [
    { name: 'Correct', value: analytics.correctAnswers, color: '#10B981' },
    { name: 'Wrong', value: analytics.wrongAnswers, color: '#EF4444' },
    { name: 'Skipped', value: analytics.skippedQuestions, color: '#6B7280' }
  ];

  const radarData = [
    {
      category: 'Quantitative',
      accuracy: analytics.categoryPerformance.quantitative.accuracy,
      speed: Math.max(0, 100 - (analytics.categoryPerformance.quantitative.averageTime / 120) * 100)
    },
    {
      category: 'Logical',
      accuracy: analytics.categoryPerformance.logical.accuracy,
      speed: Math.max(0, 100 - (analytics.categoryPerformance.logical.averageTime / 120) * 100)
    },
    {
      category: 'Verbal',
      accuracy: analytics.categoryPerformance.verbal.accuracy,
      speed: Math.max(0, 100 - (analytics.categoryPerformance.verbal.averageTime / 120) * 100)
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Performance Analytics
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Test: {analytics.screeningTest.title}</span>
                <span>•</span>
                <span>Attempt #{analytics.attemptNumber}</span>
                <span>•</span>
                <span>{new Date(analytics.createdAt).toLocaleDateString()}</span>
                {userRole === 'teacher' && (
                  <>
                    <span>•</span>
                    <span>Student: {analytics.student.name}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Score</p>
                  <div className="flex items-center">
                    <p className={`text-2xl font-bold ${getPerformanceColor(analytics.percentage)}`}>
                      {analytics.percentage.toFixed(1)}%
                    </p>
                    <Badge className={`ml-2 ${getPerformanceBadgeColor(analytics.percentage)}`}>
                      {analytics.score}/{analytics.totalQuestions}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatTime(analytics.totalTimeSpent)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg: {formatTime(Math.round(analytics.analytics.timeSpentPerQuestion))} per question
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Accuracy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((analytics.correctAnswers / analytics.totalQuestions) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {analytics.correctAnswers} correct, {analytics.wrongAnswers} wrong
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Improvement</p>
                  <p className={`text-2xl font-bold ${
                    analytics.analytics.accuracyTrends.improvementRate >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analytics.analytics.accuracyTrends.improvementRate > 0 ? '+' : ''}
                    {analytics.analytics.accuracyTrends.improvementRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    From first to second half
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Answer Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="h-5 w-5 mr-2" />
                    Answer Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${(percentage || 0).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance Radar */}
              <Card>
                <CardHeader>
                  <CardTitle>Accuracy vs Speed</CardTitle>
                  <CardDescription>
                    Balance between accuracy and response speed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Accuracy"
                        dataKey="accuracy"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Radar
                        name="Speed"
                        dataKey="speed"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Time Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  How your performance changed throughout the test
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium mb-4">Accuracy Trends</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>First Half</span>
                          <span>{analytics.analytics.accuracyTrends.firstHalf.toFixed(1)}%</span>
                        </div>
                        <Progress value={analytics.analytics.accuracyTrends.firstHalf} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Second Half</span>
                          <span>{analytics.analytics.accuracyTrends.secondHalf.toFixed(1)}%</span>
                        </div>
                        <Progress value={analytics.analytics.accuracyTrends.secondHalf} />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-4">Confidence Metrics</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Questions Revisited</span>
                        <Badge variant="outline">
                          {analytics.analytics.confidenceMetrics.questionsRevisited}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Answer Changes</span>
                        <Badge variant="outline">
                          {analytics.analytics.confidenceMetrics.answerChanges}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category-wise Performance</CardTitle>
                <CardDescription>
                  Performance breakdown by subject categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="accuracy" fill="#8884d8" name="Accuracy %" />
                    <Bar yAxisId="right" dataKey="averageTime" fill="#82ca9d" name="Avg Time (s)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(analytics.categoryPerformance).map(([key, perf]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">
                      {key === 'quantitative' ? 'Quantitative Aptitude' :
                       key === 'logical' ? 'Logical Reasoning' : 'Verbal Ability'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Accuracy:</span>
                        <span className={`ml-2 font-medium ${getPerformanceColor(perf.accuracy)}`}>
                          {perf.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Time:</span>
                        <span className="ml-2 font-medium">{formatTime(Math.round(perf.averageTime))}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Correct:</span>
                        <span className="ml-2 font-medium text-green-600">{perf.correct}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Wrong:</span>
                        <span className="ml-2 font-medium text-red-600">{perf.wrong}</span>
                      </div>
                    </div>
                    <Progress value={perf.accuracy} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="difficulty" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Difficulty-wise Performance</CardTitle>
                <CardDescription>
                  How you performed across different difficulty levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="#8884d8" name="Accuracy %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(analytics.difficultyPerformance).map(([key, perf]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className={`text-lg capitalize ${
                      key === 'easy' ? 'text-green-600' :
                      key === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {key} Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-2 font-medium">{perf.total}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Accuracy:</span>
                        <span className={`ml-2 font-medium ${getPerformanceColor(perf.accuracy)}`}>
                          {perf.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Correct:</span>
                        <span className="ml-2 font-medium text-green-600">{perf.correct}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Wrong:</span>
                        <span className="ml-2 font-medium text-red-600">{perf.wrong}</span>
                      </div>
                    </div>
                    <Progress value={perf.accuracy} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Strengths</CardTitle>
                  <CardDescription>Areas where you performed well</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Generate insights based on performance */}
                  {analytics.categoryPerformance.quantitative.accuracy >= 70 && (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm">Strong in Quantitative Aptitude</span>
                    </div>
                  )}
                  {analytics.categoryPerformance.logical.accuracy >= 70 && (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm">Excellent Logical Reasoning skills</span>
                    </div>
                  )}
                  {analytics.categoryPerformance.verbal.accuracy >= 70 && (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm">Good Verbal Ability</span>
                    </div>
                  )}
                  {analytics.analytics.accuracyTrends.improvementRate > 0 && (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm">Improved performance during the test</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Areas for Improvement</CardTitle>
                  <CardDescription>Focus areas for better performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.categoryPerformance.quantitative.accuracy < 50 && (
                    <div className="flex items-center p-3 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                      <span className="text-sm">Work on Quantitative Aptitude</span>
                    </div>
                  )}
                  {analytics.categoryPerformance.logical.accuracy < 50 && (
                    <div className="flex items-center p-3 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                      <span className="text-sm">Focus on Logical Reasoning</span>
                    </div>
                  )}
                  {analytics.categoryPerformance.verbal.accuracy < 50 && (
                    <div className="flex items-center p-3 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                      <span className="text-sm">Improve Verbal Skills</span>
                    </div>
                  )}
                  {analytics.analytics.timeSpentPerQuestion > 120 && (
                    <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-sm">Work on time management</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Personalized Recommendations</CardTitle>
                <CardDescription>Based on your performance patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Study Focus</h4>
                    <p className="text-sm text-blue-800">
                      Based on your performance, prioritize practicing {
                        Object.entries(analytics.categoryPerformance)
                          .sort(([,a], [,b]) => a.accuracy - b.accuracy)[0][0]
                      } questions to improve your overall score.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">Time Management</h4>
                    <p className="text-sm text-purple-800">
                      {analytics.analytics.timeSpentPerQuestion > 90 
                        ? "Practice with timed sessions to improve your speed while maintaining accuracy."
                        : "Your time management is good. Focus on maintaining this pace while improving accuracy."
                      }
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Next Steps</h4>
                    <p className="text-sm text-green-800">
                      {analytics.percentage >= 70 
                        ? "Great job! Continue practicing to maintain your performance level."
                        : "Focus on understanding concepts in your weaker areas and practice regularly."
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;