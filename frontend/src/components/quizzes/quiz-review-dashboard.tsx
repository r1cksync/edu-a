'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { format } from 'date-fns'
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Clock, 
  Eye, 
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Filter,
  Search,
  Download,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface QuizReviewDashboardProps {
  classroomId: string
}

export default function QuizReviewDashboard({ classroomId }: QuizReviewDashboardProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged' | 'reviewed'>('pending')
  const [riskLevel, setRiskLevel] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  // Fetch quiz sessions for review
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['quizSessionsForReview', classroomId, filter, riskLevel],
    queryFn: () => apiClient.getSessionsForReview(classroomId, {
      status: filter === 'all' ? undefined : filter,
      riskLevel: riskLevel === 'all' ? undefined : riskLevel,
      limit: 50
    }),
    refetchInterval: 30000,
  })

  // Review session mutation
  const reviewSessionMutation = useMutation({
    mutationFn: ({ sessionId, decision, notes, scoreAdjustment }: {
      sessionId: string
      decision: 'accept' | 'reject' | 'partial_credit' | 'retake_required'
      notes?: string
      scoreAdjustment?: number
    }) => apiClient.reviewQuizSession(sessionId, { decision, notes, scoreAdjustment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizSessionsForReview'] })
    },
  })

  const sessions = (sessionsData as any)?.sessions || []

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200'
      case 'medium': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'low': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-blue-600 bg-blue-100'
      case 'flagged': return 'text-red-600 bg-red-100'
      case 'reviewed': return 'text-green-600 bg-green-100'
      case 'under_review': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleReviewDecision = (sessionId: string, decision: string, notes?: string, scoreAdjustment?: number) => {
    reviewSessionMutation.mutate({
      sessionId,
      decision: decision as any,
      notes,
      scoreAdjustment
    })
  }

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  const filteredSessions = sessions.filter((session: any) => {
    const matchesSearch = searchTerm === '' || 
      session.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2" />
            Quiz Review Dashboard
          </h2>
          <p className="text-gray-600">Review and manage flagged quiz submissions</p>
        </div>
        
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <Download className="w-4 h-4 mr-2" />
          Export Reports
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Sessions</option>
              <option value="pending">Pending Review</option>
              <option value="flagged">Flagged</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or quiz title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'pending' 
                ? 'No quiz sessions pending review.'
                : 'No quiz sessions match your current filters.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSessions.map((session: any) => (
              <div key={session._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <button
                        onClick={() => toggleSessionExpansion(session._id)}
                        className="flex items-center text-sm font-medium text-gray-900 hover:text-gray-700"
                      >
                        {expandedSessions.has(session._id) ? (
                          <ChevronDown className="w-4 h-4 mr-1" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-1" />
                        )}
                        {session.student.name}
                      </button>
                      
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusColor(session.status)
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>

                      {session.riskLevel && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          getRiskColor(session.riskLevel)
                        }`}>
                          {session.riskLevel} risk
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Quiz: {session.quiz.title}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Submitted: {format(new Date(session.submittedAt), 'MMM d, yyyy h:mm a')}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Score: {session.score}% ({session.totalViolations || 0} violations)
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {session.status === 'flagged' || session.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleReviewDecision(session._id, 'accept')}
                          disabled={reviewSessionMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accept
                        </button>
                        
                        <button
                          onClick={() => handleReviewDecision(session._id, 'reject')}
                          disabled={reviewSessionMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </button>
                        
                        <button
                          onClick={() => toggleSessionExpansion(session._id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Reviewed on {format(new Date(session.reviewedAt || session.updatedAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Session Details */}
                {expandedSessions.has(session._id) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Violations */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Violations ({session.violations?.length || 0})
                        </h4>
                        
                        {session.violations?.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {session.violations.map((violation: any, index: number) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-md">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">
                                    {violation.type.replace('_', ' ')}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    getRiskColor(violation.severity)
                                  }`}>
                                    {violation.severity}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{violation.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {format(new Date(violation.timestamp), 'h:mm:ss a')}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No violations detected</p>
                        )}
                      </div>

                      {/* Review Actions */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Review Actions</h4>
                        
                        <div className="space-y-3">
                          <textarea
                            placeholder="Add review notes..."
                            className="w-full p-3 border border-gray-300 rounded-md text-sm"
                            rows={3}
                          />
                          
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-700">Score Adjustment:</label>
                            <input
                              type="number"
                              min="-100"
                              max="100"
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="±%"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleReviewDecision(session._id, 'accept')}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept
                            </button>
                            
                            <button
                              onClick={() => handleReviewDecision(session._id, 'partial_credit')}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200"
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Partial Credit
                            </button>
                            
                            <button
                              onClick={() => handleReviewDecision(session._id, 'reject')}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}