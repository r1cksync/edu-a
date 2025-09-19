'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  User, 
  Clock, 
  Target,
  X,
  Download,
  Award,
  Calendar,
  Eye,
  Star,
  Save
} from 'lucide-react'

interface ViewSubmissionProps {
  dppId: string
  submissionId?: string // For teachers viewing specific student submission
  onClose: () => void
}

interface SubmissionData {
  _id: string
  student: {
    _id: string
    name: string
    email: string
  }
  dpp: {
    _id: string
    title: string
    description: string
    type: 'mcq' | 'file'
    maxScore: number
    questions?: Array<{
      question: string
      options: Array<{ text: string; isCorrect: boolean }>
      difficulty: 'easy' | 'medium' | 'hard'
      marks: number
      explanation?: string
    }>
    assignmentFiles?: Array<{
      fileName: string
      fileUrl: string
      difficulty: 'easy' | 'medium' | 'hard'
      description?: string
      points: number
    }>
  }
  answers?: Array<{
    questionIndex: number
    selectedOption: string
    isCorrect: boolean
    earnedMarks: number
  }>
  files?: Array<{
    fileName: string
    fileUrl: string
    uploadedAt: string
  }>
  score: number
  maxScore: number
  isLate: boolean
  submittedAt: string
  feedback?: string
  gradeOverride?: number
}

