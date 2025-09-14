'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CreateClassroomPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    description: '',
    allowStudentPosts: true,
    allowStudentComments: true,
  })

  const createClassroomMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      // Clean the data to match backend schema
      const cleanData = {
        name: data.name.trim(),
        subject: data.subject.trim(),
        ...(data.description.trim() && { description: data.description.trim() }),
        allowStudentPosts: data.allowStudentPosts,
        allowStudentComments: data.allowStudentComments,
      }
      return apiClient.createClassroom(cleanData)
    },
    onSuccess: (response: any) => {
      toast({
        title: 'Classroom created!',
        description: 'Your classroom has been created successfully.',
      })
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      // Backend returns { message, classroom }
      const classroom = response.classroom || response
      router.push(`/dashboard/classrooms/${classroom._id}`)
    },
    onError: (error) => {
      toast({
        title: 'Failed to create classroom',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.subject.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the classroom name and subject.',
        variant: 'destructive',
      })
      return
    }
    createClassroomMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  // Redirect non-teachers
  if (user?.role !== 'teacher') {
    router.push('/dashboard/classrooms')
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/classrooms">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Classrooms
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Classroom</CardTitle>
            <CardDescription>
              Set up a new classroom for your students to join and learn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Classroom Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Advanced React Development"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g., Computer Science"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of the classroom and what students will learn"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <Label>Classroom Settings</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow Student Posts</p>
                      <p className="text-sm text-gray-500">Students can create posts and share materials</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.allowStudentPosts}
                      onChange={(e) => setFormData(prev => ({ ...prev, allowStudentPosts: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow Student Comments</p>
                      <p className="text-sm text-gray-500">Students can comment on posts and announcements</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.allowStudentComments}
                      onChange={(e) => setFormData(prev => ({ ...prev, allowStudentComments: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createClassroomMutation.isPending}
                  className="flex-1"
                >
                  {createClassroomMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Classroom'
                  )}
                </Button>
                <Link href="/dashboard/classrooms">
                  <Button variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
