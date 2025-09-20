'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { 
  BookOpen,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Plus,
  Filter,
  Target,
  Brain,
  Sparkles,
  ChevronDown
} from 'lucide-react'
import { CreateDPP } from './CreateDPP'
import { CreateAIDPP } from './CreateAIDPP'
import { AttemptDPP } from './AttemptDPP'
import { DPPAnalytics } from './DPPAnalytics'
import { ViewSubmission } from './ViewSubmission'

interface DPPListProps {
  classroomId: string
  videoClasses: Array<{ _id: string; title: string }>
}

interface DPP {
  _id: string
  title: string
  description: string
  type: 'mcq' | 'file'
  dueDate: string
  estimatedTime: number
  isPublished: boolean
  submissionCount: number
  averageScore: number
  isOverdue: boolean
  hasSubmitted?: boolean
  submission?: any
  videoClass: {
    title: string
  }
  teacher: {
    name: string
  }
  maxScore: number
  tags: string[]
  // For MCQ type
  questions?: Array<{
    difficulty: 'easy' | 'medium' | 'hard'
    marks: number
  }>
  // For file type
  assignmentFiles?: Array<{
    difficulty: 'easy' | 'medium' | 'hard'
    points: number
  }>
  // Virtual properties
  difficultyDistribution?: {
    easy: number
    medium: number
    hard: number
  }
  overallDifficulty?: 'easy' | 'medium' | 'hard'
}

