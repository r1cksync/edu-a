'use client'

import { useState, useEffect } from 'react'
import { useQuizMonitoring } from '@/lib/hooks/use-socket'
import { format } from 'date-fns'
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Clock, 
  Eye, 
  EyeOff, 
  Wifi, 
  WifiOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Pause,
  StopCircle
} from 'lucide-react'

interface QuizMonitoringProps {
  quizId: string
  onClose: () => void
}

export default function QuizMonitoring({ quizId, onClose }: QuizMonitoringProps) {
  const {
    isConnected,
    activeStudents,
    violations,
    studentProgress,
    sendIntervention
  } = useQuizMonitoring(quizId)
  
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [showViolationsOnly, setShowViolationsOnly] = useState(false)
  const [interventionMessage, setInterventionMessage] = useState('')

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-orange-600 bg-orange-100'
      case 'low': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'face_not_detected': return <Eye className="w-4 h-4" />
      case 'multiple_faces': return <Users className="w-4 h-4" />
      case 'tab_switch': return <AlertTriangle className="w-4 h-4" />
      case 'window_focus_lost': return <EyeOff className="w-4 h-4" />
      case 'disconnection': return <WifiOff className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const filteredViolations = showViolationsOnly 
    ? violations.filter(v => v.violation.severity === 'high' || v.violation.severity === 'medium')
    : violations

  const handleSendIntervention = (studentId: string, sessionId: string, action: string) => {
    const message = action === 'warning' ? interventionMessage : undefined
    sendIntervention(sessionId, action, message)
    setInterventionMessage('')
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full h-4/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Quiz Monitoring</h2>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowViolationsOnly(!showViolationsOnly)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                showViolationsOnly
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showViolationsOnly ? 'Show All' : 'High Risk Only'}
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Active Students Panel */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Active Students ({activeStudents.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No students currently taking the quiz</p>
                </div>
              ) : (
                activeStudents.map((student) => {
                  const progress = studentProgress[student.studentId] || {}
                  const recentViolations = violations.filter(v => 
                    v.studentId === student.studentId
                  ).slice(0, 3)
                  
                  return (
                    <div
                      key={student.sessionId}
                      className={`p-4 border border-gray-200 rounded-lg cursor-pointer transition-colors ${
                        selectedStudent === student.studentId 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedStudent(student.studentId)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{student.studentName}</h4>
                          <p className="text-sm text-gray-500">
                            Started {format(new Date(student.startTime), 'h:mm a')}
                          </p>
                        </div>
                        
                        {recentViolations.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">
                              {recentViolations.length}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {progress.currentQuestion !== undefined && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">
                              {progress.answeredQuestions}/{progress.totalQuestions || '?'} questions
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ 
                                width: `${(progress.answeredQuestions / (progress.totalQuestions || 1)) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {progress.timeRemaining !== undefined && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-1" />
                          {Math.floor(progress.timeRemaining / 60)}:{(progress.timeRemaining % 60).toString().padStart(2, '0')} remaining
                        </div>
                      )}
                      
                      {/* Quick Actions */}
                      <div className="flex items-center space-x-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSendIntervention(student.studentId, student.sessionId, 'warning')
                          }}
                          className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                        >
                          <MessageSquare className="w-3 h-3 mr-1 inline" />
                          Warn
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSendIntervention(student.studentId, student.sessionId, 'pause')
                          }}
                          className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                        >
                          <Pause className="w-3 h-3 mr-1 inline" />
                          Pause
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Violations Panel */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Violations ({filteredViolations.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredViolations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No violations detected</p>
                </div>
              ) : (
                filteredViolations.map((violation, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      violation.violation.severity === 'high'
                        ? 'border-red-200 bg-red-50'
                        : violation.violation.severity === 'medium'
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getViolationIcon(violation.violation.type)}
                        <div>
                          <h4 className="font-medium text-gray-900">{violation.studentName}</h4>
                          <p className="text-sm text-gray-600">{violation.violation.description}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getSeverityColor(violation.violation.severity)
                        }`}>
                          {violation.violation.severity}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(violation.timestamp), 'h:mm:ss a')}
                        </p>
                      </div>
                    </div>
                    
                    {violation.violation.severity !== 'low' && (
                      <div className="flex items-center space-x-2 mt-3">
                        <input
                          type="text"
                          placeholder="Send warning message..."
                          value={interventionMessage}
                          onChange={(e) => setInterventionMessage(e.target.value)}
                          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                        />
                        <button
                          onClick={() => handleSendIntervention(
                            violation.studentId, 
                            violation.sessionId, 
                            'warning'
                          )}
                          disabled={!interventionMessage.trim()}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}