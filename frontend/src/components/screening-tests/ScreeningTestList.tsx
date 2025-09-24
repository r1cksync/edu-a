'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Trophy, Target, TrendingUp, Play, Eye, BookOpen, BarChart3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ScreeningTestAnalytics from './ScreeningTestAnalytics';
import StudentHistory from './StudentHistory';

interface ScreeningTest {
  _id: string;
  title: string;
  description: string;
  totalTimeLimit: number;
  totalQuestions: number;
  totalPoints: number;
  isActive: boolean;
  createdAt: string;
  teacher: {
    name: string;
    email: string;
  };
  classroom: {
    name: string;
  };
  analytics: {
    totalAttempts: number;
    averageScore: number;
    averageTimeSpent: number;
    participantCount: number;
  };
  userAttemptCount?: number;
  userAttempts?: any[];
}

interface ScreeningTestListProps {
  classroomId: string;
}

const ScreeningTestList: React.FC<ScreeningTestListProps> = ({ classroomId }) => {
  const { user } = useAuthStore();
  const [screeningTests, setScreeningTests] = useState<ScreeningTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<ScreeningTest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'analytics' | 'history'>('list');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  useEffect(() => {
    fetchScreeningTests();
  }, [classroomId]);

  const fetchScreeningTests = async () => {
    try {
      const data = await apiClient.get<{ data: { screeningTests: ScreeningTest[] } }>(`/screening-tests/classroom/${classroomId}`);
      setScreeningTests(data.data.screeningTests);
    } catch (error) {
      console.error('Error fetching screening tests:', error);
      toast.error('Failed to load screening tests');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testId: string) => {
    try {
      const data = await apiClient.post<{ data: { attemptId: string } }>(`/screening-tests/${testId}/start`, {});
      
      // Navigate to test interface
      window.location.href = `/screening-test/${data.data.attemptId}`;
    } catch (error) {
      console.error('Error starting test:', error);
      toast.error('Failed to start test');
    }
  };

  const handleViewDetails = async (test: ScreeningTest) => {
    try {
      const data = await apiClient.get<{ data: ScreeningTest }>(`/screening-tests/${test._id}`);
      setSelectedTest(data.data);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching test details:', error);
      toast.error('Failed to load test details');
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getPerformanceBadgeColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleViewAnalytics = (testId: string) => {
    setSelectedTestId(testId);
    setCurrentView('analytics');
  };

  const handleViewHistory = () => {
    setCurrentView('history');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedTestId(null);
  };

  if (currentView === 'analytics' && selectedTestId) {
    return (
      <ScreeningTestAnalytics 
        testId={selectedTestId} 
        onBack={handleBackToList}
      />
    );
  }

  if (currentView === 'history') {
    return (
      <StudentHistory 
        onBack={handleBackToList}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Screening Tests</h2>
        <div className="flex gap-2">
          {user?.role === 'student' && (
            <Button variant="outline" onClick={handleViewHistory}>
              <BookOpen className="w-4 h-4 mr-2" />
              View All History
            </Button>
          )}
          {user?.role === 'teacher' && (
            <Button 
              onClick={() => window.location.href = `/dashboard/classrooms/${classroomId}/screening-tests/create`}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create New Test
            </Button>
          )}
        </div>
      </div>

      {screeningTests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Screening Tests</h3>
            <p className="text-gray-500">
              {user?.role === 'teacher' 
                ? 'Create your first screening test to assess student performance'
                : 'No screening tests available at the moment'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {screeningTests.map((test) => (
            <Card key={test._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {test.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {test.description || 'No description available'}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={test.isActive ? 'default' : 'secondary'}
                    className={test.isActive ? 'bg-green-500' : 'bg-gray-500'}
                  >
                    {test.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(test.totalTimeLimit)}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Target className="h-4 w-4 mr-2" />
                    {test.totalQuestions} Questions
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Trophy className="h-4 w-4 mr-2" />
                    {test.totalPoints} Points
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {test.analytics?.participantCount || 0} Students
                  </div>
                </div>

                {user?.role === 'student' && (
                  <div className="space-y-2">
                    {(test.userAttemptCount ?? 0) > 0 && (
                      <div className="text-sm text-gray-600">
                        Attempts: {test.userAttemptCount}
                        {test.userAttempts?.[0] && (
                          <Badge 
                            className={`ml-2 ${getPerformanceBadgeColor(test.userAttempts[0].percentage)}`}
                          >
                            Best: {test.userAttempts[0].percentage.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {user?.role === 'teacher' && test.analytics && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      Average Score: {test.analytics.averageScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Attempts: {test.analytics.totalAttempts}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {user?.role === 'student' && test.isActive && (
                    <Button
                      onClick={() => handleStartTest(test._id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Test
                    </Button>
                  )}
                  
                  {user?.role === 'teacher' ? (
                    <Button
                      onClick={() => handleViewAnalytics(test._id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleViewDetails(test)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Test Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTest?.title}</DialogTitle>
            <DialogDescription>
              Detailed information about this screening test
            </DialogDescription>
          </DialogHeader>
          
          {selectedTest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatTime(selectedTest.totalTimeLimit)}
                  </div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedTest.totalQuestions}
                  </div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedTest.totalPoints}
                  </div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedTest.analytics?.participantCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">Participants</div>
                </div>
              </div>

              {user?.role === 'student' && selectedTest.userAttempts && selectedTest.userAttempts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Attempt History</h3>
                  <div className="space-y-3">
                    {selectedTest.userAttempts.slice(0, 5).map((attempt, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Attempt #{attempt.attemptNumber}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(attempt.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${
                            attempt.percentage >= 70 ? 'text-green-600' : 
                            attempt.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {attempt.percentage.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.floor(attempt.totalTimeSpent / 60)}m {attempt.totalTimeSpent % 60}s
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/screening-test/attempt/${attempt._id}/analytics`}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user?.role === 'teacher' && (
                <div className="flex gap-4">
                  <Button
                    onClick={() => window.location.href = `/screening-test/${selectedTest._id}/analytics`}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button
                    onClick={() => window.location.href = `/screening-test/${selectedTest._id}/leaderboard`}
                    variant="outline"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Leaderboard
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScreeningTestList;