'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns'
import { StudentAttendance } from '@/components/attendance'
import { 
  Clock, 
  Play, 
  Users, 
  Calendar, 
  Video, 
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react'

interface VideoClass {
  _id: string
  title: string
  description: string
  scheduledStartTime: string
  scheduledEndTime: string
  actualStartTime?: string
  actualEndTime?: string
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  type: 'scheduled' | 'instant'
  allowLateJoin: boolean
  isRecorded: boolean
  maxDuration: number
  totalStudentsInvited: number
  totalStudentsAttended: number
  attendancePercentage: number
  meetingId?: string
  meetingUrl?: string
  participants: Array<{
    student: {
      _id: string
      name: string
      email: string
    }
    joinedAt: string
    leftAt?: string
  }>
  teacher: {
    _id: string
    name: string
    email: string
  }
  classroom: {
    _id: string
    name: string
    classCode: string
  }
}

interface StudentVideoClassesProps {
  classroomId: string
}

export default function StudentVideoClasses({ classroomId }: StudentVideoClassesProps) {
  const [activeView, setActiveView] = useState<'classes' | 'attendance'>('classes')
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all')
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Fetch video classes
  const { data: classesData, isLoading } = useQuery({
    queryKey: ['videoClasses', classroomId, filter],
    queryFn: () => apiClient.getClassroomVideoClasses(classroomId, { 
      status: filter === 'all' ? undefined : filter 
    }),
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  })

  // Fetch upcoming classes
  const { data: upcomingData } = useQuery({
    queryKey: ['upcomingVideoClasses', classroomId],
    queryFn: () => apiClient.getUpcomingVideoClasses(classroomId),
    refetchInterval: 60000, // Check for upcoming classes every minute
  })

  // Fetch live classes separately for real-time updates
  const { data: liveClassesData } = useQuery({
    queryKey: ['liveVideoClasses', classroomId],
    queryFn: () => apiClient.getLiveVideoClasses(classroomId),
    refetchInterval: 10000, // More frequent for live classes
  })

  const classes: VideoClass[] = (classesData as any)?.classes || []
  const upcomingClasses: VideoClass[] = (upcomingData as any)?.upcomingClasses || []
  const liveClasses: VideoClass[] = (liveClassesData as any)?.liveClasses || []

  // Join class mutation
  const joinClassMutation = useMutation({
    mutationFn: (classId: string) => apiClient.joinVideoClass(classId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['videoClasses'] })
      queryClient.invalidateQueries({ queryKey: ['liveVideoClasses'] })
      // Open meeting in new window
      if (data.videoClass?.meetingUrl) {
        window.open(data.videoClass.meetingUrl, '_blank')
      }
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50'
      case 'live': return 'text-green-600 bg-green-50'
      case 'ended': return 'text-gray-600 bg-gray-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const canJoinClass = (videoClass: VideoClass) => {
    if (videoClass.status !== 'live') return false
    
    // Check if already joined
    const isParticipant = videoClass.participants.some(p => 
      p.student._id === (user as any)?._id && !p.leftAt
    )
    
    if (isParticipant) return false

    // Check if late join is allowed
    if (!videoClass.allowLateJoin) {
      const joinTimeLimit = new Date(videoClass.actualStartTime!).getTime() + 10 * 60000 // 10 minutes
      if (new Date().getTime() > joinTimeLimit) return false
    }

    return true
  }

  const isParticipantInClass = (videoClass: VideoClass) => {
    return videoClass.participants.some(p => 
      p.student._id === (user as any)?._id && !p.leftAt
    )
  }

  const hasAttended = (videoClass: VideoClass) => {
    return videoClass.participants.some(p => p.student._id === (user as any)?._id)
  }

  const getTimeUntilClass = (scheduledTime: string) => {
    const now = new Date()
    const classTime = new Date(scheduledTime)
    
    if (isBefore(now, classTime)) {
      return `Starts ${formatDistanceToNow(classTime, { addSuffix: true })}`
    } else {
      return `Started ${formatDistanceToNow(classTime, { addSuffix: true })}`
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Video Classes</h2>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-center">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setActiveView('classes')}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'classes'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Video className="w-4 h-4 mr-2 inline" />
            Classes
          </button>
          <button
            onClick={() => setActiveView('attendance')}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'attendance'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Attendance
          </button>
        </div>
      </div>

      {/* Conditional Content Based on Active View */}
      {activeView === 'classes' ? (
        <>
          {/* Live classes alert */}
          {liveClasses.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-green-800">
                {liveClasses.length} live class{liveClasses.length > 1 ? 'es' : ''} available to join
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {liveClasses.map((liveClass) => {
                  const canJoin = canJoinClass(liveClass)
                  const isJoined = isParticipantInClass(liveClass)
                  
                  return (
                    <div key={liveClass._id} className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Video className="w-3 h-3 mr-1" />
                        {liveClass.title}
                      </span>
                      {isJoined ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Joined
                        </span>
                      ) : canJoin ? (
                        <button
                          onClick={() => joinClassMutation.mutate(liveClass._id)}
                          disabled={joinClassMutation.isPending}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Join Now
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <XCircle className="w-3 h-3 mr-1" />
                          Cannot Join
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming classes */}
      {upcomingClasses.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-blue-800">Upcoming Classes</p>
              <div className="mt-2 space-y-1">
                {upcomingClasses.slice(0, 3).map((upcomingClass) => (
                  <div key={upcomingClass._id} className="text-xs text-blue-700">
                    <span className="font-medium">{upcomingClass.title}</span>
                    {' - '}
                    {getTimeUntilClass(upcomingClass.scheduledStartTime)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['all', 'scheduled', 'live', 'ended'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`${
                filter === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab} ({classes.filter(c => tab === 'all' || c.status === tab).length})
            </button>
          ))}
        </nav>
      </div>

      {/* Classes list */}
      <div className="space-y-4">
        {classes.length === 0 ? (
          <div className="text-center py-8">
            <Video className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No video classes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your teacher hasn't scheduled any video classes yet.
            </p>
          </div>
        ) : (
          classes.map((videoClass) => {
            const canJoin = canJoinClass(videoClass)
            const isJoined = isParticipantInClass(videoClass)
            const attended = hasAttended(videoClass)
            
            return (
              <div
                key={videoClass._id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          {videoClass.title}
                        </h3>
                        <span
                          className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            videoClass.status
                          )}`}
                        >
                          {videoClass.status}
                        </span>
                        {videoClass.type === 'instant' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                            instant
                          </span>
                        )}
                        
                        {/* Attendance indicator */}
                        {videoClass.status === 'ended' && (
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            attended ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {attended ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Attended
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Missed
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      
                      {videoClass.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {videoClass.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {format(new Date(videoClass.scheduledStartTime), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {format(new Date(videoClass.scheduledStartTime), 'h:mm a')} -{' '}
                          {format(new Date(videoClass.scheduledEndTime), 'h:mm a')}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Teacher: {videoClass.teacher.name}
                        </div>
                      </div>

                      {videoClass.status === 'scheduled' && (
                        <div className="mt-2 text-sm text-gray-600">
                          {getTimeUntilClass(videoClass.scheduledStartTime)}
                        </div>
                      )}

                      {videoClass.status === 'live' && videoClass.actualStartTime && (
                        <div className="mt-2 text-sm text-gray-600">
                          Started {formatDistanceToNow(new Date(videoClass.actualStartTime), { addSuffix: true })}
                          {isJoined && (
                            <span className="ml-4 text-green-600 font-medium">
                              You are in this class
                            </span>
                          )}
                        </div>
                      )}

                      {videoClass.status === 'ended' && videoClass.actualStartTime && (
                        <div className="mt-2 text-sm text-gray-600">
                          Duration: {Math.round(
                            (new Date(videoClass.actualEndTime!).getTime() - 
                             new Date(videoClass.actualStartTime).getTime()) / 60000
                          )} minutes
                          {attended && videoClass.participants.find(p => p.student._id === (user as any)?._id) && (
                            <span className="ml-4">
                              You joined {formatDistanceToNow(
                                new Date(videoClass.participants.find(p => p.student._id === (user as any)?._id)!.joinedAt), 
                                { addSuffix: true }
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {/* Action buttons based on status */}
                      {videoClass.status === 'live' && (
                        <>
                          {isJoined ? (
                            <span className="inline-flex items-center px-3 py-1.5 border border-green-200 text-xs font-medium rounded text-green-700 bg-green-50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              In Class
                            </span>
                          ) : canJoin ? (
                            <button
                              onClick={() => joinClassMutation.mutate(videoClass._id)}
                              disabled={joinClassMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Join Class
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium rounded text-gray-500 bg-gray-50">
                              <XCircle className="w-3 h-3 mr-1" />
                              Cannot Join
                            </span>
                          )}
                        </>
                      )}

                      {videoClass.status === 'scheduled' && (
                        <span className="inline-flex items-center px-3 py-1.5 border border-blue-200 text-xs font-medium rounded text-blue-700 bg-blue-50">
                          <Clock className="w-3 h-3 mr-1" />
                          Scheduled
                        </span>
                      )}

                      {videoClass.status === 'ended' && attended && videoClass.isRecorded && (
                        <button
                          onClick={() => {
                            // This would open the recording if available
                            // For now, just show a placeholder
                            alert('Recording feature coming soon!')
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-indigo-200 text-xs font-medium rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Recording
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      </>
      ) : (
        /* Attendance View */
        <StudentAttendance classroomId={classroomId} />
      )}
    </div>
  )
}