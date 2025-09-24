'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useProctoring, MODERATE_PROCTORING_CONFIG } from '@/lib/proctoring'
import { useQuizSession } from '@/lib/hooks/use-socket'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  Clock,
  AlertTriangle,
  Camera,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Monitor,
  Users,
  Save,
  ArrowLeft,
  ArrowRight,
  Flag,
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react'

// Helper function to format time
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

interface Quiz {
  _id: string
  title: string
  description: string
  questions: Array<{
    _id: string
    type: 'multiple-choice' | 'true-false'
    question: string
    options: Array<{ text: string; isCorrect: boolean }>
    points: number
  }>
  duration: number
  totalPoints: number
  passingScore: number
  isProctored: boolean
  proctoringSettings: any
  scheduledStartTime: string
  scheduledEndTime: string
  status: string
  classroom: {
    _id: string
    name: string
  }
  teacher: {
    _id: string
    name: string
  }
}

interface QuizSession {
  _id: string
  quiz: Quiz
  student: string
  startTime: string
  endTime?: string
  answers: Record<string, string>
  score?: number
  status: 'in_progress' | 'completed' | 'flagged' | 'under_review'
  violations: Array<any>
  riskScore: number
  proctoringData: any
}

interface StudentQuizProps {
  quizId: string
  classroomId: string
  sessionId?: string
  sessionData?: any
}

