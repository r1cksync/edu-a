'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { 
  BarChart3,
  Users, 
  TrendingUp, 
  Clock, 
  Award, 
  Target,
  X,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react'

interface DPPAnalyticsProps {
  dppId: string
  onClose: () => void
  onViewSubmission?: (submissionId: string) => void
}

interface Analytics {
  dpp: {
    _id: string
    title: string
    type: 'mcq' | 'file'
    maxScore: number
    dueDate: string
    questions?: Array<{
      question: string
      difficulty: 'easy' | 'medium' | 'hard'
      marks: number
    }>
    assignmentFiles?: Array<{
      fileName: string
      difficulty: 'easy' | 'medium' | 'hard'
      points: number
    }>
    difficultyDistribution?: {
      easy: number
      medium: number
      hard: number
    }
    overallDifficulty?: 'easy' | 'medium' | 'hard'
  }
  submissions: Array<{
    _id: string
    student: {
      _id: string
      name: string
      email: string
    }
    score: number
    maxScore: number
    isLate: boolean
    submittedAt: string
    feedback?: string
  }>
  stats: {
    totalStudents: number
    submissionCount: number
    submissionRate: number
    averageScore: number
    onTimeSubmissions: number
    lateSubmissions: number
    topScore: number
    difficultyPerformance: {
      easy: { avg: number; count: number }
      medium: { avg: number; count: number }
      hard: { avg: number; count: number }
    }
  }
}

export function DPPAnalytics({ dppId, onClose, onViewSubmission }: DPPAnalyticsProps) {
  const { data: analytics, isLoading, error } = useQuery<Analytics>({
    queryKey: ['dpp-analytics', dppId],
    queryFn: async () => {
      const result = await apiClient.getDPPAnalytics(dppId)
      return result as Analytics
    }
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-center mt-4">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">Failed to load analytics</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    )
  }

  const { dpp, submissions = [], stats } = analytics

  // Helper function to safely format numbers
  const safeToFixed = (value: any, decimals: number = 1): string => {
    const num = typeof value === 'number' ? value : 0
    return num.toFixed(decimals)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                DPP Analytics
              </h2>
              <p className="text-gray-600 mt-1">{dpp.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${dpp.type === 'mcq' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
              {dpp.type === 'mcq' ? 'Multiple Choice' : 'File Assignment'}
            </span>
            {dpp.overallDifficulty && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(dpp.overallDifficulty)}`}>
                {dpp.overallDifficulty}
              </span>
            )}
            <span className="text-sm text-gray-600">
              Due: {formatDate(dpp.dueDate)}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Submission Rate</p>
                  <p className="text-2xl font-bold text-blue-900">{safeToFixed(stats?.submissionRate)}%</p>
                  <p className="text-xs text-blue-700">{stats?.submissionCount || 0}/{stats?.totalStudents || 0} students</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Average Score</p>
                  <p className="text-2xl font-bold text-green-900">{safeToFixed(stats?.averageScore)}%</p>
                  <p className="text-xs text-green-700">out of {dpp.maxScore} points</p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Top Score</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats?.topScore || 0}</p>
                  <p className="text-xs text-yellow-700">highest submission</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">On Time</p>
                  <p className="text-2xl font-bold text-purple-900">{stats?.onTimeSubmissions || 0}</p>
                  <p className="text-xs text-purple-700">{stats?.lateSubmissions || 0} late</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Difficulty Performance */}
          {dpp.difficultyDistribution && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Performance by Difficulty
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(stats?.difficultyPerformance || {}).map(([difficulty, data]) => {
                  const performanceData = data as { avg: number; count: number }
                  return (
                    <div key={difficulty} className="text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${getDifficultyColor(difficulty)}`}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{safeToFixed(performanceData?.avg)}%</p>
                      <p className="text-sm text-gray-600">{performanceData.count} questions/files</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Content Breakdown */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {dpp.type === 'mcq' ? 'Questions' : 'Assignment Files'}
            </h3>
            
            {dpp.type === 'mcq' && dpp.questions && (
              <div className="space-y-3">
                {dpp.questions.map((question: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Question {index + 1}</p>
                      <p className="text-sm text-gray-600 truncate">{question.question}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                      <span className="text-sm text-gray-600">{question.marks} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dpp.type === 'file' && dpp.assignmentFiles && (
              <div className="space-y-3">
                {dpp.assignmentFiles.map((file: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{file.fileName}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(file.difficulty)}`}>
                        {file.difficulty}
                      </span>
                      <span className="text-sm text-gray-600">{file.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submissions List */}
          <div className="bg-white border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900 flex items-center justify-between">
                Submissions ({submissions?.length || 0})
                <button className="flex items-center px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </button>
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(submissions || []).map((submission: any) => {
                    const percentage = (submission.score / submission.maxScore) * 100
                    return (
                      <tr key={submission._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {submission.student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {submission.student.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${getGradeColor(percentage)}`}>
                              {submission.score}/{submission.maxScore}
                            </span>
                            <span className={`ml-2 text-xs ${getGradeColor(percentage)}`}>
                              ({safeToFixed(percentage)}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            submission.isLate 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {submission.isLate ? (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Late
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                On Time
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {formatDate(submission.submittedAt)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => onViewSubmission?.(submission._id)}
                              className="text-purple-600 hover:text-purple-900 text-sm font-medium flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {analytics.dpp.type === 'file' ? 'Grade' : 'View'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}