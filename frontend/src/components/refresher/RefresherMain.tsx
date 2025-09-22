'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw,
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Brain,
  Play
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import RefresherSelection from './RefresherSelection'
import RefresherQuiz from './RefresherQuiz'

interface RefresherMainProps {
  classroomId: string
  isTeacher: boolean
}

interface RefresherSession {
  sessionId: string
  status: 'active' | 'completed' | 'abandoned'
  sourceDPP: string
  currentBatch?: {
    batchNumber: number
    questions: any[]
    completed: boolean
  }
  sessionStats: {
    totalQuestions: number
    totalCorrect: number
    averageTimePerQuestion: number
  }
  startedAt: string
}

export default function RefresherMain({ classroomId, isTeacher }: RefresherMainProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [currentView, setCurrentView] = useState<'overview' | 'selection' | 'quiz'>('overview')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Query to get session history
  const { data: sessionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['refresher-history', classroomId],
    queryFn: () => apiClient.getRefresherHistory(classroomId),
    enabled: !isTeacher
  })

  // Check for active session
  const { data: activeSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['active-refresher-session', activeSessionId],
    queryFn: () => apiClient.getRefresherSession(activeSessionId!),
    enabled: !!activeSessionId && !isTeacher
  })

  if (isTeacher) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>Student Refresher Analytics</span>
            </CardTitle>
            <CardDescription>
              View how students are using the AI-powered refresher system to improve their understanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Teacher Analytics Coming Soon</h3>
              <p className="text-gray-600">
                Analytics dashboard for tracking student refresher sessions and improvement patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentView === 'selection') {
    return (
      <RefresherSelection
        classroomId={classroomId}
        onSessionStarted={(sessionId: string) => {
          setActiveSessionId(sessionId)
          setCurrentView('quiz')
        }}
        onBack={() => setCurrentView('overview')}
      />
    )
  }

  if (currentView === 'quiz' && activeSessionId) {
    return (
      <RefresherQuiz
        sessionId={activeSessionId}
        onSessionComplete={() => {
          setActiveSessionId(null)
          setCurrentView('overview')
          queryClient.invalidateQueries({ queryKey: ['refresher-history', classroomId] })
        }}
        onBack={() => {
          setActiveSessionId(null)
          setCurrentView('overview')
        }}
      />
    )
  }

  const sessions = (sessionHistory as any)?.data?.sessions || []
  const totalSessions = sessions.length
  const completedSessions = sessions.filter((s: any) => s.status === 'completed').length
  const averageAccuracy = completedSessions > 0 
    ? sessions
        .filter((s: any) => s.status === 'completed')
        .reduce((sum: number, s: any) => sum + s.stats.accuracy, 0) / completedSessions
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 text-purple-600" />
            <span>AI Refresher</span>
          </h2>
          <p className="text-gray-600">
            Practice with AI-generated questions based on your past mistakes
          </p>
        </div>
        <Button 
          onClick={() => setCurrentView('selection')}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Play className="mr-2 h-4 w-4" />
          Start New Session
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">{averageAccuracy.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      {totalSessions === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>How AI Refresher Works</CardTitle>
            <CardDescription>
              Get personalized practice questions based on your past performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Select a DPP</h3>
                <p className="text-sm text-gray-600">
                  Choose a DPP or quiz you've completed where you made some mistakes
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">AI Generates Questions</h3>
                <p className="text-sm text-gray-600">
                  AI analyzes your mistakes and creates targeted practice questions
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Dynamic Practice</h3>
                <p className="text-sm text-gray-600">
                  Get more questions automatically based on your ongoing performance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {totalSessions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              Your latest AI refresher practice sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.slice(0, 5).map((session: any) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BookOpen className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{session.sourceDPP}</p>
                      <p className="text-sm text-gray-600">
                        {session.stats.totalQuestions} questions • {session.stats.accuracy.toFixed(1)}% accuracy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={session.status === 'completed' ? 'default' : 'secondary'}
                      className={
                        session.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {session.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(session.startedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}