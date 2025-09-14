'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { 
  Plus, 
  FileText, 
  Calendar,
  Clock,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

// Question Editor Component
interface QuestionEditorProps {
  question: {
    question: string;
    type: 'multiple-choice' | 'true-false';
    options: string[];
    correctAnswer: string;
    points: number;
  };
  index: number;
  onUpdate: (index: number, question: any) => void;
  onDelete: () => void;
}

function QuestionEditor({ question, index, onUpdate, onDelete }: QuestionEditorProps) {
  const updateQuestion = (field: string, value: any) => {
    onUpdate(index, { ...question, [field]: value })
  }

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...question.options]
    newOptions[optionIndex] = value
    updateQuestion('options', newOptions)
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium">Question {index + 1}</h5>
          <div className="flex items-center space-x-2">
            <select
              value={question.type}
              onChange={(e) => updateQuestion('type', e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Question Text *</label>
          <Textarea
            value={question.question}
            onChange={(e) => updateQuestion('question', e.target.value)}
            placeholder="Enter your question..."
            rows={2}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {question.type === 'multiple-choice' ? (
            <div className="col-span-2">
              <label className="text-sm font-medium">Options *</label>
              <div className="space-y-2 mt-1">
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={`correct-${index}`}
                      checked={question.correctAnswer === option}
                      onChange={() => updateQuestion('correctAnswer', option)}
                      className="text-blue-600"
                    />
                    <Input
                      value={option}
                      onChange={(e) => updateOption(optionIndex, e.target.value)}
                      placeholder={`Option ${optionIndex + 1}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Select the correct answer by clicking the radio button</p>
            </div>
          ) : (
            <div className="col-span-1">
              <label className="text-sm font-medium">Correct Answer *</label>
              <select
                value={question.correctAnswer}
                onChange={(e) => updateQuestion('correctAnswer', e.target.value)}
                className="w-full mt-1 border rounded px-3 py-2"
              >
                <option value="">Select...</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}
          
          <div className="col-span-1">
            <label className="text-sm font-medium">Points *</label>
            <Input
              type="number"
              min="1"
              value={question.points}
              onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

interface ClassroomAssignmentsProps {
  classroomId: string
  isTeacher: boolean
}

export default function ClassroomAssignments({ classroomId, isTeacher }: ClassroomAssignmentsProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    points: 100,
    type: 'file' as 'mcq' | 'file',
    questions: [] as Array<{
      question: string;
      type: 'multiple-choice' | 'true-false';
      options: string[];
      correctAnswer: string;
      points: number;
    }>,
    timeLimit: 0, // 0 means no time limit
  })
  
  // Separate state for file attachments (not sent to backend for assignment creation)
  const [attachments, setAttachments] = useState<File[]>([])
  
  // Filter state for assignment types
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mcq' | 'file'>('all')

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', classroomId],
    queryFn: () => apiClient.getAssignments(classroomId),
  })

  // Handle backend response structure: { assignments: [], total: number }
  const assignmentsList = Array.isArray(assignments) ? assignments : (assignments as any)?.assignments || []

  // Filter assignments based on selected type
  const filteredAssignments = assignmentsList.filter((assignment: any) => {
    if (assignmentFilter === 'all') return true
    if (assignmentFilter === 'mcq') return assignment.type === 'mcq'
    if (assignmentFilter === 'file') return assignment.type === 'file'
    return true
  })

  const createAssignmentMutation = useMutation({
    mutationFn: (data: typeof newAssignment & { classroom: string }) => apiClient.createAssignment(data),
    onSuccess: async (result: any) => {
      const assignmentId = result.assignment._id
      
      // Upload attachments if any exist
      if (attachments.length > 0) {
        try {
          await apiClient.addAssignmentAttachments(assignmentId, attachments)
          toast({
            title: 'Assignment created with attachments!',
            description: `Your assignment with ${attachments.length} attachment(s) has been posted to the class.`,
          })
        } catch (error) {
          toast({
            title: 'Assignment created, but attachment upload failed',
            description: 'The assignment was created successfully, but some attachments could not be uploaded.',
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: 'Assignment created!',
          description: 'Your assignment has been posted to the class.',
        })
      }
      
      queryClient.invalidateQueries({ queryKey: ['assignments', classroomId] })
      setIsCreateDialogOpen(false)
      setNewAssignment({ title: '', description: '', dueDate: '', points: 100, type: 'file', questions: [], timeLimit: 0 })
      setAttachments([])
    },
  })

  const handleCreateAssignment = () => {
    if (!newAssignment.title.trim() || !newAssignment.description.trim() || !newAssignment.dueDate) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })
      return
    }

    if (newAssignment.type === 'mcq' && newAssignment.questions.length === 0) {
      toast({
        title: 'No questions added',
        description: 'Please add at least one question for MCQ assignments.',
        variant: 'destructive',
      })
      return
    }

    // Calculate total points for MCQ
    const totalPoints = newAssignment.type === 'mcq' 
      ? newAssignment.questions.reduce((sum, q) => sum + q.points, 0)
      : newAssignment.points

    // Prepare assignment data - only include timeLimit for MCQ assignments
    const assignmentData: any = { ...newAssignment }
    if (newAssignment.type === 'file' || newAssignment.timeLimit === 0) {
      delete assignmentData.timeLimit
    }

    createAssignmentMutation.mutate({ 
      ...assignmentData, 
      classroom: classroomId,
      points: totalPoints
    })
  }

  // Question management functions
  const addQuestion = () => {
    setNewAssignment(prev => ({
      ...prev,
      questions: [...prev.questions, {
        question: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1
      }]
    }))
  }

  const updateQuestion = (index: number, updatedQuestion: any) => {
    setNewAssignment(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? updatedQuestion : q)
    }))
  }

  const deleteQuestion = (index: number) => {
    setNewAssignment(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }))
  }

  // File management functions
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleDownloadAttachment = async (assignmentId: string, attachmentId: string) => {
    try {
      await apiClient.downloadAssignmentAttachment(assignmentId, attachmentId)
      toast({
        title: 'Download started',
        description: 'Your file download has begun.',
      })
    } catch (error: any) {
      console.error('Download error:', error)
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download attachment',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (assignment: any) => {
    const now = new Date()
    const dueDate = new Date(assignment.dueDate)
    const isOverdue = now > dueDate

    if (isTeacher) {
      const submissionCount = assignment.submissions?.length || 0
      return (
        <Badge variant={submissionCount > 0 ? 'default' : 'secondary'}>
          {submissionCount} submissions
        </Badge>
      )
    } else {
      const userSubmission = assignment.submissions?.find((sub: any) => sub.student === user?.id)
      if (userSubmission) {
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Submitted</Badge>
      } else if (isOverdue) {
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Overdue</Badge>
      } else {
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Assignment Button */}
      {isTeacher && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>
                Create a new assignment for your students to complete.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Assignment Type Selection */}
              <div>
                <label className="text-sm font-medium">Assignment Type *</label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={newAssignment.type === 'file' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewAssignment(prev => ({ ...prev, type: 'file' }))}
                  >
                    📄 File-based Assignment
                  </Button>
                  <Button
                    type="button"
                    variant={newAssignment.type === 'mcq' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewAssignment(prev => ({ ...prev, type: 'mcq' }))}
                  >
                    ❓ MCQ Quiz
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {newAssignment.type === 'file' 
                    ? 'Students submit files (PDF, images) for manual grading'
                    : 'Multiple choice questions with automatic grading'
                  }
                </p>
              </div>

              {/* Basic Assignment Details */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Assignment title..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Assignment instructions and requirements..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Due Date *</label>
                  <Input
                    type="datetime-local"
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Total Points</label>
                  <Input
                    type="number"
                    value={newAssignment.points}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, points: parseInt(e.target.value) || 100 }))}
                    placeholder="100"
                    className="mt-1"
                    disabled={newAssignment.type === 'mcq'} // Auto-calculated for MCQ
                  />
                </div>
                {newAssignment.type === 'mcq' && (
                  <div>
                    <label className="text-sm font-medium">Time Limit (minutes)</label>
                    <Input
                      type="number"
                      value={newAssignment.timeLimit}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 0 }))}
                      placeholder="0 (no limit)"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* MCQ Questions Section */}
              {newAssignment.type === 'mcq' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium">Questions</h4>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addQuestion}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>
                  
                  {newAssignment.questions.map((question, index) => (
                    <QuestionEditor
                      key={index}
                      question={question}
                      index={index}
                      onUpdate={updateQuestion}
                      onDelete={() => deleteQuestion(index)}
                    />
                  ))}
                  
                  {newAssignment.questions.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-gray-500">No questions added yet. Click "Add Question" to start.</p>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Total Points: {newAssignment.questions.reduce((sum, q) => sum + q.points, 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* File Upload Section for File Assignments */}
              {newAssignment.type === 'file' && (
                <div>
                  <label className="text-sm font-medium">Question Files (Optional)</label>
                  <div className="mt-2">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload PDF or image files containing assignment questions (optional)
                    </p>
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <span>{file.name}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAssignment} disabled={createAssignmentMutation.isPending}>
                  {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Filter Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Assignments ({filteredAssignments.length})
        </h2>
        <div className="flex space-x-2">
          <Button 
            variant={assignmentFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAssignmentFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={assignmentFilter === 'mcq' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAssignmentFilter('mcq')}
          >
            🧠 MCQ
          </Button>
          <Button 
            variant={assignmentFilter === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAssignmentFilter('file')}
          >
            📄 File
          </Button>
        </div>
      </div>

      {/* Assignments List */}
      {!filteredAssignments || filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
            <p className="text-gray-500">
              {isTeacher 
                ? 'Create your first assignment to give students work to complete.'
                : 'Your teacher will post assignments here for you to complete.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment: any) => (
            <Card key={assignment._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
                      <Badge variant="outline" className="capitalize">
                        {assignment.type === 'mcq' ? '🧠 MCQ Quiz' : '📄 File Assignment'}
                      </Badge>
                      {getStatusBadge(assignment)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <FileText className="mr-1 h-4 w-4" />
                        {assignment.points} points
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {isTeacher ? (
                      <Link href={`/dashboard/assignments/${assignment._id}`}>
                        <Button variant="outline" size="sm">
                          {assignment.type === 'mcq' ? 'View Results' : 'View & Grade'}
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/dashboard/assignments/${assignment._id}`}>
                        <Button variant="outline" size="sm">
                          View Assignment
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 line-clamp-2">{assignment.description}</p>
                {assignment.attachments && assignment.attachments.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center mb-2 text-sm text-gray-500">
                      <Upload className="mr-1 h-4 w-4" />
                      {assignment.attachments.length} attachment(s)
                    </div>
                    <div className="space-y-1">
                      {assignment.attachments.map((attachment: any) => (
                        <div key={attachment._id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                          <span className="truncate flex-1 mr-2" title={attachment.fileName}>
                            {attachment.fileName}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(assignment._id, attachment._id)}
                            className="h-6 px-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}