'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns'
import { 
  Clock,
  Calendar,
  Play,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Shield,
  Timer,
  Users
} from 'lucide-react'

interface Quiz {
  _id: string
  title: string
  description: string
  questions: Array<{
    _id: string
    type: string
    question: string
    options: Array<{ text: string; isCorrect: boolean }>
    points: number
  }>
  scheduledStartTime: string
  scheduledEndTime: string
  duration: number
  totalPoints: number
  passingScore: number
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled'
  isProctored: boolean
  proctoringSettings: any
  totalStudentsInvited: number
  totalStudentsAttempted: number
  totalStudentsCompleted: number
  averageScore: number
  teacher: {
    _id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

interface QuizSession {
  _id: string
  quiz: string
  student: string
  status: 'started' | 'in_progress' | 'submitted' | 'abandoned'
  score?: number
  startedAt: string
  submittedAt?: string
}

interface StudentQuizzesProps {
  classroomId: string
}

export default function StudentQuizzes({ classroomId }: StudentQuizzesProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [filter, setFilter] = useState<'all' | 'available' | 'attempted' | 'completed'>('available')

  // Fetch available quizzes for students
  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ['studentQuizzes', classroomId, filter],
    queryFn: () => apiClient.getStudentQuizzes(classroomId, { 
      status: filter === 'all' ? undefined : filter 
    }),
    refetchInterval: 30000,
  })

  // Fetch student's quiz sessions
  const { data: sessionsData } = useQuery({
    queryKey: ['studentQuizSessions', classroomId],
    queryFn: () => apiClient.getStudentQuizSessions(classroomId),
    refetchInterval: 30000,
  })

  const quizzes: Quiz[] = (quizzesData as any)?.quizzes || []
  const sessions: QuizSession[] = (sessionsData as any)?.sessions || []

  // Start quiz mutation
  const startQuizMutation = useMutation({
    mutationFn: (quizId: string) => apiClient.startQuizSession(quizId),
    onSuccess: (data: any) => {
      router.push(`/quiz/${data.session._id}`)
    },
  })

  const getQuizAvailability = (quiz: Quiz) => {
    const now = new Date()
    const startTime = new Date(quiz.scheduledStartTime)
    const endTime = new Date(quiz.scheduledEndTime)
    
    const existingSession = sessions.find(s => s.quiz === quiz._id)
    
    if (existingSession) {
      if (existingSession.status === 'submitted') {
        return { status: 'completed', message: 'Quiz completed', canAttempt: false }
      }
      if (existingSession.status === 'in_progress' || existingSession.status === 'started') {
        return { status: 'in_progress', message: 'Continue quiz', canAttempt: true, sessionId: existingSession._id }
      }
    }
    
    if (quiz.status === 'cancelled') {
      return { status: 'cancelled', message: 'Quiz cancelled', canAttempt: false }
    }
    
    if (quiz.status === 'draft') {
      return { status: 'not_available', message: 'Quiz not published', canAttempt: false }
    }
    
    if (isBefore(now, startTime)) {
      return { 
        status: 'upcoming', 
        message: `Starts ${format(startTime, 'MMM d, yyyy h:mm a')}`, 
        canAttempt: false 
      }
    }
    
    if (isAfter(now, endTime)) {
      return { status: 'ended', message: 'Quiz ended', canAttempt: false }
    }
    
    return { status: 'available', message: 'Available now', canAttempt: true }
  }

  // Filter quizzes based on current tab
  const getFilteredQuizzes = () => {
    if (filter === 'all') return quizzes;
    
    return quizzes.filter(quiz => {
      const availability = getQuizAvailability(quiz);
      
      switch (filter) {
        case 'available':
          return availability.status === 'available';
        case 'attempted':
          return availability.status === 'in_progress';
        case 'completed':
          return availability.status === 'completed';
        default:
          return true;
      }
    });
  }

  const filteredQuizzes = getFilteredQuizzes();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100'
      case 'completed': return 'text-blue-600 bg-blue-100'
      case 'in_progress': return 'text-orange-600 bg-orange-100'
      case 'upcoming': return 'text-yellow-600 bg-yellow-100'
      case 'ended': return 'text-gray-600 bg-gray-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleStartQuiz = (quiz: Quiz, availability: any) => {
    if (availability.sessionId) {
      // Continue existing session
      router.push(`/quiz/${availability.sessionId}`)
    } else {
      // Start new session
      startQuizMutation.mutate(quiz._id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quizzes</h2>
          <p className="text-gray-600">Take your scheduled assessments</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'available', label: 'Available', icon: Play },
            { key: 'attempted', label: 'In Progress', icon: Timer },
            { key: 'completed', label: 'Completed', icon: CheckCircle },
            { key: 'all', label: 'All', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Quiz List */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' 
              ? 'Check back later for new quizzes from your teacher.'
              : `No ${filter} quizzes at the moment.`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredQuizzes.map((quiz) => {
            const availability = getQuizAvailability(quiz)
            const statusColor = getStatusColor(availability.status)
            
            return (
              <div
                key={quiz._id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                        {availability.status === 'in_progress' ? 'Continue' : availability.message}
                      </span>
                      {quiz.isProctored && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                          <Shield className="w-3 h-3 mr-1" />
                          Proctored
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{quiz.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {quiz.duration} minutes
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {quiz.questions.length} questions
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {quiz.totalPoints} points
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Due {format(new Date(quiz.scheduledEndTime), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-6">
                    {availability.canAttempt ? (
                      <button
                        onClick={() => handleStartQuiz(quiz, availability)}
                        disabled={startQuizMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {availability.status === 'in_progress' ? 'Continue Quiz' : 'Start Quiz'}
                      </button>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {availability.message}
                      </div>
                    )}
                  </div>
                </div>
                
                {quiz.isProctored && availability.canAttempt && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">Proctored Assessment</p>
                        <p className="text-yellow-700">
                          This quiz requires camera access and browser monitoring. Make sure you're in a quiet, well-lit environment.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}