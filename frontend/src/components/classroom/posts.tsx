'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { 
  Plus, 
  MessageSquare, 
  ThumbsUp, 
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  User,
  FileText,
  Upload,
  X
} from 'lucide-react'

interface ClassroomPostsProps {
  classroomId: string
  isTeacher: boolean
}

export default function ClassroomPosts({ classroomId, isTeacher }: ClassroomPostsProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'announcement' as 'announcement' | 'material',
  })
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  // Clear selected files when type changes away from 'material'
  useEffect(() => {
    if (newPost.type !== 'material') {
      setSelectedFiles(null)
    }
  }, [newPost.type])

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', classroomId],
    queryFn: () => apiClient.getPosts(classroomId),
  })

  // Handle backend response structure: { posts: [], pagination: {} }
  const postsList = Array.isArray(posts) ? posts : (posts as any)?.posts || []

  const createPostMutation = useMutation({
    mutationFn: (data: typeof newPost & { classroom: string }) => apiClient.createPost(data),
    onSuccess: () => {
      toast({
        title: 'Post created!',
        description: 'Your post has been shared with the class.',
      })
      queryClient.invalidateQueries({ queryKey: ['posts', classroomId] })
      setIsCreateDialogOpen(false)
      setNewPost({ title: '', content: '', type: 'announcement' })
      setSelectedFiles(null)
    },
  })

  const createPostWithAttachmentsMutation = useMutation({
    mutationFn: ({ data, files }: { data: typeof newPost & { classroom: string }; files: File[] }) => 
      apiClient.createPostWithAttachments(data, files),
    onSuccess: () => {
      toast({
        title: 'Post created with attachments!',
        description: 'Your post has been shared with the class.',
      })
      queryClient.invalidateQueries({ queryKey: ['posts', classroomId] })
      setIsCreateDialogOpen(false)
      setNewPost({ title: '', content: '', type: 'announcement' })
      setSelectedFiles(null)
    },
  })

  const likePostMutation = useMutation({
    mutationFn: (postId: string) => apiClient.likePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', classroomId] })
    },
  })

  const handleCreatePost = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in both title and content.',
        variant: 'destructive',
      })
      return
    }

    const postData = { ...newPost, classroom: classroomId }

    // Check if there are files to upload and if the post type is material
    if (newPost.type === 'material' && selectedFiles && selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles)
      createPostWithAttachmentsMutation.mutate({ 
        data: postData, 
        files: filesArray 
      })
    } else {
      createPostMutation.mutate(postData)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Post Button */}
      {isTeacher && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
              <DialogDescription>
                Share announcements, materials, or updates with your class.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Post Type</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={newPost.type === 'announcement' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewPost(prev => ({ ...prev, type: 'announcement' }))}
                  >
                    Announcement
                  </Button>
                  <Button
                    variant={newPost.type === 'material' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewPost(prev => ({ ...prev, type: 'material' }))}
                  >
                    Material
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter post title..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your post content..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* File Upload for Material Posts */}
              {newPost.type === 'material' && (
                <div>
                  <label className="text-sm font-medium">Attachments</label>
                  <div className="mt-1 space-y-3">
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="file-upload-classroom" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-4 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF or images (MAX. 50MB)</p>
                        </div>
                        <input
                          id="file-upload-classroom"
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.gif"
                          className="hidden"
                          onChange={(e) => setSelectedFiles(e.target.files)}
                        />
                      </label>
                    </div>

                    {/* Selected Files Preview */}
                    {selectedFiles && selectedFiles.length > 0 && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Selected Files ({selectedFiles.length})</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFiles(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
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
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePost} 
                  disabled={createPostMutation.isPending || createPostWithAttachmentsMutation.isPending}
                >
                  {(createPostMutation.isPending || createPostWithAttachmentsMutation.isPending) ? 'Creating...' : 'Create Post'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Posts List */}
      {!postsList || postsList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500">
              {isTeacher 
                ? 'Create your first post to share announcements or materials with your students.'
                : 'Your teacher will post announcements and materials here.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {postsList.map((post: any) => (
            <Card key={post._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{post.title}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{post.author?.name || 'Teacher'}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <Badge variant={post.type === 'announcement' ? 'default' : 'secondary'} className="ml-2">
                          {post.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {(isTeacher && post.author?._id === user?.id) && (
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center space-x-4 mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => likePostMutation.mutate(post._id)}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <ThumbsUp className="mr-1 h-4 w-4" />
                    {post.likes?.length || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <MessageSquare className="mr-1 h-4 w-4" />
                    {post.comments?.length || 0}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}