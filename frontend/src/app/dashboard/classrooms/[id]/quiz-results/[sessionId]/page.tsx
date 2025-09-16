'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useState } from 'react'
import { CheckCircle, XCircle, Clock, ArrowLeft, Trophy, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface QuizResults {
  session: {
    _id: string
    quiz: {
      _id: string
      title: string
      description: string
      totalPoints: number
    }
    student: {
      _id: string
      name: string
    }
    answers: Array<{
      questionId: string
      selectedOptions: string[]
      isCorrect: boolean
      pointsEarned: number
    }>
    score: number
    percentage: number
    timeSpent: number
    timeSpentFormatted: string
    submittedAt: string
  }
  questions: Array<{
    _id: string
    question: string
    type: 'multiple-choice' | 'true-false'
    options: Array<{
      text: string
      isCorrect: boolean
    }>
    points: number
    explanation?: string
  }>
}

export default function QuizResultsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const classroomId = params.id as string // Changed from params.classroomId to params.id
  const sessionId = params.sessionId as string
  
  // Get URL parameters
  const score = searchParams.get('score') || '0'
  const totalPoints = searchParams.get('totalPoints') || '0'
  const percentage = searchParams.get('percentage') || '0'
  const timeSpent = searchParams.get('timeSpent') || 'N/A'

  // Fetch detailed results
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['quiz-results', sessionId],
    queryFn: () => apiClient.getQuizResults(sessionId) as Promise<QuizResults>,
    enabled: !!sessionId
  })

  const [showExplanations, setShowExplanations] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to load results</h1>
          <p className="text-gray-600 mb-4">There was an error loading your quiz results.</p>
          <Link 
            href={`/dashboard/classrooms/${classroomId}`}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Return to Classroom
          </Link>
        </div>
      </div>
    )
  }

  const session = results?.session
  const questions = results?.questions || []

  // Create a map for easy answer lookup
  const answerMap = new Map()
  session?.answers.forEach(answer => {
    answerMap.set(answer.questionId, answer)
  })

  // Calculate grade level
  const getGradeLevel = (percentage: number) => {
    if (percentage >= 90) return { level: 'A', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (percentage >= 80) return { level: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (percentage >= 70) return { level: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    if (percentage >= 60) return { level: 'D', color: 'text-orange-600', bgColor: 'bg-orange-100' }
    return { level: 'F', color: 'text-red-600', bgColor: 'bg-red-100' }
  }

  const grade = getGradeLevel(Number(percentage))
  const correctAnswers = session?.answers.filter(a => a.isCorrect).length || 0
  const totalQuestions = questions.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/dashboard/classrooms/${classroomId}`}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-500 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Classroom
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
          <p className="text-gray-600 mt-2">{session?.quiz?.title}</p>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className={`w-16 h-16 rounded-full ${grade.bgColor} flex items-center justify-center mr-4`}>
                <span className={`text-2xl font-bold ${grade.color}`}>{grade.level}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{percentage}%</h2>
                <p className="text-gray-600">Overall Score</p>
              </div>
            </div>
            <Trophy className={`w-12 h-12 ${Number(percentage) >= 80 ? 'text-yellow-500' : 'text-gray-400'}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{score}</div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalPoints}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{correctAnswers}/{totalQuestions}</div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{timeSpent}</div>
              <div className="text-sm text-gray-600">Time Spent</div>
            </div>
          </div>
        </div>

        {/* Question Review Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Question Review</h3>
          <button
            onClick={() => setShowExplanations(!showExplanations)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {showExplanations ? 'Hide' : 'Show'} Explanations
          </button>
        </div>

        {/* Questions and Answers */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            const answer = answerMap.get(question._id)
            const selectedOptionIndex = answer?.selectedOptions?.[0] ? parseInt(answer.selectedOptions[0]) : -1
            const isCorrect = answer?.isCorrect || false

            return (
              <div key={question._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-gray-500 mr-2">Question {index + 1}</span>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">{question.question}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{answer?.pointsEarned || 0}/{question.points} pts</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedOptionIndex === optionIndex
                    const isCorrectOption = option.isCorrect
                    
                    let className = "p-3 border rounded-lg "
                    if (isSelected && isCorrect) {
                      className += "bg-green-50 border-green-200"
                    } else if (isSelected && !isCorrect) {
                      className += "bg-red-50 border-red-200"
                    } else if (isCorrectOption) {
                      className += "bg-green-50 border-green-200"
                    } else {
                      className += "bg-gray-50 border-gray-200"
                    }

                    return (
                      <div key={optionIndex} className={className}>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900">{option.text}</span>
                          <div className="flex items-center space-x-2">
                            {isSelected && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                Your Answer
                              </span>
                            )}
                            {isCorrectOption && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                Correct
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {showExplanations && question.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Explanation</h5>
                    <p className="text-blue-800 text-sm">{question.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 text-center">
          <Link
            href={`/dashboard/classrooms/${classroomId}`}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
          >
            Return to Classroom
          </Link>
        </div>
      </div>
    </div>
  )
}