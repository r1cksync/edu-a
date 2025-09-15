'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MessageSquare, 
  Bell, 
  FileText,
  Upload,
  X,
  Plus
} from 'lucide-react'
import Link from 'next/link'

export default function CreatePostPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [content, setContent] = useState('')
  const [type, setType] = useState<'announcement' | 'material' | 'discussion'>('announcement')
  const [classroomId, setClassroomId] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  // Clear selected files when type changes away from 'material'
  useEffect(() => {
    if (type !== 'material') {
      setSelectedFiles(null)
    }
  }, [type])

  // Get user's classrooms for selection
  const { data: classrooms, isLoading: classroomsLoading, error: classroomsError } = useQuery({
    queryKey: ['classrooms', 'owned'],
    queryFn: () => apiClient.getClassrooms(),
  })

  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiClient.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      router.push('/dashboard/posts')
    },
  })

  const createPostWithAttachmentsMutation = useMutation({
    mutationFn: ({ data, files }: { data: any; files: File[] }) => 
      apiClient.createPostWithAttachments(data, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      router.push('/dashboard/posts')
    },
  })

  if (user?.role !== 'teacher') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">Only teachers can create posts.</p>
          <Link href="/dashboard/posts">
            <Button className="mt-4">Back to Posts</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() || !classroomId) {
      return
    }

    const postData = {
      content: content.trim(),
      type,
      classroom: classroomId,
    }

    // Check if there are files to upload and if the post type is material
    if (type === 'material' && selectedFiles && selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles)
      createPostWithAttachmentsMutation.mutate({ 
        data: postData, 
        files: filesArray 
      })
    } else {
      createPostMutation.mutate(postData)
    }
  }

  const getTypeIcon = (postType: string) => {
    switch(postType) {
      case 'announcement': return <Bell className="h-4 w-4" />
      case 'material': return <FileText className="h-4 w-4" />
      case 'discussion': return <MessageSquare className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getTypeDescription = (postType: string) => {
    switch(postType) {
      case 'announcement': return 'Important updates and notices for your class'
      case 'material': return 'Course materials, resources, and reading assignments'
      case 'discussion': return 'Start conversations and Q&A with students'
      default: return ''
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
          <p className="text-gray-600 mt-2">
            Share announcements, materials, or start discussions with your students
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Details</CardTitle>
              <CardDescription>
                Fill out the information for your new post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Post Type Selection */}
              <div className="space-y-3">
                <Label>Post Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['announcement', 'material', 'discussion'].map((postType) => (
                    <button
                      key={postType}
                      type="button"
                      onClick={() => setType(postType as any)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        type === postType 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        {getTypeIcon(postType)}
                        <span className="font-medium capitalize">{postType}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {getTypeDescription(postType)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Classroom Selection */}
              <div className="space-y-2">
                <Label htmlFor="classroom">Classroom</Label>
                <Select value={classroomId} onValueChange={setClassroomId}>
                  <SelectTrigger>
                    <SelectValue placeholder={classroomsLoading ? "Loading classrooms..." : "Select a classroom"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classroomsLoading ? (
                      <SelectItem value="" disabled>Loading...</SelectItem>
                    ) : classroomsError ? (
                      <SelectItem value="" disabled>Error loading classrooms</SelectItem>
                    ) : !classrooms || (!Array.isArray(classrooms) && !(classrooms as any)?.classrooms?.length) ? (
                      <SelectItem value="" disabled>No classrooms available</SelectItem>
                    ) : (
                      <>
                        {/* Handle both direct array and nested data structure */}
                        {(Array.isArray(classrooms) ? classrooms : (classrooms as any)?.classrooms || []).map((classroom: any) => (
                          <SelectItem key={classroom._id} value={classroom._id}>
                            {classroom.name} ({classroom.classCode})
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {classroomsError && (
                  <p className="text-sm text-red-600">Failed to load classrooms</p>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder={`Write your ${type} here...`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  {content.length}/2000 characters
                </p>
              </div>

              {/* File Attachments - Only show for material posts */}
              {type === 'material' && (
                <div className="space-y-2">
                  <Label htmlFor="attachments">Attachments (PDF, JPEG)</Label>
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {selectedFiles && selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Selected files:</p>
                      <div className="space-y-1">
                        {Array.from(selectedFiles).map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm bg-gray-50 p-2 rounded">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span>{file.name}</span>
                            <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          {content && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  This is how your post will appear to students
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center space-x-2 mb-3">
                    {getTypeIcon(type)}
                    <span className="font-medium capitalize text-sm bg-white px-2 py-1 rounded border">
                      {type}
                    </span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">
                      {Array.isArray(classrooms) ? 
                        classrooms.find((c: any) => c._id === classroomId)?.name || 'Select classroom' :
                        'Select classroom'
                      }
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
                  {type === 'material' && selectedFiles && selectedFiles.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium text-gray-600 mb-2">Attachments:</p>
                      <div className="space-y-1">
                        {Array.from(selectedFiles).map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard/posts">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button 
              type="submit" 
              disabled={!content.trim() || !classroomId || createPostMutation.isPending || createPostWithAttachmentsMutation.isPending}
            >
              {(createPostMutation.isPending || createPostWithAttachmentsMutation.isPending) ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}