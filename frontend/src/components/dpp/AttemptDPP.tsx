'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { 
  CheckCircle, 
  FileText, 
  Upload, 
  Target,
  X,
  Send,
  Download
} from 'lucide-react'

interface AttemptDPPProps {
  dppId: string
  onClose: () => void
  onSuccess: () => void
  onViewSubmission?: (submissionId: string) => void
}

interface MCQAnswer {
  questionIndex: number
  selectedOption: string
}

interface DPPData {
  _id: string
  title: string
  description: string
  type: 'mcq' | 'file'
  dueDate: string
  maxScore: number
  overallDifficulty?: 'easy' | 'medium' | 'hard'
  questions?: Array<{
    question: string
    options: Array<{ text: string; isCorrect: boolean }>
    difficulty: 'easy' | 'medium' | 'hard'
    marks: number
  }>
  assignmentFiles?: Array<{
    fileName: string
    fileUrl: string
    difficulty: 'easy' | 'medium' | 'hard'
    description?: string
    points: number
  }>
  instructions?: string
  allowedFileTypes?: string[]
  maxFiles?: number
  maxFileSize?: number
}

export function AttemptDPP({ dppId, onClose, onSuccess, onViewSubmission }: AttemptDPPProps) {
  const [mcqAnswers, setMCQAnswers] = useState<MCQAnswer[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: dppResponse, isLoading } = useQuery({
    queryKey: ['dpp-details', dppId],
    queryFn: () => apiClient.getDPP(dppId)
  })

  const dppData = (dppResponse as any)?.dpp as DPPData

  const submitMCQMutation = useMutation({
    mutationFn: (answers: MCQAnswer[]) => apiClient.submitMCQAnswers(dppId, answers),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['dpp'] })
      if (onViewSubmission && data.submission?._id) {
        onViewSubmission(data.submission._id)
      } else {
        onSuccess()
      }
    }
  })

  const submitFilesMutation = useMutation({
    mutationFn: (files: File[]) => {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      return apiClient.submitDPPFiles(dppId, formData)
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['dpp'] })
      if (onViewSubmission && data.submission?._id) {
        onViewSubmission(data.submission._id)
      } else {
        onSuccess()
      }
    }
  })

  // Timer functionality removed - no time restrictions

  const handleMCQAnswer = (questionIndex: number, selectedOption: string) => {
    setMCQAnswers(prev => {
      const existing = prev.find(a => a.questionIndex === questionIndex)
      if (existing) {
        return prev.map(a => a.questionIndex === questionIndex ? { ...a, selectedOption } : a)
      } else {
        return [...prev, { questionIndex, selectedOption }]
      }
    })
  }

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      setSelectedFiles(Array.from(files))
    }
  }

  const handleMCQSubmit = async () => {
    if (mcqAnswers.length < (dppData?.questions?.length || 0)) {
      alert('Please answer all questions before submitting.')
      return
    }
    
    setIsSubmitting(true)
    try {
      await submitMCQMutation.mutateAsync(mcqAnswers)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to submit.')
      return
    }
    
    setIsSubmitting(true)
    try {
      await submitFilesMutation.mutateAsync(selectedFiles)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-center mt-4">Loading DPP...</p>
        </div>
      </div>
    )
  }

  if (!dppData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">DPP not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    )
  }

  // No time restrictions - always allow submissions

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{dppData.title}</h2>
              <p className="text-gray-600 mt-1">{dppData.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <span className="flex items-center text-sm text-gray-600">
              <Target className="h-4 w-4 mr-1" />
              Max Score: {dppData.maxScore} points
            </span>
            {dppData.overallDifficulty && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(dppData.overallDifficulty)}`}>
                {dppData.overallDifficulty}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {dppData.type === 'mcq' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Questions</h3>
              
              {dppData.questions?.map((question: any, index: number) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      Question {index + 1} ({question.marks} {question.marks === 1 ? 'point' : 'points'})
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{question.question}</p>
                  
                  <div className="space-y-2">
                    {question.options?.map((option: any, optIndex: number) => (
                      <label key={optIndex} className="flex items-center p-3 border rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option.text}
                          onChange={(e) => handleMCQAnswer(index, e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-gray-700">{option.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-end">
                <button
                  onClick={handleMCQSubmit}
                  disabled={isSubmitting || mcqAnswers.length < (dppData.questions?.length || 0)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Answers'}
                </button>
              </div>
            </div>
          )}

          {dppData.type === 'file' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Assignment Files</h3>
              
              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
                <p className="text-blue-800">{dppData.instructions}</p>
              </div>

              {/* Assignment Files to Download */}
              {dppData.assignmentFiles && dppData.assignmentFiles.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Download Assignment Files:</h4>
                  {dppData.assignmentFiles.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <span className="font-medium">{file.fileName}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(file.difficulty)}`}>
                            {file.difficulty}
                          </span>
                          <span className="text-sm text-gray-500">({file.points} points)</span>
                        </div>
                        {file.description && (
                          <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                        )}
                      </div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* File Upload */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Submit Your Solution:</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <label className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Choose files to upload
                        </span>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleFileSelect(e.target.files)}
                          className="sr-only"
                          accept={dppData.allowedFileTypes?.join(',') || '*'}
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        Max {dppData.maxFiles} files, {Math.round((dppData.maxFileSize || 0) / (1024 * 1024))}MB each
                      </p>
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-900">Selected Files:</h5>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleFileSubmit}
                      disabled={isSubmitting || selectedFiles.length === 0}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Uploading...' : 'Submit Files'}
                    </button>
                  </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}