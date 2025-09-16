'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  Plus,
  Clock,
  Users,
  Calendar,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Settings,
  Activity
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import QuizMonitoring from './quiz-monitoring'
import QuizReviewDashboard from './quiz-review-dashboard'
import CreateQuizModal from './create-quiz-modal'
import EditQuizModal from './edit-quiz-modal'

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
  classroom: {
    _id: string
    name: string
    classCode: string
  }
  createdAt: string
  updatedAt: string
}

interface TeacherQuizzesProps {
  classroomId: string
}

export default function TeacherQuizzes({ classroomId }: TeacherQuizzesProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMonitoring, setShowMonitoring] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'active' | 'ended'>('all')
  const [activeTab, setActiveTab] = useState('overview')
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Fetch quizzes
  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ['classroomQuizzes', classroomId, filter],
    queryFn: () => apiClient.getClassroomQuizzes(classroomId, { 
      status: filter === 'all' ? undefined : filter 
    }),
    refetchInterval: 30000,
  })

  const quizzes: Quiz[] = (quizzesData as any)?.quizzes || []

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: (quizId: string) => apiClient.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroomQuizzes'] })
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100'
      case 'scheduled': return 'text-blue-600 bg-blue-100'
      case 'active': return 'text-green-600 bg-green-100'
      case 'ended': return 'text-gray-600 bg-gray-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />
      case 'scheduled': return <Clock className="w-4 h-4" />
      case 'active': return <Play className="w-4 h-4" />
      case 'ended': return <CheckCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  const canEditQuiz = (quiz: Quiz) => {
    return quiz.status === 'draft' || quiz.status === 'scheduled'
  }

  const canDeleteQuiz = (quiz: Quiz) => {
    return quiz.status !== 'active'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Quiz Overview</span>
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Live Monitor</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Review Sessions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <QuizOverview 
            quizzes={quizzes}
            filter={filter}
            setFilter={setFilter}
            isLoading={isLoading}
            onCreateQuiz={() => setShowCreateModal(true)}
            onEditQuiz={(quiz) => {
              setSelectedQuiz(quiz)
              setShowEditModal(true)
            }}
            onMonitorQuiz={(quiz) => {
              setSelectedQuiz(quiz)
              setShowMonitoring(true)
            }}
          />
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Live Quiz Monitoring</h3>
            <p className="mt-1 text-sm text-gray-500">
              Monitor active quiz sessions in real-time when students are taking quizzes.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <QuizReviewDashboard classroomId={classroomId} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showCreateModal && (
        <CreateQuizModal
          classroomId={classroomId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['classroomQuizzes'] })
          }}
        />
      )}

      {showEditModal && selectedQuiz && (
        <EditQuizModal
          quiz={selectedQuiz}
          onClose={() => {
            setShowEditModal(false)
            setSelectedQuiz(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedQuiz(null)
            queryClient.invalidateQueries({ queryKey: ['classroomQuizzes'] })
          }}
        />
      )}
      
      {showMonitoring && selectedQuiz && (
        <QuizMonitoring
          quizId={selectedQuiz._id}
          onClose={() => {
            setShowMonitoring(false)
            setSelectedQuiz(null)
          }}
        />
      )}
      
      {showMonitoring && selectedQuiz && (
        <QuizMonitoring
          quizId={selectedQuiz._id}
          onClose={() => {
            setShowMonitoring(false)
            setSelectedQuiz(null)
          }}
        />
      )}
    </div>
  )
}

// Quiz Overview Component
function QuizOverview({ 
  quizzes, 
  filter, 
  setFilter, 
  isLoading, 
  onCreateQuiz, 
  onEditQuiz, 
  onMonitorQuiz 
}: {
  quizzes: Quiz[]
  filter: 'all' | 'scheduled' | 'active' | 'ended'
  setFilter: (filter: 'all' | 'scheduled' | 'active' | 'ended') => void
  isLoading: boolean
  onCreateQuiz: () => void
  onEditQuiz: (quiz: Quiz) => void
  onMonitorQuiz: (quiz: Quiz) => void
}) {
  const queryClient = useQueryClient()

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: (quizId: string) => apiClient.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroomQuizzes'] })
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100'
      case 'scheduled': return 'text-blue-600 bg-blue-100'
      case 'active': return 'text-green-600 bg-green-100'
      case 'ended': return 'text-gray-600 bg-gray-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />
      case 'scheduled': return <Clock className="w-4 h-4" />
      case 'active': return <Play className="w-4 h-4" />
      case 'ended': return <CheckCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  const canEditQuiz = (quiz: Quiz) => {
    return quiz.status === 'draft' || quiz.status === 'scheduled'
  }

  const canDeleteQuiz = (quiz: Quiz) => {
    return quiz.status === 'draft' || (quiz.status === 'scheduled' && quiz.totalStudentsAttempted === 0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proctored Quizzes</h2>
          <p className="text-gray-600">Create and manage secure online assessments</p>
        </div>
        <button
          onClick={onCreateQuiz}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Quiz
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex space-x-1">
          {[
            { key: 'all', label: 'All Quizzes', count: quizzes.length },
            { key: 'scheduled', label: 'Scheduled', count: quizzes.filter(q => q.status === 'scheduled').length },
            { key: 'active', label: 'Active', count: quizzes.filter(q => q.status === 'active').length },
            { key: 'ended', label: 'Completed', count: quizzes.filter(q => q.status === 'ended').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter === tab.key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  filter === tab.key
                    ? 'bg-indigo-200 text-indigo-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quiz List */}
      <div className="bg-white shadow rounded-lg">
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' 
                ? 'Get started by creating your first proctored quiz.'
                : `No ${filter} quizzes at the moment.`
              }
            </p>
            {filter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={onCreateQuiz}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {quizzes.map((quiz) => (
              <div key={quiz._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {quiz.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quiz.status)}`}>
                        {getStatusIcon(quiz.status)}
                        <span className="ml-1 capitalize">{quiz.status}</span>
                      </span>
                      {quiz.isProctored && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-800 bg-green-100">
                          <Shield className="w-3 h-3 mr-1" />
                          Proctored
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
                    
                    <div className="mt-3 flex items-center text-sm text-gray-500 space-x-6">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        {format(new Date(quiz.scheduledStartTime), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        {quiz.duration} minutes
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        {quiz.totalStudentsAttempted || 0}/{quiz.totalStudentsInvited || 0} students
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {quiz.status === 'active' && (
                      <button
                        onClick={() => onMonitorQuiz(quiz)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Monitor
                      </button>
                    )}
                    
                    {canEditQuiz(quiz) && (
                      <>
                        <button
                          onClick={() => onEditQuiz(quiz)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => deleteQuizMutation.mutate(quiz._id)}
                          disabled={deleteQuizMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}