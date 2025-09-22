'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  MessageSquare, 
  Settings,
  Plus,
  Copy,
  Calendar,
  BookOpen,
  Video,
  Brain,
  Target,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import ClassroomPosts from '@/components/classroom/posts'
import ClassroomAssignments from '@/components/classroom/assignments'
import ClassroomStudents from '@/components/classroom/students'
import ClassroomSettings from '@/components/classroom/settings'
import TeacherVideoClasses from '@/components/video-classes/teacher-video-classes'
import StudentVideoClasses from '@/components/video-classes/student-video-classes'
import TeacherQuizzes from '@/components/quizzes/teacher-quizzes'
import StudentQuizzes from '@/components/quizzes/student-quizzes'
import { DPPList } from '@/components/dpp/DPPList'
import RefresherMain from '@/components/refresher/RefresherMain'

export default function ClassroomPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('posts')
  
  const classroomId = params.id as string

  const { data: classroom, isLoading } = useQuery({
    queryKey: ['classroom', classroomId],
    queryFn: () => apiClient.getClassroom(classroomId),
  })

  const { data: videoClasses } = useQuery({
    queryKey: ['video-classes', classroomId],
    queryFn: () => apiClient.getClassroomVideoClasses(classroomId),
    enabled: !!classroomId
  })

  const { data: studentsResponse } = useQuery({
    queryKey: ['classroom-students', classroomId],
    queryFn: () => apiClient.getClassroomStudents(classroomId),
    enabled: !!classroomId, // Enable for both teachers and students
  })

  // Extract students array from response: { students: [...], total: ... }
  const students = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse as any)?.students || []

  const leaveClassroomMutation = useMutation({
    mutationFn: () => apiClient.leaveClassroom(classroomId),
    onSuccess: () => {
      toast({
        title: 'Left classroom',
        description: 'You have successfully left the classroom.',
      })
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      router.push('/dashboard/classrooms')
    },
  })

  const copyClassroomCode = () => {
    if ((classroom as any)?.classCode) {
      navigator.clipboard.writeText((classroom as any).classCode)
      toast({
        title: 'Code copied!',
        description: 'Classroom code has been copied to clipboard.',
      })
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!classroom) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Classroom not found</h2>
          <p className="text-gray-600 mt-2">The classroom you're looking for doesn't exist.</p>
          <Link href="/dashboard/classrooms">
            <Button className="mt-4">Back to Classrooms</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const isTeacher = user?.role === 'teacher'
  const isOwner = isTeacher && (classroom as any)?.teacher === user?.id

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/classrooms">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{(classroom as any)?.name}</h1>
              <p className="text-gray-600">{(classroom as any)?.subject}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="cursor-pointer" onClick={copyClassroomCode}>
              <Copy className="mr-1 h-3 w-3" />
              {(classroom as any)?.classCode}
            </Badge>
            {!isOwner && (
              <Button 
                variant="outline" 
                onClick={() => leaveClassroomMutation.mutate()}
                disabled={leaveClassroomMutation.isPending}
              >
                Leave Classroom
              </Button>
            )}
          </div>
        </div>

        {/* Classroom Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Subject</p>
                  <p className="text-sm text-gray-600">{(classroom as any)?.subject}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Students</p>
                  <p className="text-sm text-gray-600">{students?.length || (classroom as any)?.students?.length || 0} enrolled</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-600">{new Date((classroom as any)?.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            {(classroom as any)?.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">{(classroom as any)?.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${isOwner ? 'grid-cols-8' : 'grid-cols-7'}`}>
            <TabsTrigger value="posts" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Posts</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="dpp" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>DPP</span>
            </TabsTrigger>
            <TabsTrigger value="refresher" className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Refresher</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Quizzes</span>
            </TabsTrigger>
            <TabsTrigger value="video-classes" className="flex items-center space-x-2">
              <Video className="h-4 w-4" />
              <span>Video Classes</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>People</span>
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            <ClassroomPosts classroomId={classroomId} isTeacher={isTeacher} />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <ClassroomAssignments classroomId={classroomId} isTeacher={isTeacher} />
          </TabsContent>

          <TabsContent value="dpp" className="space-y-6">
            <DPPList 
              classroomId={classroomId} 
              videoClasses={(videoClasses as any)?.classes || []} 
            />
          </TabsContent>

          <TabsContent value="refresher" className="space-y-6">
            <RefresherMain classroomId={classroomId} isTeacher={isTeacher} />
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-6">{isTeacher ? (
              <TeacherQuizzes classroomId={classroomId} />
            ) : (
              <StudentQuizzes classroomId={classroomId} />
            )}
          </TabsContent>

          <TabsContent value="video-classes" className="space-y-6">
            {isTeacher ? (
              <TeacherVideoClasses classroomId={classroomId} />
            ) : (
              <StudentVideoClasses classroomId={classroomId} />
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <ClassroomStudents classroomId={classroomId} isOwner={isOwner} students={students} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="settings" className="space-y-6">
              <ClassroomSettings classroom={classroom as any} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}