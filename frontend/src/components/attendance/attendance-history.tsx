'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface AttendanceRecord {
  _id: string
  student: {
    _id: string
    name: string
    email: string
  }
  videoClass: {
    _id: string
    title: string
    scheduledStartTime: string
    scheduledEndTime: string
    status: string
  }
  status: 'present' | 'absent' | 'joined' | 'left'
  joinTime?: string
  leaveTime?: string
  duration?: number
  timestamp: string
}

interface AttendanceHistoryProps {
  classroomId: string
  studentId?: string // If provided, shows history for specific student
}

export default function AttendanceHistory({ classroomId, studentId }: AttendanceHistoryProps) {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    search: ''
  })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const { user } = useAuthStore()

  const isTeacher = user?.role === 'teacher'

  // Fetch attendance history
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['attendanceHistory', classroomId, studentId, filters, page],
    queryFn: () => apiClient.getAttendanceHistory(classroomId, {
      studentId: studentId || (isTeacher ? undefined : user?.id),
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      page,
      limit: 20
    }),
  })

  const history = historyData as { 
    attendanceRecords: AttendanceRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
      case 'joined':
        return 'bg-green-100 text-green-800'
      case 'absent':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  const calculateDuration = (joinTime?: string, leaveTime?: string) => {
    if (!joinTime || !leaveTime) return null
    return differenceInMinutes(parseISO(leaveTime), parseISO(joinTime))
  }

  const filteredRecords = history?.attendanceRecords?.filter(record => {
    if (filters.status !== 'all' && record.status !== filters.status) {
      return false
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        record.videoClass.title.toLowerCase().includes(searchLower) ||
        record.student.name.toLowerCase().includes(searchLower) ||
        record.student.email.toLowerCase().includes(searchLower)
      )
    }
    return true
  }) || []

  const handleExport = async () => {
    try {
      console.log('Exporting attendance history...')
      // Implementation for exporting data
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {studentId ? 'Student ' : ''}Attendance History
          </h2>
          <p className="text-gray-600">
            {studentId 
              ? 'Detailed attendance history for selected student'
              : isTeacher 
                ? 'View all student attendance records'
                : 'Your attendance history'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={isTeacher ? "Search by student name, email, or class title..." : "Search by class title..."}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="joined">Joined</option>
              <option value="left">Left</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
            <p>No attendance records match your current filters.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {filteredRecords.map((record) => {
                const duration = record.duration || calculateDuration(record.joinTime, record.leaveTime)
                
                return (
                  <div key={record._id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(record.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {record.videoClass.title}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            {isTeacher && (
                              <span className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>{record.student.name}</span>
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(record.videoClass.scheduledStartTime), 'MMM dd, yyyy')}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(record.videoClass.scheduledStartTime), 'HH:mm')}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-right">
                        {record.joinTime && (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(record.joinTime), 'HH:mm')}
                            </p>
                            <p className="text-xs text-gray-500">Joined</p>
                          </div>
                        )}
                        {record.leaveTime && (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(record.leaveTime), 'HH:mm')}
                            </p>
                            <p className="text-xs text-gray-500">Left</p>
                          </div>
                        )}
                        {duration && (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDuration(duration)}
                            </p>
                            <p className="text-xs text-gray-500">Duration</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {history?.pagination && history.pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(history.pagination.pages, page + 1))}
                    disabled={page === history.pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {((page - 1) * history.pagination.limit) + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(page * history.pagination.limit, history.pagination.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{history.pagination.total}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {Array.from({ length: Math.min(5, history.pagination.pages) }, (_, i) => {
                        const pageNumber = Math.max(1, Math.min(history.pagination.pages - 4, page - 2)) + i
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setPage(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNumber === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setPage(Math.min(history.pagination.pages, page + 1))}
                        disabled={page === history.pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}