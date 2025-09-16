'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import StudentQuiz from '@/components/quizzes/student-quiz'

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  // Get session details to extract quizId and classroomId
  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['quizSession', sessionId],
    queryFn: () => apiClient.getQuizSessionDetails(sessionId),
    enabled: !!sessionId,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Session Not Found</h1>
          <p className="text-gray-600 mb-4">The quiz session could not be found or has expired.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const session = (sessionData as any).session
  const quizId = session.quiz._id || session.quiz
  const classroomId = session.classroom._id || session.classroom

  return <StudentQuiz quizId={quizId} classroomId={classroomId} sessionId={sessionId} sessionData={session} />
}