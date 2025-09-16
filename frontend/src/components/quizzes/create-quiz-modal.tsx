'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { format } from 'date-fns'
import { 
  X,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Shield,
  AlertTriangle,
  HelpCircle,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react'

interface Question {
  id: string
  type: 'multiple-choice' | 'true-false' | 'short-answer'
  question: string
  options: Array<{ text: string; isCorrect: boolean }>
  points: number
  explanation?: string
}

interface ProctoringSettings {
  faceDetection: boolean
  screenRecording: boolean
  browserLockdown: boolean
  preventCopyPaste: boolean
  preventRightClick: boolean
  preventTabSwitch: boolean
  allowedTabSwitches: number
  webcamRequired: boolean
  microphoneMonitoring: boolean
  environmentScan: boolean
  idVerification: boolean
  suspiciousActivityThreshold: number
}

interface CreateQuizModalProps {
  classroomId: string
  onClose: () => void
  onSuccess: () => void
}

const defaultProctoringSettings: ProctoringSettings = {
  faceDetection: true,
  screenRecording: false,
  browserLockdown: true,
  preventCopyPaste: true,
  preventRightClick: true,
  preventTabSwitch: true,
  allowedTabSwitches: 2,
  webcamRequired: true,
  microphoneMonitoring: false,
  environmentScan: true,
  idVerification: false,
  suspiciousActivityThreshold: 70
}

export default function CreateQuizModal({ classroomId, onClose, onSuccess }: CreateQuizModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    duration: 60,
    passingScore: 70,
    scheduledStartTime: '',
    scheduledEndTime: '',
    isProctored: true,
    randomizeQuestions: false,
    showResults: true,
    allowRetakes: false,
    maxAttempts: 1
  })
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [proctoringSettings, setProctoringSettings] = useState<ProctoringSettings>(defaultProctoringSettings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { user } = useAuthStore()

  const createQuizMutation = useMutation({
    mutationFn: (data: any) => apiClient.createQuiz(data),
    onSuccess: () => {
      onSuccess()
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.message || 'Failed to create quiz' })
    }
  })

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!quizData.title.trim()) {
        newErrors.title = 'Quiz title is required'
      }
      if (!quizData.scheduledStartTime) {
        newErrors.scheduledStartTime = 'Start time is required'
      }
      if (!quizData.scheduledEndTime) {
        newErrors.scheduledEndTime = 'End time is required'
      }
      if (quizData.scheduledStartTime && quizData.scheduledEndTime) {
        const start = new Date(quizData.scheduledStartTime)
        const end = new Date(quizData.scheduledEndTime)
        if (start >= end) {
          newErrors.scheduledEndTime = 'End time must be after start time'
        }
      }
      if (quizData.duration < 5) {
        newErrors.duration = 'Duration must be at least 5 minutes'
      }
    }

    if (step === 2) {
      if (questions.length === 0) {
        newErrors.questions = 'At least one question is required'
      }
      questions.forEach((q, index) => {
        if (!q.question.trim()) {
          newErrors[`question_${index}`] = 'Question text is required'
        }
        if (q.type === 'multiple-choice' && !q.options.some(opt => opt.isCorrect)) {
          newErrors[`question_${index}_correct`] = 'At least one correct answer is required'
        }
        if (q.points <= 0) {
          newErrors[`question_${index}_points`] = 'Points must be greater than 0'
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1)
    setErrors({})
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: 'multiple-choice',
      question: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      points: 1
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const updateQuestionOption = (questionId: string, optionIndex: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options]
        newOptions[optionIndex] = { ...newOptions[optionIndex], text }
        return { ...q, options: newOptions }
      }
      return q
    }))
  }

  const toggleCorrectOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = q.options.map((opt, idx) => ({
          ...opt,
          isCorrect: idx === optionIndex ? !opt.isCorrect : (q.type === 'multiple-choice' ? false : opt.isCorrect)
        }))
        return { ...q, options: newOptions }
      }
      return q
    }))
  }

  const handleSubmit = () => {
    if (!validateStep(2)) return

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
    
    const submitData = {
      ...quizData,
      classroomId,
      questions: questions.map(q => ({
        type: q.type,
        question: q.question,
        options: q.options,
        points: q.points,
        explanation: q.explanation
      })),
      totalPoints,
      attempts: quizData.maxAttempts, // Map maxAttempts to attempts for backend
      proctoringSettings: quizData.isProctored ? proctoringSettings : null
    }

    createQuizMutation.mutate(submitData)
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Proctored Quiz</h2>
            <p className="text-sm text-gray-600">Step {currentStep} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-1">
          <div 
            className="bg-indigo-600 h-1 transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              {/* Quiz Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={quizData.title}
                  onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter quiz title"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={quizData.description}
                  onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Brief description of the quiz"
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={quizData.scheduledStartTime}
                    onChange={(e) => setQuizData({ ...quizData, scheduledStartTime: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.scheduledStartTime ? 'border-red-300' : 'border-gray-300'
                    }`}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {errors.scheduledStartTime && <p className="mt-1 text-sm text-red-600">{errors.scheduledStartTime}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={quizData.scheduledEndTime}
                    onChange={(e) => setQuizData({ ...quizData, scheduledEndTime: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.scheduledEndTime ? 'border-red-300' : 'border-gray-300'
                    }`}
                    min={quizData.scheduledStartTime || new Date().toISOString().slice(0, 16)}
                  />
                  {errors.scheduledEndTime && <p className="mt-1 text-sm text-red-600">{errors.scheduledEndTime}</p>}
                </div>
              </div>

              {/* Duration and Passing Score */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={quizData.duration}
                    onChange={(e) => setQuizData({ ...quizData, duration: parseInt(e.target.value) || 60 })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.duration ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={quizData.passingScore}
                    onChange={(e) => setQuizData({ ...quizData, passingScore: parseInt(e.target.value) || 70 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-900">Options</h4>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isProctored"
                    checked={quizData.isProctored}
                    onChange={(e) => setQuizData({ ...quizData, isProctored: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isProctored" className="ml-2 block text-sm text-gray-900">
                    <Shield className="w-4 h-4 inline mr-1 text-orange-600" />
                    Enable Proctoring (Recommended)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="randomizeQuestions"
                    checked={quizData.randomizeQuestions}
                    onChange={(e) => setQuizData({ ...quizData, randomizeQuestions: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="randomizeQuestions" className="ml-2 block text-sm text-gray-900">
                    Randomize question order
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showResults"
                    checked={quizData.showResults}
                    onChange={(e) => setQuizData({ ...quizData, showResults: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showResults" className="ml-2 block text-sm text-gray-900">
                    Show results to students after completion
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Questions</h3>
                <div className="text-sm text-gray-600">
                  Total Points: {totalPoints}
                </div>
              </div>
              
              {errors.questions && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{errors.questions}</p>
                </div>
              )}

              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-900">Question {index + 1}</h4>
                      <button
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Question Text */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text *
                      </label>
                      <textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        rows={2}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                          errors[`question_${index}`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your question"
                      />
                      {errors[`question_${index}`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`question_${index}`]}</p>
                      )}
                    </div>

                    {/* Question Type and Points */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) => updateQuestion(question.id, { 
                            type: e.target.value as Question['type'],
                            options: e.target.value === 'true-false' 
                              ? [{ text: 'True', isCorrect: false }, { text: 'False', isCorrect: false }]
                              : question.options
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="multiple-choice">Multiple Choice</option>
                          <option value="true-false">True/False</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Points *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 1 })}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                            errors[`question_${index}_points`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`question_${index}_points`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`question_${index}_points`]}</p>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Options
                      </label>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => toggleCorrectOption(question.id, optionIndex)}
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                option.isCorrect
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {option.isCorrect && <CheckCircle className="w-3 h-3" />}
                            </button>
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => updateQuestionOption(question.id, optionIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder={`Option ${optionIndex + 1}`}
                              readOnly={question.type === 'true-false'}
                            />
                          </div>
                        ))}
                      </div>
                      {errors[`question_${index}_correct`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`question_${index}_correct`]}</p>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={addQuestion}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Question
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Proctoring Settings</h3>
              
              {!quizData.isProctored ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Proctoring Disabled</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        This quiz will not have proctoring enabled. Students can take the quiz without monitoring.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                      <Shield className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Proctoring Enabled</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Configure monitoring and security settings for this proctored quiz.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Camera & Audio */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Camera & Audio Monitoring</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Face Detection</label>
                          <p className="text-xs text-gray-500">Monitor if student's face is visible</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.faceDetection}
                          onChange={(e) => setProctoringSettings({
                            ...proctoringSettings,
                            faceDetection: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Webcam Required</label>
                          <p className="text-xs text-gray-500">Students must have working webcam</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.webcamRequired}
                          onChange={(e) => setProctoringSettings({
                            ...proctoringSettings,
                            webcamRequired: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Environment Scan</label>
                          <p className="text-xs text-gray-500">Scan room before quiz starts</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.environmentScan}
                          onChange={(e) => setProctoringSettings({
                            ...proctoringSettings,
                            environmentScan: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Browser Security */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Browser Security</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Browser Lockdown</label>
                          <p className="text-xs text-gray-500">Prevent full-screen exit and minimize</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.browserLockdown}
                          onChange={(e) => setProctoringSettings({
                            ...proctoringSettings,
                            browserLockdown: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Prevent Tab Switching</label>
                          <p className="text-xs text-gray-500">Monitor when students switch tabs</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.preventTabSwitch}
                          onChange={(e) => setProctoringSettings({
                            ...proctoringSettings,
                            preventTabSwitch: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>

                      {proctoringSettings.preventTabSwitch && (
                        <div className="ml-4 flex items-center space-x-2">
                          <label className="text-sm text-gray-600">Allowed tab switches:</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={proctoringSettings.allowedTabSwitches}
                            onChange={(e) => setProctoringSettings({
                              ...proctoringSettings,
                              allowedTabSwitches: parseInt(e.target.value) || 0
                            })}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Prevent Copy/Paste</label>
                          <p className="text-xs text-gray-500">Disable copy and paste functions</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.preventCopyPaste}
                          onChange={(e) => setProctoringSettings({
                            ...proctoringSettings,
                            preventCopyPaste: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Prevent Right Click</label>
                          <p className="text-xs text-gray-500">Disable right-click context menu</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.preventRightClick}
                          onChange={(e) => setProctoringSettings({
                            ...proctoringSettings,
                            preventRightClick: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Risk Assessment</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Suspicious Activity Threshold (%)
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="30"
                          max="90"
                          step="10"
                          value={proctoringSettings.suspiciousActivityThreshold}
                          onChange={(e) => setProctoringSettings({
                            ...proctoringSettings,
                            suspiciousActivityThreshold: parseInt(e.target.value)
                          })}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium text-gray-700 w-12">
                          {proctoringSettings.suspiciousActivityThreshold}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Sessions above this threshold will be flagged for manual review
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createQuizMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createQuizMutation.isPending ? 'Creating...' : 'Create Quiz'}
              </button>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="px-6 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}