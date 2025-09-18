'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  X, 
  Upload,
  Calendar,
  Clock,
  BookOpen,
  Target
} from 'lucide-react'

interface CreateDPPProps {
  classroomId: string
  videoClasses: Array<{ _id: string; title: string }>
  onClose: () => void
  onSuccess: () => void
}

interface MCQQuestion {
  question: string
  options: Array<{ text: string; isCorrect: boolean }>
  explanation: string
  marks: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface AssignmentFile {
  fileName: string
  fileUrl: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string
  points: number
}

export function CreateDPP({ classroomId, videoClasses, onClose, onSuccess }: CreateDPPProps) {
  const [dppData, setDppData] = useState({
    title: '',
    description: '',
    videoClassId: '',
    type: 'mcq' as 'mcq' | 'file',
    estimatedTime: 30,
    dueDate: '',
    tags: [] as string[],
    // MCQ specific
    questions: [] as MCQQuestion[],
    // File specific
    assignmentFiles: [] as AssignmentFile[],
    instructions: '',
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt'],
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 5
  })

  const [currentQuestion, setCurrentQuestion] = useState<MCQQuestion>({
    question: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    explanation: '',
    marks: 1,
    difficulty: 'medium'
  })

  const [newTag, setNewTag] = useState('')
  const [currentAssignmentFile, setCurrentAssignmentFile] = useState<AssignmentFile>({
    fileName: '',
    fileUrl: '',
    difficulty: 'medium',
    description: '',
    points: 10
  })
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.createDPP({
        ...data,
        classroomId,
        videoClassId: data.videoClassId,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpp', classroomId] })
      onSuccess()
      onClose()
    },
    onError: (error) => {
      console.error('Error creating DPP:', error)
      alert('Failed to create DPP. Please try again.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!dppData.title.trim()) {
      alert('Please enter a title')
      return
    }

    if (!dppData.videoClassId) {
      alert('Please select a video class')
      return
    }

    if (dppData.type === 'mcq' && dppData.questions.length === 0) {
      alert('Please add at least one question')
      return
    }

    if (dppData.type === 'file' && dppData.assignmentFiles.length === 0) {
      alert('Please add at least one assignment file')
      return
    }

    if (dppData.type === 'file' && !dppData.instructions.trim()) {
      alert('Please provide instructions for file submission')
      return
    }

    createMutation.mutate(dppData)
  }

  const addQuestion = () => {
    if (!currentQuestion.question.trim()) {
      alert('Please enter a question')
      return
    }

    if (currentQuestion.options.filter(opt => opt.text.trim()).length < 2) {
      alert('Please provide at least 2 options')
      return
    }

    if (!currentQuestion.options.some(opt => opt.isCorrect)) {
      alert('Please mark at least one option as correct')
      return
    }

    setDppData(prev => ({
      ...prev,
      questions: [...prev.questions, { ...currentQuestion }]
    }))

    // Reset current question
    setCurrentQuestion({
      question: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      explanation: '',
      marks: 1,
      difficulty: 'medium'
    })
  }

  const removeQuestion = (index: number) => {
    setDppData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }))
  }

  const addAssignmentFile = () => {
    if (!currentAssignmentFile.fileName.trim() || !currentAssignmentFile.fileUrl.trim()) {
      return
    }

    setDppData(prev => ({
      ...prev,
      assignmentFiles: [...prev.assignmentFiles, { ...currentAssignmentFile }]
    }))

    // Reset current assignment file
    setCurrentAssignmentFile({
      fileName: '',
      fileUrl: '',
      difficulty: 'medium',
      description: '',
      points: 10
    })
  }

  const removeAssignmentFile = (index: number) => {
    setDppData(prev => ({
      ...prev,
      assignmentFiles: prev.assignmentFiles.filter((_, i) => i !== index)
    }))
  }

  const updateQuestionOption = (optionIndex: number, field: string, value: any) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === optionIndex ? { ...opt, [field]: value } : opt
      )
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !dppData.tags.includes(newTag.trim())) {
      setDppData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setDppData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  // Set default due date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 0, 0)
  const defaultDueDate = tomorrow.toISOString().slice(0, 16)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create Daily Practice Problem</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={dppData.title}
                onChange={(e) => setDppData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter DPP title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Class *
              </label>
              <select
                value={dppData.videoClassId}
                onChange={(e) => setDppData(prev => ({ ...prev, videoClassId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select a video class</option>
                {videoClasses.map((vc) => (
                  <option key={vc._id} value={vc._id}>
                    {vc.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={dppData.description}
              onChange={(e) => setDppData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Describe what this DPP covers..."
            />
          </div>

          {/* DPP Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DPP Type *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="mcq"
                  checked={dppData.type === 'mcq'}
                  onChange={(e) => setDppData(prev => ({ ...prev, type: e.target.value as 'mcq' }))}
                  className="mr-2"
                />
                <CheckCircle className="h-4 w-4 mr-1" />
                Multiple Choice Questions
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="file"
                  checked={dppData.type === 'file'}
                  onChange={(e) => setDppData(prev => ({ ...prev, type: e.target.value as 'file' }))}
                  className="mr-2"
                />
                <Upload className="h-4 w-4 mr-1" />
                File Submission
              </label>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Estimated Time (minutes)
              </label>
              <input
                type="number"
                value={dppData.estimatedTime}
                onChange={(e) => setDppData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="5"
                max="180"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="datetime-local"
                value={dppData.dueDate || defaultDueDate}
                onChange={(e) => setDppData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {dppData.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* MCQ Questions */}
          {dppData.type === 'mcq' && (
            <div className="space-y-6">
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Questions</h3>
                
                {/* Existing Questions */}
                {dppData.questions.map((q, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Question {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-gray-700 mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className={`p-2 rounded ${opt.isCorrect ? 'bg-green-100' : 'bg-white'}`}>
                          {opt.text}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-500">Marks: {q.marks}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${q.difficulty === 'easy' ? 'bg-green-100 text-green-800' : 
                          q.difficulty === 'hard' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        <Target className="h-3 w-3 mr-1" />
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Add New Question */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-4">Add New Question</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question *
                      </label>
                      <textarea
                        value={currentQuestion.question}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={2}
                        placeholder="Enter your question..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options *
                      </label>
                      <div className="space-y-2">
                        {currentQuestion.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={option.isCorrect}
                              onChange={(e) => updateQuestionOption(optIndex, 'isCorrect', e.target.checked)}
                              className="rounded"
                            />
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => updateQuestionOption(optIndex, 'text', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder={`Option ${optIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explanation (Optional)
                        </label>
                        <textarea
                          value={currentQuestion.explanation}
                          onChange={(e) => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          rows={2}
                          placeholder="Explain the correct answer..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Marks
                          </label>
                          <input
                            type="number"
                            value={currentQuestion.marks}
                            onChange={(e) => setCurrentQuestion(prev => ({ ...prev, marks: parseInt(e.target.value) || 1 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            min="1"
                            max="10"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Target className="h-4 w-4 inline mr-1" />
                            Difficulty
                          </label>
                          <select
                            value={currentQuestion.difficulty}
                            onChange={(e) => setCurrentQuestion(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addQuestion}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File Submission Settings */}
          {dppData.type === 'file' && (
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900">Assignment Files & Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Instructions *
                </label>
                <textarea
                  value={dppData.instructions}
                  onChange={(e) => setDppData(prev => ({ ...prev, instructions: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Provide general instructions for all assignment files..."
                  required
                />
              </div>

              {/* Existing Assignment Files */}
              {dppData.assignmentFiles.map((file, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Assignment File {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeAssignmentFile(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">File Name:</p>
                      <p className="text-gray-600">{file.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Points:</p>
                      <p className="text-gray-600">{file.points}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">Description:</p>
                    <p className="text-gray-600">{file.description || 'No description'}</p>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${file.difficulty === 'easy' ? 'bg-green-100 text-green-800' : 
                        file.difficulty === 'hard' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      <Target className="h-3 w-3 mr-1" />
                      {file.difficulty}
                    </span>
                  </div>
                </div>
              ))}

              {/* Add New Assignment File */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-4">Add Assignment File</h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        File Name *
                      </label>
                      <input
                        type="text"
                        value={currentAssignmentFile.fileName}
                        onChange={(e) => setCurrentAssignmentFile(prev => ({ ...prev, fileName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Programming Exercise 1.pdf"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        File URL *
                      </label>
                      <input
                        type="url"
                        value={currentAssignmentFile.fileUrl}
                        onChange={(e) => setCurrentAssignmentFile(prev => ({ ...prev, fileUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={currentAssignmentFile.description}
                      onChange={(e) => setCurrentAssignmentFile(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={2}
                      placeholder="Specific instructions for this assignment file..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Points
                      </label>
                      <input
                        type="number"
                        value={currentAssignmentFile.points}
                        onChange={(e) => setCurrentAssignmentFile(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="1"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Target className="h-4 w-4 inline mr-1" />
                        Difficulty *
                      </label>
                      <select
                        value={currentAssignmentFile.difficulty}
                        onChange={(e) => setCurrentAssignmentFile(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addAssignmentFile}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assignment File
                  </button>
                </div>
              </div>

              {/* File Upload Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Student Files
                  </label>
                  <input
                    type="number"
                    value={dppData.maxFiles}
                    onChange={(e) => setDppData(prev => ({ ...prev, maxFiles: parseInt(e.target.value) || 5 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="1"
                    max="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum files students can submit</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max File Size (MB)
                  </label>
                  <input
                    type="number"
                    value={Math.round(dppData.maxFileSize / (1024 * 1024))}
                    onChange={(e) => setDppData(prev => ({ 
                      ...prev, 
                      maxFileSize: (parseInt(e.target.value) || 10) * 1024 * 1024 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Per file size limit</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400 flex items-center"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Create DPP
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}