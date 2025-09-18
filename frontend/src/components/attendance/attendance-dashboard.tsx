'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  BarChart3,
  Filter,
  Download,
  ChevronDown,
  User,
  BookOpen,
  Percent
} from 'lucide-react'

interface AttendanceStats {
  totalClassesHosted: number
  totalStudentsEnrolled: number
  averageAttendanceRate: number
  totalAttendanceRecords: number
  classAttendanceStats: Array<{
    videoClass: {
      _id: string
      title: string
      scheduledStartTime: string
      status: string
    }
    totalStudents: number
    presentStudents: number
    attendanceRate: number
  }>
  studentAttendanceStats: Array<{
    student: {
      _id: string
      name: string
      email: string
    }
    totalClasses: number
    attendedClasses: number
    attendancePercentage: number
  }>
}

interface AttendanceDashboardProps {
  classroomId: string
}

export default function AttendanceDashboard({ classroomId }: AttendanceDashboardProps) {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  const [selectedView, setSelectedView] = useState<'overview' | 'classes' | 'students'>('overview')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch attendance dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['attendanceDashboard', classroomId, dateRange],
    queryFn: () => apiClient.getAttendanceDashboard(classroomId, dateRange),
  })

  // Fetch classroom attendance stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['classroomAttendanceStats', classroomId, dateRange],
    queryFn: () => apiClient.getClassroomAttendanceStats(classroomId, dateRange),
  })

  const attendanceStats = statsData as AttendanceStats

  if (dashboardLoading || statsLoading) {
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

  if (!attendanceStats) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Users className="mx-auto h-12 w-12 mb-4 text-gray-300" />
        <p>No attendance data available for this classroom</p>
      </div>
    )
  }

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const exportAttendanceData = async () => {
    try {
      // Implementation for exporting attendance data
      console.log('Exporting attendance data...')
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const syncAbsences = async () => {
    try {
      const result = await apiClient.syncAbsencesForEndedClasses(classroomId)
      console.log('Sync result:', result)
      // Refresh the dashboard data
      window.location.reload()
    } catch (error) {
      console.error('Error syncing absences:', error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h2>
          <p className="text-gray-600">Track student attendance and engagement</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={syncAbsences}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Users className="h-4 w-4" />
            Sync Absences
          </button>
          <button
            onClick={exportAttendanceData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
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
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'classes', label: 'Classes', icon: BookOpen },
          { id: 'students', label: 'Students', icon: Users }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedView(id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              selectedView === id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Classes Hosted</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {attendanceStats?.totalClassesHosted || 0}
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
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {attendanceStats?.totalStudentsEnrolled || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Attendance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {attendanceStats?.averageAttendanceRate?.toFixed(1) || '0.0'}%
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Percent className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {attendanceStats?.totalAttendanceRecords || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classes Tab */}
      {selectedView === 'classes' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Class Attendance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Present/Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Attendance Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(attendanceStats?.classAttendanceStats || []).map((classData) => (
                  <tr key={classData.videoClass._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {classData.videoClass.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(classData.videoClass.scheduledStartTime), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        classData.videoClass.status === 'ended' 
                          ? 'bg-green-100 text-green-800'
                          : classData.videoClass.status === 'live'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {classData.videoClass.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {classData.presentStudents}/{classData.totalStudents}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${classData.attendanceRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {classData.attendanceRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {selectedView === 'students' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Student Attendance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Attended/Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Attendance %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(attendanceStats?.studentAttendanceStats || []).map((studentData) => (
                  <tr key={studentData.student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="font-medium text-gray-900">
                          {studentData.student.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {studentData.student.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {studentData.attendedClasses}/{studentData.totalClasses}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        studentData.attendancePercentage >= 80
                          ? 'bg-green-100 text-green-800'
                          : studentData.attendancePercentage >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {studentData.attendancePercentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className={`h-2 rounded-full ${
                              studentData.attendancePercentage >= 80
                                ? 'bg-green-500'
                                : studentData.attendancePercentage >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${studentData.attendancePercentage}%` }}
                          ></div>
                        </div>
                        <TrendingUp className={`h-4 w-4 ${
                          studentData.attendancePercentage >= 80
                            ? 'text-green-500'
                            : studentData.attendancePercentage >= 60
                            ? 'text-yellow-500'
                            : 'text-red-500'
                        }`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}