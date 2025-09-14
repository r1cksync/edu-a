'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { 
  FileText, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface MCQQuestion {
  _id: string
  question: string
  type: 'multiple-choice' | 'true-false'
  options: string[]
  points: number
  correctAnswer: string
}

interface MCQAnswers {
  [questionId: string]: string
}

interface AssignmentData {
  _id: string
  title: string
  description: string
  type: 'mcq' | 'file'
  dueDate: string
  totalPoints: number
  questions?: MCQQuestion[]
  attachments?: Array<{
    _id: string
    fileName: string
    fileSize?: number
    mimeType: string
    fileKey: string
  }>
  classroom?: {
    _id: string
    name: string
  }
  submissions?: any[]
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const assignmentId = params.id as string
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [mcqAnswers, setMcqAnswers] = useState<MCQAnswers>({})
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => apiClient.getAssignment(assignmentId),
  })

  const submitMCQMutation = useMutation({
    mutationFn: (answers: MCQAnswers) => apiClient.submitMCQAssignment(assignmentId, { answers }),
    onSuccess: (result: any) => {
      console.log('MCQ submission successful:', result)
      toast({
        title: 'Assignment Submitted!',
        description: `You scored ${result.score}/${result.totalPoints} points`,
      })
      queryClient.invalidateQueries({ queryKey: ['assignment', assignmentId] })
      setIsSubmitting(false)
    },
    onError: (error: any) => {
      console.error('MCQ submission error:', error)
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit MCQ assignment',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    },
  })

  const submitFilesMutation = useMutation({
    mutationFn: (files: File[]) => apiClient.submitFileAssignment(assignmentId, files),
    onSuccess: (result: any) => {
      toast({
        title: 'Assignment Submitted!',
        description: 'Your files have been submitted successfully.',
      })
      queryClient.invalidateQueries({ queryKey: ['assignment', assignmentId] })
      setSubmissionFiles([])
      setIsSubmitting(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit assignment',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    },
  })

  const handleMCQSubmit = () => {
    if (!assignmentData?.questions) {
      console.log('No questions found in assignment data:', assignmentData)
      return
    }
    
    const unansweredQuestions = assignmentData.questions.filter((q: MCQQuestion) => !mcqAnswers[q._id])
    
    if (unansweredQuestions.length > 0) {
      toast({
        title: 'Incomplete Submission',
        description: `Please answer all ${unansweredQuestions.length} remaining question(s).`,
        variant: 'destructive',
      })
      return
    }

    console.log('Submitting MCQ answers:', mcqAnswers)
    setIsSubmitting(true)
    submitMCQMutation.mutate(mcqAnswers)
  }

  const handleFileSubmit = () => {
    if (submissionFiles.length === 0) {
      toast({
        title: 'No Files Selected',
        description: 'Please select at least one file to submit.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    submitFilesMutation.mutate(submissionFiles)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSubmissionFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSubmissionFiles(prev => prev.filter((_, i) => i !== index))
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!assignment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Assignment not found</h1>
          <p className="text-gray-600 mt-2">The assignment you're looking for doesn't exist.</p>
          <Link href="/dashboard/assignments">
            <Button className="mt-4">Back to Assignments</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const assignmentData = (assignment as any)?.assignment || assignment as AssignmentData
  const userSubmission = (assignment as any)?.submission
  const dueDate = new Date(assignmentData?.dueDate || '')
  const isOverdue = new Date() > dueDate
  const hasSubmitted = !!userSubmission

  const getStatusBadge = () => {
    if (hasSubmitted) {
      if (userSubmission.grade !== undefined) {
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Graded ({userSubmission.grade}/{assignmentData.totalPoints})</Badge>
      }
      return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Submitted</Badge>
    } else if (isOverdue) {
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Overdue</Badge>
    } else {
      return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/assignments">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{assignmentData?.title}</h1>
              <p className="text-gray-600">{assignmentData?.classroom?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {getStatusBadge()}
            <Badge variant="outline" className="capitalize">
              {assignmentData?.type === 'mcq' ? '🧠 MCQ Quiz' : '📄 File Assignment'}
            </Badge>
          </div>
        </div>

        {/* Assignment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-gray-600">{dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="flex items-center">
                <FileText className="mr-2 h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Total Points</p>
                  <p className="text-sm text-gray-600">{assignmentData?.totalPoints} points</p>
                </div>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{assignmentData?.description}</p>
            </div>

            {/* Attachments Section */}
            {assignmentData?.attachments && assignmentData.attachments.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center mb-3">
                  <Upload className="mr-2 h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-medium">Assignment Files</h3>
                </div>
                <div className="space-y-2">
                  {assignmentData.attachments.map((attachment: any) => (
                    <div key={attachment._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{attachment.fileName}</p>
                        <p className="text-sm text-gray-500">
                          {attachment.fileSize ? `${(attachment.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDownloadAttachment(assignmentData._id, attachment._id)}
                        className="ml-3"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission Section for Students */}
        {user?.role === 'student' && !hasSubmitted && !isOverdue && (
          <Card>
            <CardHeader>
              <CardTitle>Submit Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentData?.type === 'mcq' ? (
                // MCQ Form
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-800 font-medium">Quiz Instructions</span>
                    </div>
                    <ul className="text-blue-700 text-sm mt-2 ml-6 list-disc">
                      <li>Answer all questions before submitting</li>
                      <li>You can only submit once</li>
                      <li>Your score will be calculated automatically</li>
                    </ul>
                  </div>

                  {assignmentData?.questions?.map((question: MCQQuestion, index: number) => (
                    <Card key={question._id}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <h3 className="font-medium text-lg">
                            {index + 1}. {question.question}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Points: {question.points}
                          </p>
                          
                          <RadioGroup
                            value={mcqAnswers[question._id] || ''}
                            onValueChange={(value) => setMcqAnswers(prev => ({
                              ...prev,
                              [question._id]: value
                            }))}
                          >
                            {question.type === 'multiple-choice' ? (
                              question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <RadioGroupItem value={option} id={`${question._id}-${optionIndex}`} />
                                  <Label htmlFor={`${question._id}-${optionIndex}`} className="flex-1 cursor-pointer">
                                    {option}
                                  </Label>
                                </div>
                              ))
                            ) : (
                              // True/False
                              <>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="true" id={`${question._id}-true`} />
                                  <Label htmlFor={`${question._id}-true`} className="cursor-pointer">True</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="false" id={`${question._id}-false`} />
                                  <Label htmlFor={`${question._id}-false`} className="cursor-pointer">False</Label>
                                </div>
                              </>
                            )}
                          </RadioGroup>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={() => {
                        console.log('MCQ Submit button clicked')
                        console.log('Assignment data:', assignmentData)
                        console.log('MCQ Answers:', mcqAnswers)
                        handleMCQSubmit()
                      }}
                      disabled={isSubmitting}
                      size="lg"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                    </Button>
                  </div>
                </div>
              ) : (
                // File Upload Form
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-800 font-medium">Submission Instructions</span>
                    </div>
                    <ul className="text-blue-700 text-sm mt-2 ml-6 list-disc">
                      <li>Upload PDF or image files (JPG, PNG)</li>
                      <li>Make sure all pages/content are clearly visible</li>
                      <li>You can upload multiple files</li>
                      <li>Maximum file size: 10MB per file</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Upload Your Answer Files</label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  {submissionFiles.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Selected Files</h4>
                      <div className="space-y-2">
                        {submissionFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleFileSubmit}
                      disabled={isSubmitting || submissionFiles.length === 0}
                      size="lg"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isSubmitting ? 'Uploading...' : 'Submit Files'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show submission status if submitted */}
        {hasSubmitted && (
          <Card>
            <CardHeader>
              <CardTitle>Your Submission</CardTitle>
              <CardDescription>
                Submitted on {new Date(userSubmission.submittedAt).toLocaleDateString()}
                {userSubmission.grade !== undefined && (
                  <span className="ml-2 font-semibold text-green-600">
                    Grade: {userSubmission.grade}/{assignmentData.totalPoints} points
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Submitted</h3>
                <p className="text-gray-600">Your teacher will review and grade your submission.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show overdue message */}
        {!hasSubmitted && isOverdue && user?.role === 'student' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Overdue</h3>
                <p className="text-gray-600">This assignment was due on {dueDate.toLocaleDateString()}.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}