'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { formatDistanceToNow, format } from 'date-fns'
import { AttendanceDashboard } from '@/components/attendance'
import { EngagementAnalysis } from '@/components/engagement/EngagementAnalysis'
import { 
  Clock, 
  Play, 
  Square, 
  Users, 
  Calendar, 
  Video, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Copy,
  X,
  BarChart3,
  Brain
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

interface TeacherVideoClassesProps {
  classroomId: string
}

export default function TeacherVideoClasses({ classroomId }: TeacherVideoClassesProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<VideoClass | null>(null)
  const [activeView, setActiveView] = useState<'classes' | 'attendance' | 'engagement'>('classes')
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    allowLateJoin: true,
    isRecorded: false,
  })
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

  // Fetch live classes separately for real-time updates
  const { data: liveClassesData } = useQuery({
    queryKey: ['liveVideoClasses', classroomId],
    queryFn: () => apiClient.getLiveVideoClasses(classroomId),
    refetchInterval: 10000, // More frequent for live classes
  })

  const classes: VideoClass[] = (classesData as any)?.classes || []
  const liveClasses: VideoClass[] = (liveClassesData as any)?.liveClasses || []

  // Start instant class mutation
  const startInstantMutation = useMutation({
    mutationFn: (data: { title?: string; description?: string }) => 
      apiClient.startInstantClass({ classroomId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoClasses'] })
      queryClient.invalidateQueries({ queryKey: ['liveVideoClasses'] })
    },
  })

  // Start scheduled class mutation
  const startClassMutation = useMutation({
    mutationFn: (classId: string) => apiClient.startVideoClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoClasses'] })
      queryClient.invalidateQueries({ queryKey: ['liveVideoClasses'] })
    },
  })

  // End class mutation
  const endClassMutation = useMutation({
    mutationFn: (classId: string) => apiClient.endVideoClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoClasses'] })
      queryClient.invalidateQueries({ queryKey: ['liveVideoClasses'] })
    },
  })

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: (classId: string) => apiClient.deleteVideoClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoClasses'] })
    },
  })

  // Schedule class mutation
  const scheduleClassMutation = useMutation({
    mutationFn: (data: any) => apiClient.scheduleVideoClass({ classroomId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoClasses'] })
      setShowScheduleModal(false)
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        duration: 60,
        allowLateJoin: true,
        isRecorded: false,
      })
    },
  })

  // Handle schedule class form submission
  const handleScheduleClass = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Combine date and time into scheduledStartTime
    const scheduledStartTime = new Date(`${formData.date}T${formData.time}`)
    
    // Calculate scheduledEndTime based on duration
    const scheduledEndTime = new Date(scheduledStartTime.getTime() + formData.duration * 60000)
    
    scheduleClassMutation.mutate({
      title: formData.title,
      description: formData.description,
      scheduledStartTime: scheduledStartTime.toISOString(),
      scheduledEndTime: scheduledEndTime.toISOString(),
      allowLateJoin: formData.allowLateJoin,
      isRecorded: formData.isRecorded,
      maxDuration: formData.duration,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50'
      case 'live': return 'text-green-600 bg-green-50'
      case 'ended': return 'text-gray-600 bg-gray-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const canStartClass = (videoClass: VideoClass) => {
    if (videoClass.status !== 'scheduled') return false
    const now = new Date()
    const startTime = new Date(videoClass.scheduledStartTime)
    const earlyStartTime = new Date(startTime.getTime() - 15 * 60000) // 15 minutes early
    return now >= earlyStartTime
  }

  const copyMeetingUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    // You can add a toast notification here
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
      {/* Header with action buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Video Classes</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => startInstantMutation.mutate({ title: 'Instant Class' })}
            disabled={startInstantMutation.isPending || liveClasses.length > 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video className="w-4 h-4 mr-2" />
            Start Instant Class
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Class
          </button>
        </div>
      </div>

      {/* Live classes alert */}
      {liveClasses.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-green-800">
                You have {liveClasses.length} live class{liveClasses.length > 1 ? 'es' : ''} ongoing
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {liveClasses.map((liveClass) => (
                  <button
                    key={liveClass._id}
                    onClick={() => copyMeetingUrl(liveClass.meetingUrl || '')}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
                  >
                    <Video className="w-3 h-3 mr-1" />
                    {liveClass.title}
                    <Copy className="w-3 h-3 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
          <button
            onClick={() => setActiveView('engagement')}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'engagement'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Brain className="w-4 h-4 mr-2 inline" />
            Engagement Analysis
          </button>
        </div>
      </div>

      {/* Conditional Content Based on Active View */}
      {activeView === 'classes' ? (
        <>
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
              Get started by scheduling your first video class.
            </p>
          </div>
        ) : (
          classes.map((videoClass) => (
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
                        {videoClass.totalStudentsAttended || 0}/{videoClass.totalStudentsInvited} attended
                      </div>
                    </div>

                    {videoClass.status === 'ended' && videoClass.attendancePercentage > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        Attendance: {videoClass.attendancePercentage}%
                        {videoClass.actualStartTime && (
                          <span className="ml-4">
                            Duration: {Math.round((new Date(videoClass.actualEndTime!).getTime() - new Date(videoClass.actualStartTime).getTime()) / 60000)} minutes
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {/* Action buttons based on status */}
                    {videoClass.status === 'scheduled' && canStartClass(videoClass) && (
                      <button
                        onClick={() => startClassMutation.mutate(videoClass._id)}
                        disabled={startClassMutation.isPending}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </button>
                    )}

                    {videoClass.status === 'live' && (
                      <>
                        <button
                          onClick={() => copyMeetingUrl(videoClass.meetingUrl || '')}
                          className="inline-flex items-center px-3 py-1.5 border border-green-200 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Link
                        </button>
                        <button
                          onClick={() => endClassMutation.mutate(videoClass._id)}
                          disabled={endClassMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          <Square className="w-3 h-3 mr-1" />
                          End
                        </button>
                      </>
                    )}

                    {videoClass.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedClass(videoClass)
                            setShowEditModal(true)
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteClassMutation.mutate(videoClass._id)}
                          disabled={deleteClassMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 border border-red-200 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </>
      ) : activeView === 'attendance' ? (
        /* Attendance View */
        <AttendanceDashboard classroomId={classroomId} />
      ) : (
        /* Engagement Analysis View */
        <EngagementAnalysis 
          classId={selectedClass?._id} 
          classes={classes?.map(cls => ({ _id: cls._id, title: cls.title, status: cls.status })) || []}
        />
      )}

      {/* Schedule Class Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Schedule Video Class</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleScheduleClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter class title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Class description (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 60})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="15"
                  max="480"
                  step="15"
                  placeholder="60"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Duration between 15-480 minutes</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowLateJoin"
                    checked={formData.allowLateJoin}
                    onChange={(e) => setFormData({...formData, allowLateJoin: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allowLateJoin" className="ml-2 block text-sm text-gray-900">
                    Allow students to join after class starts
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRecorded"
                    checked={formData.isRecorded}
                    onChange={(e) => setFormData({...formData, isRecorded: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRecorded" className="ml-2 block text-sm text-gray-900">
                    Record this class
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleClassMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scheduleClassMutation.isPending ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Class'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && selectedClass && (
        <EditClassModal
          videoClass={selectedClass}
          onClose={() => {
            setShowEditModal(false)
            setSelectedClass(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedClass(null)
            queryClient.invalidateQueries({ queryKey: ['videoClasses'] })
          }}
        />
      )}
    </div>
  )
}

// Edit Class Modal Component
function EditClassModal({ videoClass, onClose, onSuccess }: {
  videoClass: VideoClass
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    title: videoClass.title,
    description: videoClass.description,
    scheduledStartTime: new Date(videoClass.scheduledStartTime).toISOString().slice(0, 16),
    scheduledEndTime: new Date(videoClass.scheduledEndTime).toISOString().slice(0, 16),
    allowLateJoin: videoClass.allowLateJoin,
    isRecorded: videoClass.isRecorded,
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateVideoClass(videoClass._id, data),
    onSuccess: onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Edit Video Class</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
              Start Time *
            </label>
            <input
              type="datetime-local"
              id="startTime"
              required
              value={formData.scheduledStartTime}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
              End Time *
            </label>
            <input
              type="datetime-local"
              id="endTime"
              required
              value={formData.scheduledEndTime}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledEndTime: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <input
                id="allowLateJoin"
                type="checkbox"
                checked={formData.allowLateJoin}
                onChange={(e) => setFormData(prev => ({ ...prev, allowLateJoin: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="allowLateJoin" className="ml-2 block text-sm text-gray-900">
                Allow late join
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="isRecorded"
                type="checkbox"
                checked={formData.isRecorded}
                onChange={(e) => setFormData(prev => ({ ...prev, isRecorded: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isRecorded" className="ml-2 block text-sm text-gray-900">
                Record class
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}