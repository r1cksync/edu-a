'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, BookOpen, Search, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function ClassroomsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')

  const { data: classrooms, isLoading, refetch } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => apiClient.getClassrooms(),
  })

  const handleJoinClassroom = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a classroom code')
      return
    }
    
    setIsJoining(true)
    setJoinError('')
    setJoinSuccess('')
    
    try {
      const result = await apiClient.joinClassroom(joinCode) as any
      setJoinCode('')
      setJoinSuccess('Successfully joined classroom!')
      
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      
      // If we got the classroom data back, invalidate its specific queries
      if (result?.classroom) {
        const classroomId = result.classroom._id
        queryClient.invalidateQueries({ queryKey: ['classroom', classroomId] })
        queryClient.invalidateQueries({ queryKey: ['classroom-students', classroomId] })
      } else {
        // Fallback: invalidate all classroom-related queries
        queryClient.invalidateQueries({ queryKey: ['classroom-students'] })
        queryClient.invalidateQueries({ queryKey: ['classroom'] })
      }
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setJoinSuccess('')
      }, 2000)
    } catch (error: any) {
      console.error('Failed to join classroom:', error)
      setJoinError(error.message || 'Failed to join classroom')
    } finally {
      setIsJoining(false)
    }
  }

  // Handle backend response structure: { classrooms: [], total: number }
  const classroomsList = Array.isArray(classrooms) ? classrooms : (classrooms as any)?.classrooms || []
  
  const filteredClassrooms = classroomsList.filter((classroom: any) =>
    classroom.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classroom.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role === 'teacher' ? 'My Classrooms' : 'My Classes'}
            </h1>
            <p className="text-gray-600 mt-2">
              {user?.role === 'teacher' 
                ? 'Manage your classrooms and students' 
                : 'View your enrolled classes and assignments'
              }
            </p>
          </div>
          <div className="flex gap-3">
            {user?.role === 'student' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Join Classroom
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join a Classroom</DialogTitle>
                    <DialogDescription>
                      Enter the classroom code provided by your teacher
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter classroom code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                    <Button onClick={handleJoinClassroom} className="w-full">
                      Join Classroom
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {user?.role === 'teacher' && (
              <Link href="/dashboard/classrooms/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Classroom
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search classrooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Classrooms Grid */}
        {filteredClassrooms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {user?.role === 'teacher' ? 'No classrooms yet' : 'No classes enrolled'}
              </h3>
              <p className="text-gray-500 text-center mb-4">
                {user?.role === 'teacher' 
                  ? 'Create your first classroom to get started with teaching'
                  : 'Join a classroom using the code provided by your teacher'
                }
              </p>
              {user?.role === 'teacher' ? (
                <Link href="/dashboard/classrooms/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Classroom
                  </Button>
                </Link>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Join Classroom
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Join a Classroom</DialogTitle>
                      <DialogDescription>
                        Enter the classroom code provided by your teacher
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter classroom code (6 characters)"
                        value={joinCode}
                        onChange={(e) => {
                          setJoinCode(e.target.value.toUpperCase())
                          setJoinError('')
                          setJoinSuccess('')
                        }}
                        maxLength={6}
                      />
                      {joinError && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {joinError}
                        </div>
                      )}
                      {joinSuccess && (
                        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                          {joinSuccess}
                        </div>
                      )}
                      <Button 
                        onClick={handleJoinClassroom} 
                        className="w-full" 
                        disabled={isJoining || !joinCode.trim()}
                      >
                        {isJoining ? 'Joining...' : 'Join Classroom'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClassrooms.map((classroom: any) => (
              <Link key={classroom._id} href={`/dashboard/classrooms/${classroom._id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{classroom.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {classroom.subject}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {classroom.classCode}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="mr-2 h-4 w-4" />
                        {classroom.students?.length || 0} students
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="mr-2 h-4 w-4" />
                        Created {new Date(classroom.createdAt).toLocaleDateString()}
                      </div>
                      {classroom.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {classroom.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}