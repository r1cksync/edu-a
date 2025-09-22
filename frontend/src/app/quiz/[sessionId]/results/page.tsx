'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Clock, Trophy, RotateCcw } from 'lucide-react'

interface QuizResult {
  id: string
  sessionId: string
  score: number
  totalQuestions: number
  percentage: number
  timeSpent: number
  answers: {
    questionId: string
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    timeSpent: number
  }[]
  completedAt: string
}

export default function QuizResultsPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['quiz-result', sessionId],
    queryFn: async (): Promise<QuizResult> => {
      return await apiClient.get<QuizResult>(`/quiz/sessions/${sessionId}/results`)
    },
    enabled: !!sessionId
  })

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return 'default'
    if (percentage >= 60) return 'secondary'
    return 'destructive'
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <Card>
            <CardContent className="pt-6">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Results Not Found</h2>
              <p className="text-gray-600 mb-4">
                Unable to load quiz results. The session may have expired or the results may not be available yet.
              </p>
              <Button onClick={() => router.push('/quiz')}>
                Back to Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Quiz Results</h1>
          <p className="text-gray-600">Great job completing the quiz!</p>
        </div>

        {/* Score Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(result.percentage)}`}>
                  {result.score}/{result.totalQuestions}
                </div>
                <p className="text-sm text-gray-600">Correct Answers</p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(result.percentage)}`}>
                  {result.percentage}%
                </div>
                <p className="text-sm text-gray-600">Accuracy</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {formatTime(result.timeSpent)}
                </div>
                <p className="text-sm text-gray-600">Time Spent</p>
              </div>
              <div className="text-center">
                <Badge variant={getScoreBadgeVariant(result.percentage)} className="text-lg px-4 py-2">
                  {result.percentage >= 80 ? 'Excellent' : 
                   result.percentage >= 60 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>
            </div>
            <div className="mt-6">
              <Progress value={result.percentage} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <CardDescription>
              Review your answers and see the correct responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {result.answers.map((answer, index) => (
                <div key={answer.questionId} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {answer.isCorrect ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold mb-2">
                        Question {index + 1}
                      </h3>
                      <p className="text-gray-700 mb-3">{answer.question}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">Your Answer:</p>
                          <p className={`p-2 rounded ${
                            answer.isCorrect 
                              ? 'bg-green-50 text-green-700 border border-green-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {answer.userAnswer}
                          </p>
                        </div>
                        {!answer.isCorrect && (
                          <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Correct Answer:</p>
                            <p className="p-2 rounded bg-green-50 text-green-700 border border-green-200">
                              {answer.correctAnswer}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        Time spent: {formatTime(answer.timeSpent)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/quiz')}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Take Another Quiz
          </Button>
          <Button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