export function DPPList({ classroomId, videoClasses }: DPPListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAICreateModal, setShowAICreateModal] = useState(false)
  const [selectedDPP, setSelectedDPP] = useState<string | null>(null)
  const [analyticsSelectedDPP, setAnalyticsSelectedDPP] = useState<string | null>(null)
  const [viewSubmissionData, setViewSubmissionData] = useState<{dppId: string, submissionId?: string} | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'mcq' | 'file'>('all')
  
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: dppsData, isLoading, error } = useQuery({
    queryKey: ['dpp', classroomId, statusFilter, typeFilter],
    queryFn: () => apiClient.getClassroomDPPs(classroomId, {
      status: statusFilter === 'all' ? undefined : statusFilter
    })
  })

  const publishMutation = useMutation({
    mutationFn: (dppId: string) => apiClient.togglePublishDPP(dppId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpp', classroomId] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (dppId: string) => apiClient.deleteDPP(dppId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpp', classroomId] })
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading DPPs</h3>
            <p className="text-sm text-red-700 mt-1">
              Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const dpps = (dppsData as any)?.dpps || []
  const filteredDPPs = dpps.filter((dpp: DPP) => {
    if (typeFilter !== 'all' && dpp.type !== typeFilter) return false
    if (statusFilter === 'completed' && !dpp.hasSubmitted) return false
    if (statusFilter === 'active' && (dpp.isOverdue || dpp.hasSubmitted)) return false
    if (statusFilter === 'overdue' && (!dpp.isOverdue || dpp.hasSubmitted)) return false
    return true
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (dpp: DPP) => {
    if (dpp.hasSubmitted) return 'text-green-600'
    if (dpp.isOverdue) return 'text-red-600'
    return 'text-yellow-600'
  }

  const getStatusText = (dpp: DPP) => {
    if (dpp.hasSubmitted) return 'Submitted'
    if (dpp.isOverdue) return 'Overdue'
    return 'Pending'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteDPP = async (dppId: string) => {
    if (confirm('Are you sure you want to delete this DPP? This action cannot be undone.')) {
      deleteMutation.mutate(dppId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Practice Problems</h2>
          <p className="text-gray-600 mt-1">
            {user?.role === 'teacher' 
              ? 'Create and manage DPPs for your students'
              : 'Complete your daily practice problems to reinforce learning'
            }
          </p>
        </div>

        {user?.role === 'teacher' && (
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create DPP
            </button>
            <button
              onClick={() => setShowAICreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
            >
              <Brain className="h-4 w-4 mr-2" />
              <Sparkles className="h-4 w-4 mr-1" />
              AI Generate
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="file">File Submission</option>
        </select>
      </div>

      {/* Stats */}
      {user?.role === 'student' && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total DPPs</p>
                <p className="text-2xl font-semibold text-gray-900">{dpps.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dpps.filter((d: DPP) => d.hasSubmitted).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dpps.filter((d: DPP) => !d.hasSubmitted && !d.isOverdue).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dpps.filter((d: DPP) => d.isOverdue && !d.hasSubmitted).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DPP List */}
      <div className="space-y-4">
        {filteredDPPs.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No DPPs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {user?.role === 'teacher' 
                ? "Get started by creating your first DPP."
                : "No DPPs have been assigned yet."
              }
            </p>
          </div>
        ) : (
          filteredDPPs.map((dpp: DPP) => (
            <div
              key={dpp._id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{dpp.title}</h3>
                    {dpp.overallDifficulty && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(dpp.overallDifficulty)}`}>
                        {dpp.overallDifficulty}
                      </span>
                    )}
                    <span className="flex items-center text-sm text-gray-500">
                      {dpp.type === 'mcq' ? <CheckCircle className="h-4 w-4 mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                      {dpp.type === 'mcq' ? 'Multiple Choice' : 'File Submission'}
                    </span>
                    {dpp.difficultyDistribution && (
                      <div className="flex items-center space-x-1">
                        {dpp.difficultyDistribution.easy > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {dpp.difficultyDistribution.easy}E
                          </span>
                        )}
                        {dpp.difficultyDistribution.medium > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {dpp.difficultyDistribution.medium}M
                          </span>
                        )}
                        {dpp.difficultyDistribution.hard > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {dpp.difficultyDistribution.hard}H
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {dpp.description && (
                    <p className="text-gray-600 mb-3">{dpp.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {dpp.videoClass.title}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Due: {formatDate(dpp.dueDate)}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {dpp.estimatedTime} min
                    </span>
                    {user?.role === 'teacher' && (
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {dpp.submissionCount} submissions
                      </span>
                    )}
                    <span className="flex items-center">
                      <Target className="h-4 w-4 mr-1" />
                      Max: {dpp.maxScore} points
                    </span>
                  </div>

                  {dpp.tags && dpp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {dpp.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {user?.role === 'student' && (
                    <>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getStatusColor(dpp)}`}>
                          {getStatusText(dpp)}
                        </p>
                        {dpp.hasSubmitted && dpp.submission && (
                          <p className="text-xs text-gray-500">
                            Score: {dpp.submission.score}/{dpp.maxScore}
                          </p>
                        )}
                      </div>
                      
                      {!dpp.hasSubmitted && !dpp.isOverdue && (
                        <button
                          onClick={() => setSelectedDPP(`attempt-${dpp._id}`)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                        >
                          Attempt DPP
                        </button>
                      )}
                      
                      {dpp.hasSubmitted && (
                        <button
                          onClick={() => setViewSubmissionData({ dppId: dpp._id })}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                        >
                          View Submission
                        </button>
                      )}
                    </>
                  )}

                  {user?.role === 'teacher' && (
                    <>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Avg: {dpp.averageScore || 0}%
                        </p>
                        <p className={`text-xs ${dpp.isPublished ? 'text-green-600' : 'text-yellow-600'}`}>
                          {dpp.isPublished ? 'Published' : 'Draft'}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setAnalyticsSelectedDPP(dpp._id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analytics
                      </button>
                    </>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setSelectedDPP(selectedDPP === dpp._id ? null : dpp._id)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {selectedDPP === dpp._id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              // Navigate to DPP details
                              setSelectedDPP(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4 mr-3" />
                            View Details
                          </button>

                          {user?.role === 'teacher' && (
                            <>
                              <button
                                onClick={() => {
                                  setAnalyticsSelectedDPP(dpp._id)
                                  setSelectedDPP(null)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <BarChart3 className="h-4 w-4 mr-3" />
                                View Analytics
                              </button>

                              <button
                                onClick={() => {
                                  publishMutation.mutate(dpp._id)
                                  setSelectedDPP(null)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <CheckCircle className="h-4 w-4 mr-3" />
                                {dpp.isPublished ? 'Unpublish' : 'Publish'}
                              </button>

                              <button
                                onClick={() => {
                                  // Navigate to edit
                                  setSelectedDPP(null)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4 mr-3" />
                                Edit
                              </button>

                              <button
                                onClick={() => {
                                  handleDeleteDPP(dpp._id)
                                  setSelectedDPP(null)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create DPP Modal */}
      {showCreateModal && (
        <CreateDPP
          classroomId={classroomId}
          videoClasses={videoClasses}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['dpp', classroomId] })
          }}
        />
      )}

      {/* Attempt DPP Modal */}
      {selectedDPP?.startsWith('attempt-') && (
        <AttemptDPP
          dppId={selectedDPP.replace('attempt-', '')}
          onClose={() => setSelectedDPP(null)}
          onSuccess={() => {
            setSelectedDPP(null)
            queryClient.invalidateQueries({ queryKey: ['dpp', classroomId] })
          }}
          onViewSubmission={(submissionId) => {
            setSelectedDPP(null)
            setViewSubmissionData({ dppId: selectedDPP.replace('attempt-', ''), submissionId })
          }}
        />
      )}

      {/* DPP Analytics Modal */}
      {analyticsSelectedDPP && (
        <DPPAnalytics
          dppId={analyticsSelectedDPP}
          onClose={() => setAnalyticsSelectedDPP(null)}
          onViewSubmission={(submissionId) => {
            setAnalyticsSelectedDPP(null)
            setViewSubmissionData({ dppId: analyticsSelectedDPP, submissionId })
          }}
        />
      )}

      {/* View Submission Modal */}
      {viewSubmissionData && (
        <ViewSubmission
          dppId={viewSubmissionData.dppId}
          submissionId={viewSubmissionData.submissionId}
          onClose={() => setViewSubmissionData(null)}
        />
      )}

      {/* AI Create DPP Modal */}
      {showAICreateModal && (
        <CreateAIDPP
          classroomId={classroomId}
          videoClasses={videoClasses}
          onClose={() => setShowAICreateModal(false)}
          onSuccess={() => {
            setShowAICreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['dpp', classroomId] })
          }}
        />
      )}
    </div>
  )
}