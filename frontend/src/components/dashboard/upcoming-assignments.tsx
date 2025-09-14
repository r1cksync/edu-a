'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function UpcomingAssignments() {
  const { user } = useAuthStore()

  // Mock data - in real app, this would come from API calls
  const assignments = user?.role === 'teacher' ? [
    {
      id: 1,
      title: 'Grade Midterm Exams',
      classroom: 'Advanced React Development',
      dueDate: 'Tomorrow',
      priority: 'high',
      submissions: 15,
      total: 20,
    },
    {
      id: 2,
      title: 'Review Project Proposals',
      classroom: 'Web Development Basics',
      dueDate: '3 days',
      priority: 'medium',
      submissions: 8,
      total: 12,
    },
    {
      id: 3,
      title: 'Prepare Quiz Questions',
      classroom: 'JavaScript Fundamentals',
      dueDate: '1 week',
      priority: 'low',
      submissions: 0,
      total: 0,
    },
  ] : [
    {
      id: 1,
      title: 'React Components Project',
      classroom: 'Advanced React Development',
      dueDate: 'Tomorrow',
      priority: 'high',
      status: 'pending',
    },
    {
      id: 2,
      title: 'Database Design Assignment',
      classroom: 'Database Systems',
      dueDate: '2 days',
      priority: 'high',
      status: 'in_progress',
    },
    {
      id: 3,
      title: 'JavaScript Quiz',
      classroom: 'Web Development Basics',
      dueDate: '1 week',
      priority: 'medium',
      status: 'not_started',
    },
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          {user?.role === 'teacher' ? 'Upcoming Tasks' : 'Upcoming Assignments'}
        </CardTitle>
        <Link href="/dashboard/assignments">
          <Button variant="ghost" size="sm">
            View all
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-3 border rounded-lg hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {assignment.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {assignment.classroom}
                  </p>
                  {user?.role === 'teacher' && 'submissions' in assignment && (
                    <p className="text-xs text-gray-500 mt-1">
                      {assignment.submissions}/{assignment.total} submissions
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {assignment.priority}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {assignment.dueDate}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}