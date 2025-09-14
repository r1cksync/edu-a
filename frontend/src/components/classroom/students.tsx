'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'
import { Users, Mail, UserMinus, Crown, User } from 'lucide-react'

interface ClassroomStudentsProps {
  classroomId: string
  isOwner: boolean
  students: any[] | undefined
}

export default function ClassroomStudents({ classroomId, isOwner, students }: ClassroomStudentsProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Debug logging
  console.log('ClassroomStudents received props:', { classroomId, isOwner, students })
  console.log('Students length:', students?.length)
  console.log('Students data:', students)

  const removeStudentMutation = useMutation({
    mutationFn: (studentId: string) => apiClient.removeStudent(classroomId, studentId),
    onSuccess: () => {
      toast({
        title: 'Student removed',
        description: 'The student has been removed from the classroom.',
      })
      queryClient.invalidateQueries({ queryKey: ['classroom-students', classroomId] })
    },
  })

  const handleRemoveStudent = (studentId: string, studentName: string) => {
    if (confirm(`Are you sure you want to remove ${studentName} from this classroom?`)) {
      removeStudentMutation.mutate(studentId)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Class Members</span>
          </CardTitle>
          <CardDescription>
            {students?.length || 0} student{(students?.length || 0) !== 1 ? 's' : ''} enrolled in this classroom
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!students || students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students yet</h3>
              <p className="text-gray-500">
                Students will appear here once they join the classroom using the classroom code.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Teacher Info */}
              <div className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        <Crown className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  <Badge variant="default">Teacher</Badge>
                </div>
              </div>

              {/* Students List */}
              <div className="space-y-3">
                {students.map((studentEntry: any) => {
                  // Handle both direct student objects and nested student objects
                  const student = studentEntry.student || studentEntry;
                  return (
                    <div key={student._id || student.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Student</Badge>
                        {isOwner && student._id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudent(student._id || student.id, student.name)}
                            disabled={removeStudentMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classroom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{students?.length || 0}</p>
                <p className="text-sm text-gray-600">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{students?.filter(s => s.email).length || 0}</p>
                <p className="text-sm text-gray-600">Active Emails</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-gray-600">Teacher</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}