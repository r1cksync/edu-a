'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Brain,
  RotateCcw,
  Trophy,
  Target,
  Loader2,
  ArrowRight,
  AlertCircle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface RefresherQuizProps {
  sessionId: string
  onSessionComplete: () => void
  onBack: () => void
}

interface Question {
  question: string
  options: Array<{
    text: string
    isCorrect: boolean
  }>
  explanation: string
  difficulty: string
  marks: number
  sourceTopics: string[]
}

interface QuizState {
  currentQuestionIndex: number
  answers: Array<{
    selectedOption: number | null
    timeSpent: number
  }>
  startTime: number
  questionStartTime: number
}

export default function RefresherQuiz({ sessionId, onSessionComplete, onBack }: RefresherQuizProps) {
  const queryClient = useQueryClient()
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: [],
    startTime: Date.now(),
    questionStartTime: Date.now()
  })
  const [showResults, setShowResults] = useState(false)
  const [batchResults, setBatchResults] = useState<any>(null)

  // Get current session data
  const { data: session, isLoading } = useQuery({
    queryKey: ['refresher-session', sessionId],
    queryFn: () => apiClient.getRefresherSession(sessionId),
    refetchInterval: showResults ? false : 30000 // Refresh every 30s during quiz
  })

  // Submit batch answers mutation
  const submitBatchMutation = useMutation({
    mutationFn: async (answers: Array<{ selectedOption: number; timeSpent?: number }>) => {
      return apiClient.submitRefresherBatch(sessionId, { answers })
    },
    onSuccess: (response: any) => {
      setBatchResults(response.data)
      setShowResults(true)
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Submit Answers",
        description: error.message || "Please try again.",
        variant: "destructive"
      })
    }
  })

  // Generate more questions mutation
  const generateMoreMutation = useMutation({
    mutationFn: async (questionsCount: number) => {
      return apiClient.generateMoreRefresherQuestions(sessionId, { questionsCount })
    },
    onSuccess: (response: any) => {
      toast({
        title: "New Questions Generated!",
        description: `AI has created ${response.data.newBatch.questionsCount} new questions based on your recent mistakes.`
      })
      // Reset quiz state for new batch
      setQuizState({
        currentQuestionIndex: 0,
        answers: [],
        startTime: Date.now(),
        questionStartTime: Date.now()
      })
      setShowResults(false)
      setBatchResults(null)
      queryClient.invalidateQueries({ queryKey: ['refresher-session', sessionId] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate Questions",
        description: error.message || "Please try again.",
        variant: "destructive"
      })
    }
  })

  // Conclude session mutation
  const concludeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.concludeRefresherSession(sessionId)
    },
    onSuccess: (response: any) => {
      toast({
        title: "Session Completed!",
        description: "Great job on completing your refresher practice!"
      })
      onSessionComplete()
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Conclude Session",
        description: error.message || "Please try again.",
        variant: "destructive"
      })
    }
  })

  const sessionData = (session as any)?.data
  const currentBatch = sessionData?.currentBatch
  const questions = currentBatch?.questions || []
  const currentQuestion = questions[quizState.currentQuestionIndex]

  // Initialize answers array when questions load
  useEffect(() => {
    if (questions.length > 0 && quizState.answers.length === 0) {
      setQuizState(prev => ({
        ...prev,
        answers: Array(questions.length).fill(null).map(() => ({
          selectedOption: null,
          timeSpent: 0
        }))
      }))
    }
  }, [questions.length, quizState.answers.length])

  // Update question start time when question changes
  useEffect(() => {
    setQuizState(prev => ({
      ...prev,
      questionStartTime: Date.now()
    }))
  }, [quizState.currentQuestionIndex])

  const handleAnswerSelect = (optionIndex: number) => {
    const timeSpent = Math.floor((Date.now() - quizState.questionStartTime) / 1000)
    setQuizState(prev => ({
      ...prev,
      answers: prev.answers.map((answer, index) => 
        index === prev.currentQuestionIndex
          ? { selectedOption: optionIndex, timeSpent }
          : answer
      )
    }))
  }

  const handleNext = () => {
    if (quizState.currentQuestionIndex < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }))
    }
  }

  const handlePrevious = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }))
    }
  }

  const handleSubmitBatch = () => {
    const unansweredQuestions = quizState.answers.filter(answer => answer.selectedOption === null).length
    
    if (unansweredQuestions > 0) {
      toast({
        title: "Incomplete Answers",
        description: `You have ${unansweredQuestions} unanswered questions. Please answer all questions before submitting.`,
        variant: "destructive"
      })
      return
    }

    const submissionData = quizState.answers.map(answer => ({
      selectedOption: answer.selectedOption!,
      timeSpent: answer.timeSpent
    }))

    submitBatchMutation.mutate(submissionData)
  }

  const handleGetMoreQuestions = (count: number) => {
    generateMoreMutation.mutate(count)
  }

  const handleConcludeSession = () => {
    concludeMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading your practice session...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sessionData || !currentBatch) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Session Not Found</h3>
            <p className="text-gray-600 mb-4">
              The refresher session could not be loaded.
            </p>
            <Button onClick={onBack}>Back to Refresher</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show batch results
  if (showResults && batchResults) {
    const canGenerateMore = batchResults.hasIncorrectAnswers
    const accuracy = batchResults.batchResults.score.percentage

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Batch Results</h2>
            <p className="text-gray-600">Batch {batchResults.batchResults.batchNumber + 1} completed</p>
          </div>
        </div>

        {/* Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>Performance Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {batchResults.batchResults.score.correct}
                </div>
                <p className="text-sm text-gray-600">Correct Answers</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {accuracy.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">Accuracy</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {batchResults.batchResults.score.total}
                </div>
                <p className="text-sm text-gray-600">Total Questions</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{accuracy.toFixed(1)}%</span>
              </div>
              <Progress value={accuracy} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Session Stats */}
        {batchResults.sessionStats && (
          <Card>
            <CardHeader>
              <CardTitle>Overall Session Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Questions</p>
                  <p className="text-lg font-semibold">{batchResults.sessionStats.totalQuestions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overall Accuracy</p>
                  <p className="text-lg font-semibold">
                    {((batchResults.sessionStats.totalCorrect / batchResults.sessionStats.totalQuestions) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Time/Question</p>
                  <p className="text-lg font-semibold">{batchResults.sessionStats.averageTimePerQuestion.toFixed(1)}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {canGenerateMore && (
                <>
                  <Button 
                    onClick={() => handleGetMoreQuestions(5)}
                    disabled={generateMoreMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {generateMoreMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Get 5 More Questions
                  </Button>
                  <Button 
                    onClick={() => handleGetMoreQuestions(10)}
                    disabled={generateMoreMutation.isPending}
                    variant="outline"
                    className="flex-1"
                  >
                    Get 10 More Questions
                  </Button>
                </>
              )}
              <Button 
                onClick={handleConcludeSession}
                disabled={concludeMutation.isPending}
                variant={canGenerateMore ? "outline" : "default"}
                className="flex-1"
              >
                {concludeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Conclude Session
              </Button>
            </div>
            {canGenerateMore && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                AI detected some incorrect answers and can generate more targeted practice questions
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show quiz interface
  if (!currentQuestion) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Available</h3>
            <p className="text-gray-600 mb-4">
              There are no questions in this batch.
            </p>
            <Button onClick={onBack}>Back to Refresher</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = ((quizState.currentQuestionIndex + 1) / questions.length) * 100
  const answeredCount = quizState.answers.filter(a => a.selectedOption !== null).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Practice Session</h2>
            <p className="text-gray-600">Batch {currentBatch.batchNumber + 1}</p>
          </div>
        </div>
        <Badge variant="secondary">
          <Brain className="mr-1 h-3 w-3" />
          {currentQuestion.difficulty}
        </Badge>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {quizState.currentQuestionIndex + 1} of {questions.length}</span>
            <span>{answeredCount}/{questions.length} answered</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          {currentQuestion.sourceTopics && currentQuestion.sourceTopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentQuestion.sourceTopics.map((topic: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option: any, index: number) => (
            <Button
              key={index}
              variant={
                quizState.answers[quizState.currentQuestionIndex]?.selectedOption === index
                  ? "default"
                  : "outline"
              }
              className="w-full text-left justify-start h-auto p-4"
              onClick={() => handleAnswerSelect(index)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </div>
                <span>{option.text}</span>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={quizState.currentQuestionIndex === 0}
        >
          Previous
        </Button>
        
        <div className="space-x-2">
          {quizState.currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmitBatch}
              disabled={submitBatchMutation.isPending || answeredCount < questions.length}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitBatchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submit Batch
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}