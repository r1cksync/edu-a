'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'
import { Clock, FileText, MessageSquare, BookOpen } from 'lucide-react'

export default function RecentActivities() {
  const { user } = useAuthStore()

  // Mock data - in real app, this would come from API calls
  const activities = user?.role === 'teacher' ? [
    {
      id: 1,
      type: 'assignment',
      title: 'New assignment submitted',
      description: 'John Doe submitted "React Components Project"',
      timestamp: '2 minutes ago',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 2,
      type: 'post',
      title: 'New comment on post',
      description: 'Sarah Wilson commented on "Class Schedule Update"',
      timestamp: '15 minutes ago',
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 3,
      type: 'classroom',
      title: 'Student joined classroom',
      description: 'Mike Johnson joined "Advanced React Development"',
      timestamp: '1 hour ago',
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      id: 4,
      type: 'assignment',
      title: 'Assignment deadline reminder',
      description: '"JavaScript Fundamentals Quiz" is due tomorrow',
      timestamp: '2 hours ago',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ] : [
    {
      id: 1,
      type: 'assignment',
      title: 'Assignment graded',
      description: 'Your "React Components Project" has been graded',
      timestamp: '30 minutes ago',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 2,
      type: 'post',
      title: 'New announcement',
      description: 'Prof. Smith posted "Midterm Exam Schedule"',
      timestamp: '1 hour ago',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 3,
      type: 'assignment',
      title: 'Assignment reminder',
      description: '"Database Design Project" is due in 2 days',
      timestamp: '3 hours ago',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      id: 4,
      type: 'classroom',
      title: 'New material posted',
      description: 'Lecture notes for "API Development" are available',
      timestamp: '1 day ago',
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${activity.bgColor} flex-shrink-0`}>
                <activity.icon className={`h-4 w-4 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}