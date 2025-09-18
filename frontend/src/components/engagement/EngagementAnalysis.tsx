'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { 
  Upload, 
  Brain, 
  Eye, 
  Users, 
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Clock
} from 'lucide-react'

interface Student {
  id: string
  name: string
  email: string
}

interface AnalysisResult {
  student: Student
  timestamp: string
  results: {
    predictedClass: string
    confidence: number
    engagementScore: number
    engagementLevel: string
  }
  probabilities: {
    [key: string]: number
  }
}

interface EngagementAnalysisProps {
  classId?: string
  classes?: Array<{ _id: string; title: string; status: string }>
}

export function EngagementAnalysis({ classId, classes = [] }: EngagementAnalysisProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedClassId, setSelectedClassId] = useState<string>(classId || '')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update selected class when classId prop changes
  useEffect(() => {
    if (classId) {
      setSelectedClassId(classId)
    }
  }, [classId])

  const currentClassId = selectedClassId || classId

  console.log('EngagementAnalysis render:', { classId, selectedClassId, currentClassId, classes })

  // Get students for the class
  const { data: studentsData, isLoading: loadingStudents, error: studentsError } = useQuery({
    queryKey: ['class-students', currentClassId],
    queryFn: () => apiClient.getClassStudents(currentClassId!),
    enabled: !!currentClassId
  })

  console.log('Students query:', { studentsData, loadingStudents, studentsError })

  // Get engagement history
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['engagement-history', currentClassId],
    queryFn: () => apiClient.getClassEngagementHistory(currentClassId!, 10),
    enabled: !!currentClassId
  })

  // Analyze engagement mutation
  const analyzeMutation = useMutation({
    mutationFn: async (data: { file: File; studentId: string; notes?: string }) => {
      const formData = new FormData()
      formData.append('image', data.file)
      formData.append('studentId', data.studentId)
      formData.append('classId', currentClassId!)
      if (data.notes) {
        formData.append('notes', data.notes)
      }

      return apiClient.analyzeStudentEngagement(formData)
    },
    onSuccess: (data) => {
      setAnalysisResult(data.analysis)
      // Reset form
      setSelectedFile(null)
      setPreviewUrl('')
      setSelectedStudent('')
      setNotes('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }

      setSelectedFile(file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile || !selectedStudent || !currentClassId) {
      alert('Please select an image, student, and class')
      return
    }

    analyzeMutation.mutate({
      file: selectedFile,
      studentId: selectedStudent,
      notes: notes.trim() || undefined
    })
  }

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getEngagementBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    if (score >= 40) return 'bg-orange-100'
    return 'bg-red-100'
  }

  const renderProbabilityBar = (className: string, probability: number) => {
    const widthPercentage = probability
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-20 text-xs font-medium text-gray-600">{className}:</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${widthPercentage}%` }}
          />
        </div>
        <span className="w-12 text-xs font-semibold text-gray-700">{probability}%</span>
      </div>
    )
  }

  const students = (studentsData as any)?.students || []
  const history = (historyData as any)?.analyses || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Student Engagement Analysis</h2>
            <p className="text-purple-100">Upload student screenshots to analyze concentration and engagement levels</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload and Analysis Section */}
        <div className="space-y-6">
          {/* Image Upload */}
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload Student Screenshot
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    PNG, JPG up to 10MB
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  id="image-upload"
                  name="image-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </button>
              </div>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="mt-6">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto max-h-64 rounded-lg shadow-md"
                />
              </div>
            )}
          </div>

          {/* Class Selection (if not provided) */}
          {!classId && (
            <div className="bg-white p-6 rounded-lg border">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Choose a class...</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Selection */}
          <div className="bg-white p-6 rounded-lg border">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Student
            </label>
            {loadingStudents ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading students...
              </div>
            ) : (
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!currentClassId}
              >
                <option value="">Choose a student...</option>
                {students.map((student: Student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
            )}
            {!currentClassId && (
              <p className="text-sm text-gray-500 mt-1">Please select a class first</p>
            )}
          </div>

          {/* Optional Notes */}
          <div className="bg-white p-6 rounded-lg border">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any context or observations..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || !selectedStudent || !currentClassId || analyzeMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5" />
                Analyze Engagement
              </>
            )}
          </button>

          {/* Error Display */}
          {analyzeMutation.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Analysis Failed</span>
              </div>
              <p className="text-red-600 mt-1">{analyzeMutation.error.message}</p>
            </div>
          )}
        </div>

        {/* Results and History Section */}
        <div className="space-y-6">
          {/* Latest Analysis Result */}
          {analysisResult && (
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">Analysis Complete</h3>
              </div>

              <div className="space-y-4">
                {/* Student Info */}
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium">{analysisResult.student.name}</p>
                  <p className="text-sm text-gray-600">{analysisResult.student.email}</p>
                </div>

                {/* Main Results */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg ${getEngagementBgColor(analysisResult.results.engagementScore)}`}>
                    <p className="text-sm text-gray-600">Engagement Level</p>
                    <p className={`text-2xl font-bold ${getEngagementColor(analysisResult.results.engagementScore)}`}>
                      {analysisResult.results.engagementScore}%
                    </p>
                    <p className="text-sm font-medium">{analysisResult.results.engagementLevel}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Predicted State</p>
                    <p className="text-lg font-bold text-blue-700">{analysisResult.results.predictedClass}</p>
                    <p className="text-sm text-blue-600">{analysisResult.results.confidence}% confidence</p>
                  </div>
                </div>

                {/* Detailed Probabilities */}
                <div>
                  <h4 className="font-medium mb-3">Detailed Analysis</h4>
                  <div className="space-y-2">
                    {Object.entries(analysisResult.probabilities)
                      .sort(([,a], [,b]) => b - a)
                      .map(([className, probability]) =>
                        renderProbabilityBar(className, probability)
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent History */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Analyses
            </h3>

            {loadingHistory ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">Loading history...</p>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((analysis: AnalysisResult, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{analysis.student.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(analysis.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getEngagementColor(analysis.results.engagementScore)}`}>
                        {analysis.results.engagementScore}%
                      </p>
                      <p className="text-sm text-gray-600">{analysis.results.predictedClass}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No analyses yet</p>
                <p className="text-sm">Upload a student screenshot to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}