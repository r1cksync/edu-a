'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { format, subDays } from 'date-fns'
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  BookOpen,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
  Percent,
  Award
} from 'lucide-react'

interface StudentAttendanceStats {
  totalClassesScheduled: number
  totalClassesAttended: number
  attendancePercentage: number
  streak: {
    current: number
    longest: number
  }
  recentAttendance: Array<{
    videoClass: {
      _id: string
      title: string
      scheduledStartTime: string
      status: string
    }
    status: 'present' | 'absent' | 'joined' | 'left'
    joinTime?: string
    leaveTime?: string
    duration?: number
  }>
}

interface StudentAttendanceProps {
  classroomId: string
}

export default function StudentAttendance({ classroomId }: StudentAttendanceProps) {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  const [showFilters, setShowFilters] = useState(false)
  const { user } = useAuthStore()

  // Fetch student attendance stats
  const { data: attendanceStats, isLoading } = useQuery({
    queryKey: ['studentAttendanceStats', classroomId, user?.id],
    queryFn: () => apiClient.getStudentAttendanceStats(classroomId),
    enabled: !!user?.id,
  })

  // Fetch attendance history
  const { data: attendanceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['attendanceHistory', classroomId, user?.id, dateRange],
    queryFn: () => apiClient.getAttendanceHistory(classroomId, {
      studentId: user?.id,
      ...dateRange
    }),
    enabled: !!user?.id,
  })

  const stats = attendanceStats as StudentAttendanceStats
  const history = attendanceHistory as { attendanceRecords: any[] }

  if (isLoading || historyLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-300" />
        <p>No attendance data available</p>
      </div>
    )
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100'
    if (percentage >= 75) return 'text-blue-600 bg-blue-100'
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
      case 'joined':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
          <p className="text-gray-600">Track your class attendance and engagement</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalClassesScheduled}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Classes Attended</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalClassesAttended}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className={`text-3xl font-bold ${getAttendanceColor(stats.attendancePercentage).split(' ')[0]}`}>
                {stats.attendancePercentage.toFixed(1)}%
              </p>
            </div>
            <div className={`p-3 rounded-lg ${getAttendanceColor(stats.attendancePercentage).split(' ')[1]}`}>
              <Percent className={`h-6 w-6 ${getAttendanceColor(stats.attendancePercentage).split(' ')[0]}`} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Streak</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.streak.current}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Best: {stats.streak.longest}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Award className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Overall Progress</h3>
          <span className={`text-sm font-medium ${getAttendanceColor(stats.attendancePercentage).split(' ')[0]}`}>
            {stats.attendancePercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              stats.attendancePercentage >= 90 ? 'bg-green-500' :
              stats.attendancePercentage >= 75 ? 'bg-blue-500' :
              stats.attendancePercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(stats.attendancePercentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Classes</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {stats.recentAttendance.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p>No recent classes found</p>
            </div>
          ) : (
            stats.recentAttendance.map((record, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(record.status)}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {record.videoClass.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {format(new Date(record.videoClass.scheduledStartTime), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {record.joinTime && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(record.joinTime), 'HH:mm')}
                        </p>
                        <p className="text-xs text-gray-500">Joined</p>
                      </div>
                    )}
                    {record.duration && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDuration(record.duration)}
                        </p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.status === 'present' || record.status === 'joined'
                        ? 'bg-green-100 text-green-800'
                        : record.status === 'absent'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-3">
            {stats.attendancePercentage >= 85 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {stats.attendancePercentage >= 85 
                  ? 'Excellent Attendance!' 
                  : stats.attendancePercentage >= 70
                  ? 'Good Attendance'
                  : 'Needs Improvement'}
              </p>
              <p className="text-sm text-gray-600">
                {stats.attendancePercentage >= 85 
                  ? 'Keep up the great work!'
                  : stats.attendancePercentage >= 70
                  ? 'Try to attend more classes'
                  : 'Consider improving your attendance'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Award className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {stats.streak.current >= 5 
                  ? 'Great Streak!' 
                  : 'Build Your Streak'}
              </p>
              <p className="text-sm text-gray-600">
                {stats.streak.current >= 5
                  ? `${stats.streak.current} classes in a row!`
                  : 'Attend consecutive classes to build your streak'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}