export default function StudentQuiz({ quizId, classroomId, sessionId, sessionData: passedSessionData }: StudentQuizProps) {
  console.log('🚀 StudentQuiz component initialized with props:', {
    quizId,
    classroomId,
    sessionId,
    hasPassedSessionData: !!passedSessionData,
    passedSessionDataKeys: passedSessionData ? Object.keys(passedSessionData) : []
  })
  
  const router = useRouter()
  const { user } = useAuthStore()
  
  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState<number>(-1) // -1 means not initialized yet
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())
  
  // Proctoring state
  const [showProctoringSetup, setShowProctoringSetup] = useState(false)
  const [proctoringReady, setProctoringReady] = useState(false)
  const [showViolationAlert, setShowViolationAlert] = useState(false)
  const [currentViolation, setCurrentViolation] = useState<string>('')

  // Auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSaveRef = useRef<Date>(new Date())
  const timerStoppedRef = useRef<boolean>(false)
  const renderCountRef = useRef<number>(0)
  
  // Fetch quiz data
  const { data: quizResponse, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => apiClient.getQuiz(quizId),
    enabled: !!quizId
  })

  const quiz = (quizResponse as { quiz: Quiz | undefined })?.quiz

  // Map proctoringSettings to ProctoringConfig
  const proctoringConfig = useMemo(() => {
    if (!quiz?.proctoringSettings) {
      console.log('Using fallback MODERATE_PROCTORING_CONFIG')
      return MODERATE_PROCTORING_CONFIG
    }

    return {
      faceDetection: quiz.proctoringSettings.faceDetection ?? true,
      screenRecording: quiz.proctoringSettings.screenRecording ?? false,
      browserLockdown: quiz.proctoringSettings.browserLockdown ?? true,
      preventTabSwitch: quiz.proctoringSettings.tabSwitchingDetection ?? true,
      allowedTabSwitches: quiz.proctoringSettings.allowedTabSwitches ?? 2,
      microphoneMonitoring: quiz.proctoringSettings.audioMonitoring ?? false,
      environmentScan: quiz.proctoringSettings.roomScan ?? true,
      suspiciousActivityThreshold: quiz.proctoringSettings.suspiciousBehaviorThreshold ?? 70,
      webcamRequired: true,
      preventCopyPaste: true,
      preventRightClick: true,
      idVerification: false,
      allowedLookAways: quiz.proctoringSettings.allowedLookAways ?? 5, // Add if supported by FaceDetectionService
      multiplePersonDetection: quiz.proctoringSettings.multiplePersonDetection ?? true // Add if supported
    }
  }, [quiz?.proctoringSettings])

  // Use passed session data or fetch if not provided
  const shouldFetch = !passedSessionData && !!sessionId
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['quizSession', sessionId],
    queryFn: () => apiClient.getQuizSessionDetails(sessionId!),
    enabled: shouldFetch
  })

  // Extract session from response or use passed data
  const session = passedSessionData || (sessionData as any)?.session

  console.log('QuizPrep:', { quiz, isProctored: quiz?.isProctored, proctoringConfig })

  // Debug session data
  useEffect(() => {
    console.log('🔍 Session data debug:', {
      hasPassedSessionData: !!passedSessionData,
      passedSessionDataKeys: passedSessionData ? Object.keys(passedSessionData) : [],
      hasSessionData: !!sessionData,
      sessionDataKeys: sessionData ? Object.keys(sessionData) : [],
      hasSession: !!session,
      sessionKeys: session ? Object.keys(session) : [],
      sessionId: session?._id,
      sessionStartedAt: session?.startedAt,
      sessionStatus: session?.status,
      isSessionLoading: sessionLoading,
      shouldFetch,
      querySessionId: sessionId
    })
  }, [passedSessionData, sessionData, session, sessionLoading, sessionId, shouldFetch])

  // Use session questions if available, fallback to quiz questions
  const questions = session?.questions || quiz?.questions || []
  const isLoading = quizLoading || sessionLoading
  
  // Debug logging for questions
  useEffect(() => {
    if (questions.length > 0) {
      console.log('Questions loaded:', questions.map((q: any) => ({ id: q._id, question: q.question?.slice(0, 30) })))
    }
  }, [questions])
  
  // Debug current question structure
  useEffect(() => {
    const currentQuestion = questions[currentQuestionIndex]
    if (currentQuestion) {
      console.log('Current question debug:', {
        question: currentQuestion,
        id: currentQuestion._id,
        questionId: currentQuestion.questionId,
        keys: Object.keys(currentQuestion)
      })
    }
  }, [questions, currentQuestionIndex])
  
  // Get classroom name from session or quiz
  const classroomName = session?.classroom?.name || quiz?.classroom?.name || 'Unknown Classroom'

  // Update quiz session state when session data loads
  useEffect(() => {
  console.log('🔍 Session/Quiz data effect triggered:', {
    hasSession: !!session,
    hasQuiz: !!quiz,
    sessionStartedAt: session?.startedAt,
    quizDuration: quiz?.duration,
    currentTimeRemaining: timeRemaining,
    sessionLoading,
    shouldFetch,
    isDataReady: !sessionLoading && (!shouldFetch || session)
  });

  if (session && quiz) {
    console.log('📋 Setting quiz session data...');
    console.log('📊 Session data being processed:', {
      sessionId: session._id,
      startedAt: session.startedAt,
      status: session.status,
      hasAnswers: !!session.answers,
      answersLength: session.answers?.length || 0
    });

    // Only set quizSession if it's a new session or proctoring setup is incomplete
    if (!quizSession || quizSession._id !== session._id) {
      if (quiz.isProctored && session.status === 'in_progress' && !proctoringReady) {
        console.log('⚠️ In-progress session detected for proctored quiz, requiring setup');
        setProctoringReady(false); // Reset proctoring to force setup
        setShowProctoringSetup(true); // Show proctoring setup UI
      } else {
        console.log('🔄 Updating quiz session state');
        setQuizSession(session);
        setAnswers(session.answers || {});
      }
    } else {
      console.log('⏭️ Quiz session already set, skipping');
    }

    // Initialize timer for existing session
    if (session.startedAt && !timerStoppedRef.current) {
      console.log('⏳ About to initialize timer:', {
        hasQuiz: !!quiz,
        hasStartedAt: !!session.startedAt,
        startedAt: session.startedAt,
        quizDuration: session.quiz.duration,
        startedAtType: typeof session.startedAt
      });

      try {
        const startTime = new Date(session.startedAt);
        if (isNaN(startTime.getTime())) {
          console.error('❌ Invalid startedAt date:', session.startedAt);
          return;
        }

        const endTime = new Date(startTime.getTime() + session.quiz.duration * 60000);
        const remaining = Math.max(0, endTime.getTime() - Date.now());

        console.log('⏱️ Initializing timer from existing session:', {
          startTime: startTime.toISOString(),
          duration: session.quiz.duration,
          endTime: endTime.toISOString(),
          remaining,
          remainingMinutes: Math.floor(remaining / 60000),
          isTimerAlreadyStopped: timerStoppedRef.current
        });

        setTimeRemaining(remaining);
      } catch (error) {
        console.error('❌ Error initializing timer:', error);
      }
    }
  }
}, [session, quiz, quizSession, proctoringReady]);

  // Initialize proctoring
  const {
    isInitialized: proctoringInitialized,
    isActive: proctoringActive,
    isLoading: proctoringLoading,
    error: proctoringError,
    violations,
    riskScore,
    videoElement,
    initialize: initializeProctoring,
    start: startProctoring,
    stop: stopProctoring,
    allowStop,
    performEnvironmentScan
  } = useProctoring({
    config: proctoringConfig,
    onViolation: (violation) => {
      console.warn('Violation detected:', violation)
      setCurrentViolation(violation.description)
      setShowViolationAlert(true)
      
      // Report violation to backend
      if (quizSession) {
        reportViolationMutation.mutate({
          sessionId: quizSession._id,
          violation
        })
      }
      
      // Report violation via socket for real-time monitoring
      if (sessionId) {
        socketReportViolation(violation)
      }
      
      // Auto-hide alert after 5 seconds
      setTimeout(() => setShowViolationAlert(false), 5000)
    }
  })

  // Debug proctoring state
  useEffect(() => {
    console.log('🔍 Proctoring state debug:', {
      isInitialized: proctoringInitialized,
      isActive: proctoringActive,
      isLoading: proctoringLoading,
      error: proctoringError,
      violationsCount: violations.length,
      riskScore,
      hasVideoElement: !!videoElement
    })
  }, [proctoringInitialized, proctoringActive, proctoringLoading, proctoringError, violations, riskScore, videoElement])

  // Real-time monitoring integration
  const {
    isConnected: socketConnected,
    interventions,
    reportViolation: socketReportViolation,
    updateProgress: socketUpdateProgress,
    completeQuiz: socketCompleteQuiz
  } = useQuizSession(sessionId || '', quizId)
  
  // Start quiz session mutation
  const startSessionMutation = useMutation({
    mutationFn: (proctoringData?: any) => apiClient.startQuizSession(quizId, proctoringData),
    onSuccess: (session: any) => {
      setQuizSession(session)
      setAnswers(session.answers || {})
      
      if (quiz) {
        const startTime = new Date(session.startTime)
        const endTime = new Date(startTime.getTime() + session.quiz.duration * 60000)
        const remaining = Math.max(0, endTime.getTime() - Date.now())
        console.log('Initializing timer from new session:', {
          startTime: startTime.toISOString(),
          duration: session.quiz.duration,
          endTime: endTime.toISOString(),
          remaining,
          remainingMinutes: Math.floor(remaining / 60000)
        })
        setTimeRemaining(remaining)
      }
    },
    onError: (error) => {
      console.error('Failed to start quiz session:', error)
      alert(`Failed to start quiz session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
  
  // Save answers mutation
  const saveAnswersMutation = useMutation({
    mutationFn: (data: { sessionId: string; answers: Record<string, string> }) =>
      apiClient.saveQuizAnswers(data.sessionId, data.answers),
    onSuccess: () => {
      lastSaveRef.current = new Date()
    }
  })
  
  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: (sessionId: string) => {
      console.log('Submitting quiz for session:', sessionId)
      return apiClient.submitQuiz(sessionId)
    },
    onSuccess: (data) => {
      console.log('✅ Quiz submitted successfully:', data)
      console.log('✅ Redirecting to classroom:', classroomId)
      
      allowStop()
      stopProctoring()
      
      const response = data as any
      const score = response.score || 0
      const totalPoints = response.totalPoints || quiz?.totalPoints || 0
      const percentage = response.percentage || 0
      const timeSpent = response.timeSpent || 'N/A'
      
      console.log(`✅ Quiz completed! Score: ${score}/${totalPoints} (${percentage}%) - Time: ${timeSpent}`)
      
      alert(`Quiz submitted successfully! Score: ${score}/${totalPoints} (${percentage}%) - Time: ${timeSpent}`)
      
      setIsSubmitting(false)
      timerStoppedRef.current = true
      
      if (!quizSession?._id) {
        console.error('❌ Cannot redirect - missing quizSession._id')
        router.push(`/dashboard/classrooms/${classroomId}`)
        return
      }
      
      const redirectUrl = `/dashboard/classrooms/${classroomId}/quiz-results/${quizSession._id}?score=${score}&totalPoints=${totalPoints}&percentage=${percentage}&timeSpent=${timeSpent}`
      console.log('🚀 Redirecting to:', redirectUrl)
      
      try {
        router.push(redirectUrl)
        console.log('✅ Router.push called successfully')
      } catch (error) {
        console.error('❌ Router.push failed:', error)
        router.push(`/dashboard/classrooms/${classroomId}`)
      }
    },
    onError: (error) => {
      console.error('❌ Quiz submission failed:', error)
      alert('Failed to submit quiz. Please try again.')
      setIsSubmitting(false)
    }
  })
  
  // Report violation mutation
  const reportViolationMutation = useMutation({
    mutationFn: (data: { sessionId: string; violation: any }) =>
      apiClient.reportViolation(data.sessionId, data.violation)
  })
  
  // Submit quiz handler
  const handleSubmit = useCallback(async () => {
    if (!quizSession) {
      console.error('No quiz session available for submission')
      return
    }
    
    console.log('🚀 Starting quiz submission process...')
    setIsSubmitting(true)
    
    try {
      console.log('💾 Saving final answers...')
      await saveAnswersMutation.mutateAsync({
        sessionId: quizSession._id,
        answers
      })
      
      console.log('✅ Answers saved, now submitting quiz...')
      
      await submitQuizMutation.mutateAsync(quizSession._id)
      
      console.log('✅ Quiz submitted successfully!')
      
    } catch (error) {
      console.error('❌ Error during submission process:', error)
      setIsSubmitting(false)
      alert('Failed to submit quiz. Please try again.')
    }
  }, [quizSession, answers, saveAnswersMutation, submitQuizMutation])
  
  // Timer effect
  useEffect(() => {
  if (!quizSession || timeRemaining < 0 || timerStoppedRef.current || isSubmitting) {
    if (timeRemaining < 0) {
      console.log('⏳ Timer not initialized yet (timeRemaining < 0)');
    }
    return;
  }

  console.log('🕒 Starting timer with', Math.floor(timeRemaining / 1000), 'seconds remaining');

  const timer = setInterval(() => {
    setTimeRemaining(prev => {
      const newTime = prev - 1000;

      if (newTime <= 0 && !timerStoppedRef.current) {
        console.log('⏰ Time up - auto submitting');
        timerStoppedRef.current = true;
        allowStop();
        handleSubmit();
        return 0;
      }

      if (newTime === 300000) {
        alert('5 minutes remaining! Please finish your quiz soon.');
      }

      return Math.max(0, newTime);
    });
  }, 1000);

  return () => {
    clearInterval(timer);
  };
}, [quizSession?._id, isSubmitting]); // Removed handleSubmit, allowStop from dependencies
  
  // Auto-save effect
  useEffect(() => {
    if (!quizSession || Object.keys(answers).length === 0) return
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveAnswersMutation.mutate({
        sessionId: quizSession._id,
        answers
      })
    }, 30000)
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [answers, quizSession, saveAnswersMutation])

  // Send progress updates via socket
  useEffect(() => {
    if (!quizSession || !questions.length) return

    const answeredCount = Object.keys(answers).length
    socketUpdateProgress({
      currentQuestion: currentQuestionIndex + 1,
      answeredQuestions: answeredCount,
      timeRemaining: timeRemaining
    })
  }, [answers, currentQuestionIndex, timeRemaining, quizSession, questions.length, socketUpdateProgress])
  
  // Handle answer selection
  const handleAnswerSelect = useCallback((questionId: string, optionIndex: number) => {
    console.log('Selecting answer:', { questionId, optionIndex, currentQuestionIndex })
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: optionIndex.toString()
      }
      console.log('Updated answers:', newAnswers)
      return newAnswers
    })
  }, [])
  
  // Handle question navigation
  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index)
    }
  }, [questions.length])
  
  // Flag question
  const toggleQuestionFlag = useCallback((questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }, [])
  
  // Manual save
  const handleManualSave = useCallback(() => {
    if (quizSession) {
      saveAnswersMutation.mutate({
        sessionId: quizSession._id,
        answers
      })
    }
  }, [quizSession, answers, saveAnswersMutation])
  
  // Environment setup
  const handleEnvironmentSetup = useCallback(async () => {
  console.log('Starting environment setup...', { isProctored: quiz?.isProctored })

  if (!quiz?.isProctored) {
    console.log('Quiz is not proctored, setting ready immediately')
    setProctoringReady(true)
    return
  }

  console.log('Quiz is proctored, initializing proctoring system with config:', proctoringConfig)
  setShowProctoringSetup(true)
  setLocalProctoringError(null) // Reset error state

  try {
    console.log('Initializing proctoring...')
    const initResult = await initializeProctoring()
    console.log('Proctoring initialization result:', initResult)

    if (!initResult) {
      throw new Error('Proctoring initialization returned false')
    }

    console.log('Checking camera permissions...')
    const devices = await navigator.mediaDevices.enumerateDevices()
    const hasWebcam = devices.some(device => device.kind === 'videoinput')
    if (!hasWebcam) {
      throw new Error('No webcam detected. Please connect a webcam.')
    }

    console.log('Performing environment scan...')
    const scanResult = await performEnvironmentScan()
    console.log('Environment scan result:', scanResult)

    if (scanResult.success) {
      setProctoringReady(true)
      setShowProctoringSetup(false)
      setLocalProctoringError(null) // Reset error on success
      console.log('Environment setup completed successfully')
    } else {
      console.warn('Environment setup issues detected:', scanResult)
      alert(`Environment setup issues:\n${scanResult.issues.join('\n')}\n\nRecommendations:\n${scanResult.recommendations.join('\n')}`)
    }
  } catch (error) {
    console.error('Environment setup failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during environment setup'
    setLocalProctoringError(errorMessage)
    alert(`Failed to setup proctoring: ${errorMessage}`)
  }
}, [quiz?.isProctored, initializeProctoring, performEnvironmentScan])

  // Proctoring error state
  // Proctoring error state
const [localProctoringError, setLocalProctoringError] = useState<string | null>(null)

  // Start quiz
  const handleStartQuiz = useCallback(async () => {
  if (!proctoringReady) {
    console.log('Cannot start quiz: Proctoring not ready');
    setShowProctoringSetup(true); // Show setup UI if not ready
    return;
  }

  try {
    if (quiz?.isProctored && !proctoringActive) {
      console.log('Starting proctoring with config:', proctoringConfig);
      await startProctoring();
      console.log('Proctoring started successfully');
    }

    console.log('Starting quiz session...');
    await startSessionMutation.mutateAsync(quiz?.isProctored ? { proctoringConfig } : undefined);
    console.log('Quiz session started successfully');
  } catch (error) {
    console.error('Failed to start quiz/proctoring:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error starting quiz';
    setLocalProctoringError(errorMessage);
    alert(`Failed to start quiz: ${errorMessage}`);
  }
}, [proctoringReady, quiz?.isProctored, startProctoring, startSessionMutation, proctoringConfig]);

  // Monitor proctoring state changes
 useEffect(() => {
  if (quiz?.isProctored && quizSession && !proctoringActive && proctoringInitialized) {
    console.log('Proctoring should be active but is not. Ensuring proctoring start...');
    if (!proctoringLoading && !localProctoringError) {
      startProctoring().catch(error => {
        console.error('Retry start proctoring failed:', error);
        setLocalProctoringError(error instanceof Error ? error.message : 'Failed to activate proctoring');
      });
    }
  }
}, [quiz?.isProctored, quizSession, proctoringActive, proctoringInitialized, proctoringLoading, localProctoringError, startProctoring]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h1>
        <p className="text-gray-600">The quiz you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    )
  }
  
  const now = new Date()
  const startTime = new Date(quiz.scheduledStartTime)
  const endTime = new Date(quiz.scheduledEndTime)
  
  if (now < startTime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Clock className="w-16 h-16 text-blue-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Yet Available</h1>
        <p className="text-gray-600 mb-4">This quiz will be available on:</p>
        <p className="text-lg font-semibold text-blue-600">
          {format(startTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {formatDistanceToNow(startTime, { addSuffix: true })}
        </p>
      </div>
    )
  }
  
  if (now > endTime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Has Ended</h1>
        <p className="text-gray-600 mb-4">This quiz ended on:</p>
        <p className="text-lg font-semibold text-red-600">
          {format(endTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
        </p>
      </div>
    )
  }
  
  // Pre-quiz setup
  if (!quizSession) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <QuizPrep
            quiz={quiz}
            questions={questions}
            classroomName={classroomName}
            onEnvironmentSetup={handleEnvironmentSetup}
            onStartQuiz={handleStartQuiz}
            proctoringReady={proctoringReady}
            proctoringLoading={proctoringLoading}
            proctoringError={localProctoringError}
            showProctoringSetup={showProctoringSetup}
            videoElement={videoElement}
          />
        </div>
      </div>
    )
  }
  
  const currentQuestion = questions[currentQuestionIndex]
  
  const answeredCount = Object.keys(answers).length
  const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  // Show loading if questions are not available yet
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  // Show error if no questions available
  if (!questions.length || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load quiz questions.</p>
          <button 
            onClick={() => router.push(`/classrooms/${classroomId}/quizzes`)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Violation Alert */}
      {showViolationAlert && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span>{currentViolation}</span>
          </div>
        </div>
      )}
      
      {/* Quiz Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quiz?.title || 'Quiz'}</h1>
              <p className="text-sm text-gray-600">{classroomName}</p>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Time Remaining */}
              <div className="flex items-center text-lg font-semibold">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                <span className={timeRemaining < 300000 ? 'text-red-600' : 'text-gray-900'}>
                  {Math.floor(timeRemaining / 60000)}:{String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}
                </span>
              </div>
              
              {/* Proctoring Status */}
              {quiz.isProctored && proctoringInitialized && (
  <div className="flex items-center">
    <Shield
      className={`w-5 h-5 mr-2 ${
        proctoringActive ? 'text-green-600' : proctoringLoading ? 'text-yellow-600' : 'text-red-600'
      }`}
    />
    <span
      className={`text-sm ${
        proctoringActive ? 'text-green-600' : proctoringLoading ? 'text-yellow-600' : 'text-red-600'
      }`}
    >
      {/* {proctoringActive
        ? 'Monitoring Active'
        : proctoringLoading
        ? 'Initializing Monitoring...'
        : 'Monitoring Error'} */}
    </span>
    {riskScore > 0 && (
      <span
        className={`ml-2 px-2 py-1 rounded text-xs ${
          riskScore < 30 ? 'bg-green-100 text-green-800' :
          riskScore < 70 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}
      >
        Risk: {riskScore}%
      </span>
    )}
  </div>
)}
              
              {/* Proctoring Error */}
              {/* Proctoring Error */}
{/* {localProctoringError && quiz.isProctored && (
  <div className="flex items-center text-red-600">
    <AlertCircle className="w-5 h-5 mr-2" />
    <span className="text-sm">Proctoring Error: {localProctoringError}</span>
  </div>
)} */}
              
              {/* Save Status */}
              <button
                onClick={handleManualSave}
                disabled={saveAnswersMutation.isPending}
                className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <Save className="w-4 h-4 mr-1" />
                {saveAnswersMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              
              {/* Submit Button */}
              <button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2 inline" />
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress: {answeredCount} of {questions.length} questions answered</span>
              <span>{progressPercentage.toFixed(0)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <QuestionNavigation
              questions={questions}
              currentIndex={currentQuestionIndex}
              answers={answers}
              flaggedQuestions={flaggedQuestions}
              onQuestionSelect={goToQuestion}
              onToggleFlag={toggleQuestionFlag}
            />
          </div>
          
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <QuestionDisplay
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              totalQuestions={questions.length}
              selectedAnswer={answers[currentQuestion._id]}
              isFlagged={flaggedQuestions.has(currentQuestion._id)}
              onAnswerSelect={(optionIndex: number) => handleAnswerSelect(currentQuestion._id, optionIndex)}
              onToggleFlag={() => toggleQuestionFlag(currentQuestion._id)}
              onPrevious={() => goToQuestion(currentQuestionIndex - 1)}
              onNext={() => goToQuestion(currentQuestionIndex + 1)}
              canGoPrevious={currentQuestionIndex > 0}
              canGoNext={currentQuestionIndex < questions.length - 1}
            />
          </div>
        </div>
      </div>
      
      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <SubmitConfirmModal
          quiz={quiz}
          questions={questions}
          answers={answers}
          onConfirm={() => {
            setShowSubmitConfirm(false)
            handleSubmit()
          }}
          onCancel={() => setShowSubmitConfirm(false)}
          isSubmitting={isSubmitting}
          timeRemaining={timeRemaining}
        />
      )}
    </div>
  )
}

