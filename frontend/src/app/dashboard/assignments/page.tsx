'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react'
import Link from 'next/link'

export default function AssignmentsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('all')

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => apiClient.getAssignments(),
  })

  const getStatusBadge = (assignment: any) => {
    const dueDate = new Date(assignment.dueDate)
    const isOverdue = new Date() > dueDate
    const userSubmission = assignment.submissions?.find((sub: any) => sub.student._id === user?.id)

    if (userSubmission) {
      if (userSubmission.grade !== undefined) {
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Graded</Badge>
      }
      return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Submitted</Badge>
    } else if (isOverdue) {
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Overdue</Badge>
    } else {
      return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
    }
  }

  const filterAssignments = (assignments: any[], filter: string) => {
    if (filter === 'all') return assignments
    
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.dueDate)
      const isOverdue = new Date() > dueDate
      const userSubmission = assignment.submissions?.find((sub: any) => sub.student._id === user?.id)

      switch (filter) {
        case 'pending':
          return !userSubmission && !isOverdue
        case 'submitted':
          return !!userSubmission
        case 'overdue':
          return !userSubmission && isOverdue
        default:
          return true
      }
    })
  }

  const filteredAssignments = filterAssignments(assignments as any[], activeTab)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
            <p className="text-gray-600 mt-1">
              {user?.role === 'teacher' ? 'Manage and create assignments' : 'View and submit your assignments'}
            </p>
          </div>
        </div>

        {/* Teacher Assignment View - Show all classrooms they teach */}
        {user?.role === 'teacher' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Assignments</CardTitle>
                <CardDescription>
                  Create and manage assignments for your classrooms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Visit individual classroom pages to create and manage assignments for each class.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/dashboard/classrooms">Go to Classrooms</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Student Assignment View */}
        {user?.role === 'student' && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Assignments</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="submitted">Submitted</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4 mt-6">
                {filteredAssignments.length > 0 ? (
                  <div className="grid gap-4">
                    {filteredAssignments.map((assignment: any) => {
                      const dueDate = new Date(assignment.dueDate)
                      const userSubmission = assignment.submissions?.find((sub: any) => sub.student._id === user?.id)

                      return (
                        <Card key={assignment._id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">
                                  <Link href={`/dashboard/assignments/${assignment._id}`} className="hover:text-blue-600">
                                    {assignment.title}
                                  </Link>
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  <div className="flex items-center space-x-4 text-sm">
                                    <span className="flex items-center">
                                      <Users className="mr-1 h-3 w-3" />
                                      {assignment.classroom?.name}
                                    </span>
                                    <span className="flex items-center">
                                      <Calendar className="mr-1 h-3 w-3" />
                                      Due: {dueDate.toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center">
                                      <FileText className="mr-1 h-3 w-3" />
                                      {assignment.totalPoints} points
                                    </span>
                                  </div>
                                </CardDescription>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(assignment)}
                                <Badge variant="outline" className="capitalize">
                                  {assignment.type === 'mcq' ? '🧠 MCQ' : '📄 File'}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-gray-700 line-clamp-2">{assignment.description}</p>
                            
                            {userSubmission && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                    <span className="text-sm font-medium text-green-800">
                                      Submitted on {new Date(userSubmission.submittedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {userSubmission.grade !== undefined && (
                                    <Badge variant="default">
                                      {userSubmission.grade}/{assignment.totalPoints} points
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="mt-4 flex justify-end">
                              <Button asChild size="sm">
                                <Link href={`/dashboard/assignments/${assignment._id}`}>
                                  {userSubmission ? 'View Submission' : 'View Assignment'}
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                      <p className="text-gray-500">
                        {activeTab === 'all' 
                          ? "You don't have any assignments yet." 
                          : `You don't have any ${activeTab} assignments.`}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}