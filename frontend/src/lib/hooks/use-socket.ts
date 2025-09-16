import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth'

interface UseSocketOptions {
  autoConnect?: boolean
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options
  const { token, user } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !autoConnect) return

    const serverUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'
    
    socketRef.current = io(serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id)
      setIsConnected(true)
      setError(null)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message)
      setError(error.message)
      setIsConnected(false)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [token, autoConnect])

  const emit = (event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data)
      return true
    }
    return false
  }

  const on = (event: string, handler: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler)
      return true
    }
    return false
  }

  const off = (event: string, handler?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler)
      return true
    }
    return false
  }

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off
  }
}

// Hook specifically for quiz monitoring (teachers)
export function useQuizMonitoring(quizId: string) {
  const { socket, isConnected, emit, on, off } = useSocket()
  const [activeStudents, setActiveStudents] = useState<any[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [studentProgress, setStudentProgress] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!socket || !isConnected || !quizId) return

    // Join quiz monitoring room
    emit('join-quiz-monitoring', { quizId })

    // Listen for student events
    const handleStudentStarted = (data: any) => {
      setActiveStudents(prev => [...prev, data])
    }

    const handleViolationAlert = (data: any) => {
      setViolations(prev => [data, ...prev])
    }

    const handleStudentProgress = (data: any) => {
      setStudentProgress(prev => ({
        ...prev,
        [data.studentId]: data
      }))
    }

    const handleStudentCompleted = (data: any) => {
      setActiveStudents(prev => prev.filter(s => s.studentId !== data.studentId))
    }

    const handleStudentDisconnected = (data: any) => {
      setActiveStudents(prev => prev.filter(s => s.studentId !== data.studentId))
      setViolations(prev => [{
        ...data,
        violation: { type: 'disconnection', severity: 'high' }
      }, ...prev])
    }

    on('student-started-quiz', handleStudentStarted)
    on('violation-alert', handleViolationAlert)
    on('student-progress', handleStudentProgress)
    on('student-completed-quiz', handleStudentCompleted)
    on('student-disconnected', handleStudentDisconnected)

    return () => {
      off('student-started-quiz', handleStudentStarted)
      off('violation-alert', handleViolationAlert)
      off('student-progress', handleStudentProgress)
      off('student-completed-quiz', handleStudentCompleted)
      off('student-disconnected', handleStudentDisconnected)
    }
  }, [socket, isConnected, quizId, emit, on, off])

  const sendIntervention = (sessionId: string, action: string, message?: string) => {
    return emit('teacher-intervention', {
      sessionId,
      action,
      message
    })
  }

  return {
    isConnected,
    activeStudents,
    violations,
    studentProgress,
    sendIntervention
  }
}

// Hook specifically for quiz taking (students)
export function useQuizSession(sessionId: string, quizId: string) {
  const { socket, isConnected, emit, on, off } = useSocket()
  const [interventions, setInterventions] = useState<any[]>([])
  const [sessionStarted, setSessionStarted] = useState(false)

  useEffect(() => {
    if (!socket || !isConnected || !sessionId) return

    // Only start quiz session once
    if (!sessionStarted) {
      emit('start-quiz-session', { sessionId, quizId })
      setSessionStarted(true)
    }

    // Listen for teacher interventions
    const handleIntervention = (data: any) => {
      setInterventions(prev => [data, ...prev])
    }

    on('teacher-intervention', handleIntervention)

    return () => {
      off('teacher-intervention', handleIntervention)
      // Only emit completion on final unmount, not on every re-render
    }
  }, [socket, isConnected, sessionId, quizId, emit, on, off, sessionStarted])

  // Separate effect for cleanup on unmount only
  useEffect(() => {
    return () => {
      // Only emit completion when the component is actually unmounting
      if (sessionStarted && socket && sessionId) {
        emit('quiz-completed', { sessionId })
      }
    }
  }, []) // Empty dependency array ensures this only runs on mount/unmount

  const reportViolation = (violation: any) => {
    return emit('violation-detected', {
      sessionId,
      violation
    })
  }

  const updateProgress = (progress: any) => {
    return emit('quiz-progress', {
      sessionId,
      ...progress
    })
  }

  const completeQuiz = () => {
    return emit('quiz-completed', { sessionId })
  }

  return {
    isConnected,
    interventions,
    reportViolation,
    updateProgress,
    completeQuiz
  }
}