'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  BookOpen, 
  Edit3, 
  Save, 
  X, 
  Plus,
  Minus,
  Brain,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface CreateAIDPPProps {
  classroomId: string
  videoClasses: Array<{ _id: string; title: string }>
  onClose: () => void
  onSuccess: () => void
}

interface AIQuestion {
  question: string
  options: Array<{
    text: string
    isCorrect: boolean
  }>
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  marks: number
}

interface AIGenerationData {
  topics: string
  numberOfQuestions: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface PDFGenerationData {
  file: File | null
  numberOfQuestions: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export function CreateAIDPP({ classroomId, videoClasses, onClose, onSuccess }: CreateAIDPPProps) {
  const { user } = useAuthStore()
  const [currentStep, setCurrentStep] = useState<'input' | 'preview' | 'edit'>('input')
  const [generationMode, setGenerationMode] = useState<'topics' | 'pdf'>('topics')
  const [generationData, setGenerationData] = useState<AIGenerationData>({
    topics: '',
    numberOfQuestions: 5,
    difficulty: 'medium'
  })
  const [pdfGenerationData, setPdfGenerationData] = useState<PDFGenerationData>({
    file: null,
    numberOfQuestions: 5,
    difficulty: 'medium'
  })
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([])
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  const [dppDetails, setDppDetails] = useState({
    title: '',
    description: '',
    dueDate: '',
    videoClassId: ''
  })

  const generateQuestionsMutation = useMutation({
    mutationFn: (data: AIGenerationData) => apiClient.generateMCQQuestions(data),
    onSuccess: (response: any) => {
      setGeneratedQuestions(response.data.questions)
      setDppDetails(prev => ({
        ...prev,
        title: `AI Generated DPP: ${generationData.topics}`,
        description: `Auto-generated MCQ questions on: ${generationData.topics}`
      }))
      setCurrentStep('preview')
    },
    onError: (error: any) => {
      alert(`Failed to generate questions: ${error.message}`)
    }
  })

  const generateQuestionsFromPDFMutation = useMutation({
    mutationFn: (data: { file: File; numberOfQuestions: number; difficulty: string }) => {
      const formData = new FormData()
      formData.append('pdf', data.file)
      formData.append('numberOfQuestions', data.numberOfQuestions.toString())
      formData.append('difficulty', data.difficulty)
      
      return apiClient.generateMCQQuestionsFromPDF(formData)
    },
    onSuccess: (response: any) => {
      setGeneratedQuestions(response.data.questions)
      setDppDetails(prev => ({
        ...prev,
        title: `AI Generated DPP: From PDF`,
        description: `Auto-generated MCQ questions from uploaded PDF document`
      }))
      setCurrentStep('preview')
    },
    onError: (error: any) => {
      alert(`Failed to generate questions from PDF: ${error.message}`)
    }
  })

  const createDPPMutation = useMutation({
    mutationFn: async (dppData: any) => {
      return apiClient.createDPP(dppData)
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      alert(`Failed to create DPP: ${error.message}`)
    }
  })

  const handleGenerateQuestions = () => {
    if (generationMode === 'topics') {
      if (!generationData.topics.trim()) {
        alert('Please enter topics for question generation')
        return
      }
      generateQuestionsMutation.mutate(generationData)
    } else {
      if (!pdfGenerationData.file) {
        alert('Please select a PDF file for question generation')
        return
      }
      generateQuestionsFromPDFMutation.mutate({
        file: pdfGenerationData.file,
        numberOfQuestions: pdfGenerationData.numberOfQuestions,
        difficulty: pdfGenerationData.difficulty
      })
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfGenerationData(prev => ({
        ...prev,
        file
      }))
    } else {
      alert('Please select a valid PDF file')
      event.target.value = ''
    }
  }

  const handleEditQuestion = (index: number, updatedQuestion: AIQuestion) => {
    const updated = [...generatedQuestions]
    updated[index] = updatedQuestion
    setGeneratedQuestions(updated)
  }

  const handleDeleteQuestion = (index: number) => {
    const updated = generatedQuestions.filter((_, i) => i !== index)
    setGeneratedQuestions(updated)
  }

  const handleAddQuestion = () => {
    const newQuestion: AIQuestion = {
      question: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      explanation: '',
      difficulty: 'medium',
      marks: 2
    }
    setGeneratedQuestions([...generatedQuestions, newQuestion])
    setEditingQuestionIndex(generatedQuestions.length)
  }

  const handleCreateDPP = () => {
    if (!dppDetails.title.trim() || !dppDetails.dueDate || !dppDetails.videoClassId) {
      alert('Please fill in title, video class, and due date')
      return
    }

    if (generatedQuestions.length === 0) {
      alert('At least one question is required')
      return
    }

    // Validate all questions have correct answers
    const hasInvalidQuestions = generatedQuestions.some(q => 
      !q.question.trim() || 
      q.options.some(opt => !opt.text.trim()) ||
      q.options.filter(opt => opt.isCorrect).length !== 1
    )

    if (hasInvalidQuestions) {
      alert('Please ensure all questions are complete and have exactly one correct answer')
      return
    }

    const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0)

    const dppData = {
      title: dppDetails.title,
      description: dppDetails.description,
      type: 'mcq',
      classroomId: classroomId,
      videoClassId: dppDetails.videoClassId,
      dueDate: new Date(dppDetails.dueDate),
      maxScore: totalMarks,
      questions: generatedQuestions.map(q => ({
        question: q.question,
        options: q.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        marks: q.marks,
        difficulty: q.difficulty,
        explanation: q.explanation
      }))
    }

    createDPPMutation.mutate(dppData)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Create AI-Generated DPP
            </h2>
            <Sparkles className="h-5 w-5 text-purple-500" />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center space-x-4 mb-6">
            <div className={`flex items-center space-x-2 ${currentStep === 'input' ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'input' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="font-medium">Generate</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'preview' || currentStep === 'edit' ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' || currentStep === 'edit' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">Preview & Edit</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center space-x-2 text-gray-400`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200">
                3
              </div>
              <span className="font-medium">Create</span>
            </div>
          </div>

          {/* Step 1: Input */}
          {currentStep === 'input' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>AI Question Generation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Generation Mode Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Input Method
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="topics"
                          checked={generationMode === 'topics'}
                          onChange={(e) => setGenerationMode(e.target.value as 'topics' | 'pdf')}
                          className="h-4 w-4 text-purple-600"
                        />
                        <span className="text-sm font-medium">Manual Topics</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="pdf"
                          checked={generationMode === 'pdf'}
                          onChange={(e) => setGenerationMode(e.target.value as 'topics' | 'pdf')}
                          className="h-4 w-4 text-purple-600"
                        />
                        <span className="text-sm font-medium">Upload PDF</span>
                      </label>
                    </div>
                  </div>

                  {/* Topics Input Mode */}
                  {generationMode === 'topics' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Topics / Subject Matter *
                      </label>
                      <Textarea
                        value={generationData.topics}
                        onChange={(e) => setGenerationData(prev => ({ ...prev, topics: e.target.value }))}
                        placeholder="Enter the topics you want questions about. For example: 'Photosynthesis, cell respiration, and plant biology' or 'Linear equations, quadratic functions, and algebraic expressions'"
                        rows={4}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Be specific about the topics to get better quality questions
                      </p>
                    </div>
                  )}

                  {/* PDF Upload Mode */}
                  {generationMode === 'pdf' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload PDF Document *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                          id="pdf-upload"
                        />
                        <label
                          htmlFor="pdf-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <BookOpen className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {pdfGenerationData.file ? (
                              <span className="text-green-600 font-medium">
                                Selected: {pdfGenerationData.file.name}
                              </span>
                            ) : (
                              'Click to upload PDF file'
                            )}
                          </span>
                          <span className="text-xs text-gray-400">
                            Maximum file size: 10MB
                          </span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        AI will extract text from the PDF and generate questions based on the content
                      </p>
                    </div>
                  )}

