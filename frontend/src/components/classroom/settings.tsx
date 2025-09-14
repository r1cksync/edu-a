'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Settings, Trash2, Save, AlertTriangle } from 'lucide-react'

interface ClassroomSettingsProps {
  classroom: any
}

export default function ClassroomSettings({ classroom }: ClassroomSettingsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: classroom?.name || '',
    subject: classroom?.subject || '',
    section: classroom?.section || '',
    description: classroom?.description || '',
  })

  const updateClassroomMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.updateClassroom(classroom._id, data),
    onSuccess: () => {
      toast({
        title: 'Classroom updated!',
        description: 'Your changes have been saved successfully.',
      })
      queryClient.invalidateQueries({ queryKey: ['classroom', classroom._id] })
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
    },
  })

  const deleteClassroomMutation = useMutation({
    mutationFn: () => apiClient.deleteClassroom(classroom._id),
    onSuccess: () => {
      toast({
        title: 'Classroom deleted',
        description: 'The classroom has been permanently deleted.',
      })
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      router.push('/dashboard/classrooms')
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
    updateClassroomMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleDeleteClassroom = () => {
    const confirmMessage = `Are you sure you want to delete "${classroom.name}"? This action cannot be undone and will remove all posts, assignments, and student data.`
    if (confirm(confirmMessage)) {
      deleteClassroomMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Classroom Settings</span>
          </CardTitle>
          <CardDescription>
            Update your classroom information and settings.
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
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="e.g., Section A, Morning Batch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the classroom and what students will learn..."
                rows={4}
              />
            </div>

            <Button
              type="submit"
              disabled={updateClassroomMutation.isPending}
              className="w-full md:w-auto"
            >
              {updateClassroomMutation.isPending ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Classroom Code */}
      <Card>
        <CardHeader>
          <CardTitle>Classroom Code</CardTitle>
          <CardDescription>
            Share this code with students so they can join your classroom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="classroomCode">Code</Label>
              <Input
                id="classroomCode"
                value={classroom?.code || ''}
                readOnly
                className="bg-gray-50 font-mono text-lg tracking-wider"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(classroom?.code || '')
                toast({
                  title: 'Code copied!',
                  description: 'Classroom code has been copied to clipboard.',
                })
              }}
            >
              Copy Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Delete Classroom</h4>
              <p className="text-sm text-gray-600 mb-4">
                Once you delete a classroom, there is no going back. This will permanently delete the classroom, 
                all posts, assignments, submissions, and remove all students.
              </p>
              <Button
                variant="destructive"
                onClick={handleDeleteClassroom}
                disabled={deleteClassroomMutation.isPending}
              >
                {deleteClassroomMutation.isPending ? (
                  <>
                    <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Classroom
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}