export function ViewSubmission({ dppId, submissionId, onClose }: ViewSubmissionProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'details' | 'answers' | 'files'>('details')
  const [isGrading, setIsGrading] = useState(false)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')

  const { data: submissionResponse, isLoading, error } = useQuery({
    queryKey: ['dpp-submission', dppId, submissionId],
    queryFn: () => submissionId 
      ? apiClient.getSubmission(dppId, submissionId)
      : apiClient.getMySubmission(dppId)
  })

  const gradeMutation = useMutation({
    mutationFn: async (gradeData: { score: number; feedback: string }) => {
      return apiClient.gradeDPPSubmission(dppId, submissionData._id, gradeData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpp-submission', dppId, submissionId] })
      queryClient.invalidateQueries({ queryKey: ['dpp-analytics', dppId] })
      setIsGrading(false)
      setScore('')
      setFeedback('')
    },
    onError: (error) => {
      console.error('Error grading submission:', error)
      alert('Failed to grade submission. Please try again.')
    }
  })

  const handleGradeSubmission = () => {
    const scoreNum = parseInt(score)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > submissionData.maxScore) {
      alert(`Score must be a number between 0 and ${submissionData.maxScore}`)
      return
    }
    gradeMutation.mutate({ score: scoreNum, feedback })
  }

  const submissionData = (submissionResponse as any)?.submission as SubmissionData

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading submission...</p>
        </div>
      </div>
    )
  }

  if (error || !submissionData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">Failed to load submission</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'  
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const scorePercentage = (submissionData.score / submissionData.maxScore) * 100

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Submission Details</h2>
              <p className="text-gray-600 mt-1">{submissionData.dpp.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Student Info (for teachers) */}
          {user?.role === 'teacher' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-600 mr-2" />
                <div>
                  <p className="font-medium text-gray-900">{submissionData.student.name}</p>
                  <p className="text-sm text-gray-600">{submissionData.student.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Score Summary */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center">
                <Award className="h-6 w-6 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Score</p>
                  <p className={`text-xl font-bold ${getScoreColor(submissionData.score, submissionData.maxScore)}`}>
                    {submissionData.score} / {submissionData.maxScore}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center">
                <Target className="h-6 w-6 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Percentage</p>
                  <p className={`text-xl font-bold ${getScoreColor(submissionData.score, submissionData.maxScore)}`}>
                    {scorePercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Submitted</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(submissionData.submittedAt)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-orange-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`text-sm font-medium ${submissionData.isLate ? 'text-red-600' : 'text-green-600'}`}>
                    {submissionData.isLate ? 'Late' : 'On Time'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grading Interface (for teachers with file-type DPPs) */}
          {user?.role === 'teacher' && submissionData.dpp.type === 'file' && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Grade Submission
                </h3>
                {!isGrading && (
                  <Button
                    onClick={() => {
                      setIsGrading(true)
                      setScore(submissionData.score.toString())
                      setFeedback(submissionData.feedback || '')
                    }}
                  >
                    {submissionData.score > 0 ? 'Update Grade' : 'Grade Submission'}
                  </Button>
                )}
              </div>

              {isGrading && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Score (out of {submissionData.maxScore})
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max={submissionData.maxScore}
                      value={score}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScore(e.target.value)}
                      placeholder={`Enter score (0-${submissionData.maxScore})`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback (optional)
                    </label>
                    <Textarea
                      value={feedback}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                      rows={4}
                      placeholder="Provide feedback for the student..."
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleGradeSubmission}
                      disabled={gradeMutation.isPending}
                      className="flex items-center bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setIsGrading(false)
                        setScore('')
                        setFeedback('')
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {!isGrading && submissionData.feedback && (
                <div className="mt-3 p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-1">Current Feedback:</p>
                  <p className="text-sm text-gray-600">{submissionData.feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 mt-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye className="h-4 w-4 mr-2" />
              Details
            </button>
            
            {submissionData.dpp.type === 'mcq' && (
              <button
                onClick={() => setActiveTab('answers')}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'answers'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Answers
              </button>
            )}
            
            {submissionData.dpp.type === 'file' && (
              <button
                onClick={() => setActiveTab('files')}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'files'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-4 w-4 mr-2" />
                Files
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">DPP Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{submissionData.dpp.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-sm text-gray-600">Type: {submissionData.dpp.type.toUpperCase()}</span>
                    <span className="text-sm text-gray-600">Max Score: {submissionData.dpp.maxScore}</span>
                  </div>
                </div>
              </div>

              {submissionData.feedback && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Teacher Feedback</h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-blue-900">{submissionData.feedback}</p>
                  </div>
                </div>
              )}

              {/* Score Breakdown */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Score Breakdown</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Points Earned</span>
                    <span className="font-bold text-gray-900">{submissionData.score}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Total Points</span>
                    <span className="font-bold text-gray-900">{submissionData.maxScore}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Percentage</span>
                      <span className={`font-bold ${getScoreColor(submissionData.score, submissionData.maxScore)}`}>
                        {scorePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'answers' && submissionData.dpp.type === 'mcq' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Question Responses</h3>
              
              {submissionData.dpp.questions?.map((question, index) => {
                const answer = submissionData.answers?.find(a => a.questionIndex === index)
                const correctOption = question.options.find(opt => opt.isCorrect)
                
                return (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                        <p className="text-gray-700 mt-1">{question.question}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className="text-sm text-gray-600">{question.marks} pts</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => {
                        const isSelected = answer?.selectedOption === option.text
                        const isCorrect = option.isCorrect
                        
                        return (
                          <div 
                            key={optIndex} 
                            className={`p-3 rounded-lg border ${
                              isSelected && isCorrect 
                                ? 'bg-green-50 border-green-200' 
                                : isSelected && !isCorrect
                                ? 'bg-red-50 border-red-200'
                                : isCorrect
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">{option.text}</span>
                              <div className="flex items-center space-x-2">
                                {isSelected && (
                                  <span className="text-sm text-blue-600 font-medium">Your Answer</span>
                                )}
                                {isCorrect && (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                )}
                                {isSelected && !isCorrect && (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {answer?.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-medium ${answer?.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {answer?.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {answer?.earnedMarks || 0} / {question.marks} points
                      </span>
                    </div>
                    
                    {question.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'files' && submissionData.dpp.type === 'file' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Submitted Files</h3>
              
              {submissionData.files && submissionData.files.length > 0 ? (
                <div className="space-y-4">
                  {submissionData.files.map((file, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-6 w-6 text-gray-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">{file.fileName}</p>
                            <p className="text-sm text-gray-600">
                              Uploaded: {formatDate(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(file.fileUrl, '_blank')}
                          className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No files submitted</p>
                </div>
              )}

              {/* Assignment Files */}
              {submissionData.dpp.assignmentFiles && submissionData.dpp.assignmentFiles.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Assignment Files</h4>
                  <div className="space-y-2">
                    {submissionData.dpp.assignmentFiles.map((file, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-600 mr-3" />
                            <div>
                              <p className="font-medium text-gray-900">{file.fileName}</p>
                              {file.description && (
                                <p className="text-sm text-gray-600">{file.description}</p>
                              )}
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(file.difficulty)}`}>
                                  {file.difficulty}
                                </span>
                                <span className="text-sm text-gray-600">{file.points} pts</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => window.open(file.fileUrl, '_blank')}
                            className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}