// Quiz Preparation Component
function QuizPrep({ 
  quiz, 
  questions,
  classroomName,
  onEnvironmentSetup, 
  onStartQuiz, 
  proctoringReady, 
  proctoringLoading, 
  proctoringError:localProctoringError, 
  showProctoringSetup, 
  videoElement 
}: {
  quiz: Quiz
  questions: any[]
  classroomName: string
  onEnvironmentSetup: () => void
  onStartQuiz: () => void
  proctoringReady: boolean
  proctoringLoading: boolean
  proctoringError: string | null
  showProctoringSetup: boolean
  videoElement: HTMLVideoElement | null
}) {
  const [environmentChecked, setEnvironmentChecked] = useState(false)
  
  // Debug logging for proctoring state
  useEffect(() => {
    console.log('QuizPrep proctoring state:', {
      isProctored: quiz.isProctored,
      environmentChecked,
      proctoringReady,
      proctoringLoading,
      proctoringError:localProctoringError,
      showProctoringSetup
    })
  }, [quiz.isProctored, environmentChecked, proctoringReady, proctoringLoading, localProctoringError, showProctoringSetup])
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
        <p className="text-lg text-gray-600 mb-2">{classroomName}</p>
        <p className="text-gray-500">Instructor: {quiz.teacher?.name || 'Unknown'}</p>
        
        {quiz.description && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700">{quiz.description}</p>
          </div>
        )}
      </div>
      
      {/* Quiz Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600">{quiz.duration}</div>
          <div className="text-sm text-gray-600">Minutes</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{questions.length}</div>
          <div className="text-sm text-gray-600">Questions</div>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600">{quiz.totalPoints}</div>
          <div className="text-sm text-gray-600">Total Points</div>
        </div>
      </div>
      
      {/* Proctoring Requirements */}
      {quiz.isProctored && (
        <div className="mb-8 p-6 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <Shield className="w-6 h-6 text-orange-600 mt-1 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">
                Proctored Assessment
              </h3>
              <p className="text-orange-700 mb-4">
                This quiz is monitored to ensure academic integrity. Please ensure you meet the following requirements:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-orange-700">
                    <Camera className="w-4 h-4 mr-2" />
                    Working webcam required
                  </div>
                  <div className="flex items-center text-sm text-orange-700">
                    <Monitor className="w-4 h-4 mr-2" />
                    Fullscreen mode enforced
                  </div>
                  <div className="flex items-center text-sm text-orange-700">
                    <Eye className="w-4 h-4 mr-2" />
                    Face detection active
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-orange-700">
                    <Users className="w-4 h-4 mr-2" />
                    Take quiz alone
                  </div>
                  <div className="flex items-center text-sm text-orange-700">
                    <XCircle className="w-4 h-4 mr-2" />
                    No external resources
                  </div>
                  <div className="flex items-center text-sm text-orange-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Violations will be flagged
                  </div>
                </div>
              </div>
              
              {/* Camera Preview */}
              {showProctoringSetup && videoElement && (
                <div className="mt-4 p-4 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Camera Preview</h4>
                  <video
                    ref={(el) => {
                      if (el && videoElement) {
                        el.srcObject = videoElement.srcObject
                        el.play()
                      }
                    }}
                    className="w-full max-w-md h-48 bg-black rounded-lg"
                    autoPlay
                    muted
                    playsInline
                  />
                </div>
              )}
              
              {localProctoringError && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-700">{localProctoringError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Read each question carefully before answering
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            You can navigate between questions and change answers before submission
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Your progress is automatically saved every 30 seconds
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            The quiz will auto-submit when time expires
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Passing score: {quiz.passingScore}%
          </li>
        </ul>
      </div>
      
      {/* Environment Check */}
      {quiz.isProctored && !environmentChecked && (
        <div className="text-center mb-6">
          <button
            onClick={() => {
              setEnvironmentChecked(true)
              onEnvironmentSetup()
            }}
            disabled={proctoringLoading}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {proctoringLoading ? 'Setting up...' : 'Setup Environment'}
          </button>
        </div>
      )}

      {/* Proctoring Error Display */}
      {localProctoringError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Proctoring Setup Error</h3>
              <p className="mt-1 text-sm text-red-700">{localProctoringError}</p>
              <p className="mt-2 text-sm text-red-600">
                Please ensure your camera and microphone are connected and you've granted the necessary permissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Setup Status */}
      {quiz.isProctored && environmentChecked && !proctoringReady && !localProctoringError && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Setting up proctoring environment...</h3>
              <p className="mt-1 text-sm text-blue-700">Please wait while we initialize your camera and perform environment checks.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Start Quiz Button */}
      {(proctoringReady || !quiz.isProctored) && (
        <div className="text-center">
          <button
            onClick={onStartQuiz}
            className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            disabled={proctoringLoading}
          >
            Start Quiz
          </button>
        </div>
      )}
    </div>
  )
}

// Question Navigation Component
function QuestionNavigation({ 
  questions, 
  currentIndex, 
  answers, 
  flaggedQuestions, 
  onQuestionSelect, 
  onToggleFlag 
}: {
  questions: Quiz['questions']
  currentIndex: number
  answers: Record<string, string>
  flaggedQuestions: Set<string>
  onQuestionSelect: (index: number) => void
  onToggleFlag: (questionId: string) => void
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions</h3>
      
      <div className="space-y-2">
        {questions.map((question, index) => {
          const isAnswered = answers[question._id] !== undefined
          const isCurrent = index === currentIndex
          const isFlagged = flaggedQuestions.has(question._id)
          
          return (
            <div key={question._id} className="flex items-center space-x-2">
              <button
                onClick={() => onQuestionSelect(index)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                  isCurrent
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : isAnswered
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Question {index + 1}</span>
                  <div className="flex items-center space-x-1">
                    {isAnswered && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    {isFlagged && (
                      <Flag className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  {question.points} {question.points === 1 ? 'point' : 'points'}
                </div>
              </button>
              
              <button
                onClick={() => onToggleFlag(question._id)}
                className={`p-2 rounded-lg transition-colors ${
                  isFlagged
                    ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                    : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-50'
                }`}
                title={isFlagged ? 'Remove flag' : 'Flag for review'}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Answered:</span>
            <span className="font-medium text-green-600">
              {Object.keys(answers).length}/{questions.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Flagged:</span>
            <span className="font-medium text-yellow-600">
              {flaggedQuestions.size}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total Points:</span>
            <span className="font-medium">
              {questions.reduce((sum, q) => sum + q.points, 0)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Progress Circle */}
      <div className="mt-4 flex justify-center">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${(Object.keys(answers).length / questions.length) * 87.96} 87.96`}
              className="text-indigo-600"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-900">
              {Math.round((Object.keys(answers).length / questions.length) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Question Display Component
function QuestionDisplay({ 
  question, 
  questionIndex, 
  totalQuestions, 
  selectedAnswer, 
  isFlagged, 
  onAnswerSelect, 
  onToggleFlag, 
  onPrevious, 
  onNext, 
  canGoPrevious, 
  canGoNext 
}: {
  question: Quiz['questions'][0]
  questionIndex: number
  totalQuestions: number
  selectedAnswer?: string
  isFlagged: boolean
  onAnswerSelect: (optionIndex: number) => void
  onToggleFlag: () => void
  onPrevious: () => void
  onNext: () => void
  canGoPrevious: boolean
  canGoNext: boolean
}) {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Question {questionIndex + 1} of {totalQuestions}
          </h2>
          <p className="text-sm text-gray-600">
            {question.points} {question.points === 1 ? 'point' : 'points'}
          </p>
        </div>
        
        <button
          onClick={onToggleFlag}
          className={`p-3 rounded-lg transition-colors ${
            isFlagged
              ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
              : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-50'
          }`}
          title={isFlagged ? 'Remove flag' : 'Flag for review'}
        >
          <Flag className="w-5 h-5" />
        </button>
      </div>
      
      {/* Question Text */}
      <div className="mb-8">
        <div className="text-lg text-gray-900 leading-relaxed">
          {question.question}
        </div>
      </div>
      
      {/* Answer Options */}
      <div className="space-y-4 mb-8">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index.toString()
          const optionLetter = String.fromCharCode(65 + index) // A, B, C, D
          
          return (
            <label
              key={`${question._id}-${index}`}
              className={`block p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name={`question-${question._id}`}
                  value={index}
                  checked={isSelected}
                  onChange={() => onAnswerSelect(index)}
                  className="mt-1 mr-4 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium mr-3 ${
                      isSelected
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {optionLetter}
                    </span>
                    
                    <span className={`text-gray-900 ${isSelected ? 'font-medium' : ''}`}>
                      {option.text}
                    </span>
                  </div>
                </div>
              </div>
            </label>
          )
        })}
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </button>
        
        <div className="text-sm text-gray-500">
          {selectedAnswer !== undefined ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              Answer selected
            </div>
          ) : (
            'No answer selected'
          )}
        </div>
        
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  )
}

function SubmitConfirmModal({ 
  quiz, 
  questions,
  answers, 
  onConfirm, 
  onCancel, 
  isSubmitting,
  timeRemaining 
}: {
  quiz: Quiz
  questions: any[]
  answers: Record<string, string>
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
  timeRemaining: number
}) {
  const totalQuestions = questions.length
  const answeredQuestions = Object.keys(answers).length
  const unansweredQuestions = totalQuestions - answeredQuestions
  const timeRemainingFormatted = formatTime(timeRemaining)
  
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Submit Quiz
            </h3>
            <p className="text-sm text-gray-500">
              Are you sure you want to submit your quiz?
            </p>
          </div>
        </div>
        
        {/* Quiz Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Quiz Summary</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Questions:</span>
              <span className="ml-2 font-medium">{totalQuestions}</span>
            </div>
            
            <div>
              <span className="text-gray-600">Answered:</span>
              <span className="ml-2 font-medium text-green-600">{answeredQuestions}</span>
            </div>
            
            <div>
              <span className="text-gray-600">Unanswered:</span>
              <span className="ml-2 font-medium text-red-600">{unansweredQuestions}</span>
            </div>
            
            <div>
              <span className="text-gray-600">Time Remaining:</span>
              <span className="ml-2 font-medium text-blue-600">{timeRemainingFormatted}</span>
            </div>
          </div>
        </div>
        
        {/* Warnings */}
        {unansweredQuestions > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Incomplete Quiz
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  You have {unansweredQuestions} unanswered {unansweredQuestions === 1 ? 'question' : 'questions'}. 
                  These will be marked as incorrect if you submit now.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">
                Final Submission
              </h4>
              <p className="text-sm text-red-700 mt-1">
                Once you submit your quiz, you cannot make any changes. Your answers will be final.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue Quiz
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    </div>
  )
}