                  {/* Number of Questions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Questions *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={generationMode === 'topics' ? generationData.numberOfQuestions : pdfGenerationData.numberOfQuestions}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        if (generationMode === 'topics') {
                          setGenerationData(prev => ({ ...prev, numberOfQuestions: value }))
                        } else {
                          setPdfGenerationData(prev => ({ ...prev, numberOfQuestions: value }))
                        }
                      }}
                      className="w-32"
                    />
                  </div>

                  {/* Difficulty Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={generationMode === 'topics' ? generationData.difficulty : pdfGenerationData.difficulty}
                      onChange={(e) => {
                        const value = e.target.value as 'easy' | 'medium' | 'hard'
                        if (generationMode === 'topics') {
                          setGenerationData(prev => ({ ...prev, difficulty: value }))
                        } else {
                          setPdfGenerationData(prev => ({ ...prev, difficulty: value }))
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="easy">Easy (1 mark each)</option>
                      <option value="medium">Medium (2 marks each)</option>
                      <option value="hard">Hard (3 marks each)</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">AI Generation Tips</h4>
                        <ul className="text-sm text-blue-700 mt-1 space-y-1">
                          <li>• Be specific about topics for better question quality</li>
                          <li>• For PDF mode, ensure the document has clear, readable text</li>
                          <li>• Generated questions will be reviewed before publishing</li>
                          <li>• You can edit, add, or remove questions in the next step</li>
                          <li>• Each question will have 4 multiple choice options</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleGenerateQuestions}
                      disabled={
                        generateQuestionsMutation.isPending || 
                        generateQuestionsFromPDFMutation.isPending ||
                        (generationMode === 'topics' ? !generationData.topics.trim() : !pdfGenerationData.file)
                      }
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {(generateQuestionsMutation.isPending || generateQuestionsFromPDFMutation.isPending) ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                          {generationMode === 'pdf' ? 'Processing PDF...' : 'Generating...'}
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Generate Questions
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Preview & Edit */}
          {(currentStep === 'preview' || currentStep === 'edit') && (
            <div className="space-y-6">
              {/* DPP Details */}
              <Card>
                <CardHeader>
                  <CardTitle>DPP Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <Input
                        value={dppDetails.title}
                        onChange={(e) => setDppDetails(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter DPP title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video Class *
                      </label>
                      <select
                        value={dppDetails.videoClassId}
                        onChange={(e) => setDppDetails(prev => ({ ...prev, videoClassId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select Video Class</option>
                        {videoClasses.map((vc) => (
                          <option key={vc._id} value={vc._id}>
                            {vc.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date *
                      </label>
                      <Input
                        type="datetime-local"
                        value={dppDetails.dueDate}
                        onChange={(e) => setDppDetails(prev => ({ ...prev, dueDate: e.target.value }))}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Textarea
                      value={dppDetails.description}
                      onChange={(e) => setDppDetails(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter DPP description"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Questions Summary */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Generated Questions ({generatedQuestions.length})</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Total: {totalMarks} marks</Badge>
                    <Button 
                      size="sm" 
                      onClick={handleAddQuestion}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Question
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {generatedQuestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No questions generated yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {generatedQuestions.map((question, index) => (
                        <QuestionPreview
                          key={index}
                          question={question}
                          index={index}
                          isEditing={editingQuestionIndex === index}
                          onEdit={(updated) => handleEditQuestion(index, updated)}
                          onStartEdit={() => setEditingQuestionIndex(index)}
                          onStopEdit={() => setEditingQuestionIndex(null)}
                          onDelete={() => handleDeleteQuestion(index)}
                          getDifficultyColor={getDifficultyColor}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('input')}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateDPP}
                    disabled={createDPPMutation.isPending || generatedQuestions.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createDPPMutation.isPending ? (
                      <>
                        <Save className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create DPP
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Question Preview Component
interface QuestionPreviewProps {
  question: AIQuestion
  index: number
  isEditing: boolean
  onEdit: (question: AIQuestion) => void
  onStartEdit: () => void
  onStopEdit: () => void
  onDelete: () => void
  getDifficultyColor: (difficulty: string) => string
}

function QuestionPreview({ 
  question, 
  index, 
  isEditing, 
  onEdit, 
  onStartEdit, 
  onStopEdit, 
  onDelete,
  getDifficultyColor 
}: QuestionPreviewProps) {
  const [editedQuestion, setEditedQuestion] = useState<AIQuestion>(question)

  const handleSave = () => {
    // Validate that exactly one option is correct
    const correctCount = editedQuestion.options.filter(opt => opt.isCorrect).length
    if (correctCount !== 1) {
      alert('Exactly one option must be marked as correct')
      return
    }
    
    // Validate that all fields are filled
    if (!editedQuestion.question.trim() || editedQuestion.options.some(opt => !opt.text.trim())) {
      alert('Please fill in all question and option fields')
      return
    }

    onEdit(editedQuestion)
    onStopEdit()
  }

  const handleCancel = () => {
    setEditedQuestion(question)
    onStopEdit()
  }

  const handleOptionChange = (optionIndex: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const updated = { ...editedQuestion }
    if (field === 'isCorrect' && value === true) {
      // If marking this option as correct, unmark all others
      updated.options = updated.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === optionIndex
      }))
    } else {
      updated.options[optionIndex] = {
        ...updated.options[optionIndex],
        [field]: value
      }
    }
    setEditedQuestion(updated)
  }

  if (isEditing) {
    return (
      <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question {index + 1}
            </label>
            <Textarea
              value={editedQuestion.question}
              onChange={(e) => setEditedQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter the question"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options (select the correct one)
            </label>
            <div className="space-y-2">
              {editedQuestion.options.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`question-${index}-correct`}
                    checked={option.isCorrect}
                    onChange={() => handleOptionChange(optIndex, 'isCorrect', true)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <Input
                    value={option.text}
                    onChange={(e) => handleOptionChange(optIndex, 'text', e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={editedQuestion.marks}
                onChange={(e) => setEditedQuestion(prev => ({ 
                  ...prev, 
                  marks: Math.max(1, parseInt(e.target.value) || 1) 
                }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={editedQuestion.difficulty}
                onChange={(e) => setEditedQuestion(prev => ({ 
                  ...prev, 
                  difficulty: e.target.value as 'easy' | 'medium' | 'hard'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Explanation (optional)
            </label>
            <Textarea
              value={editedQuestion.explanation}
              onChange={(e) => setEditedQuestion(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="Explain why the correct answer is right"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Question {index + 1}</span>
          <Badge className={getDifficultyColor(question.difficulty)}>
            {question.difficulty}
          </Badge>
          <Badge variant="outline">{question.marks} marks</Badge>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onStartEdit}>
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-gray-900 font-medium">{question.question}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {question.options.map((option, optIndex) => (
            <div 
              key={optIndex} 
              className={`p-2 rounded border ${
                option.isCorrect 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <span className="font-medium">{String.fromCharCode(65 + optIndex)}. </span>
              {option.text}
              {option.isCorrect && <CheckCircle className="h-4 w-4 inline ml-2 text-green-600" />}
            </div>
          ))}
        </div>
        {question.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              <strong>Explanation:</strong> {question.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}