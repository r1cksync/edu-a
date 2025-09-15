'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MessageSquare, 
  Bell, 
  FileText,
  Calendar,
  Heart,
  Send,
  Download,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'

export default function PostDetailPage() {
  const params = useParams()
  const postId = params.id as string
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [comment, setComment] = useState('')

  const { data: postResponse, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiClient.getPost(postId),
  })

  const post = (postResponse as any)?.post || postResponse

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => apiClient.createComment(postId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      setComment('')
    },
  })

  const likePostMutation = useMutation({
    mutationFn: () => apiClient.likePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const handleDownloadAttachment = async (attachmentId: string) => {
    try {
      await apiClient.downloadPostAttachment(postId, attachmentId)
    } catch (error) {
      console.error('Download failed:', error)
      // Show user-friendly error message
      alert('Failed to download attachment. Please try again.')
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

  if (!post) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Post not found</h1>
          <p className="text-gray-600 mt-2">The post you're looking for doesn't exist.</p>
          <Link href="/dashboard/posts">
            <Button className="mt-4">Back to Posts</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const postData = post as any

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'announcement': return <Bell className="h-5 w-5" />
      case 'material': return <FileText className="h-5 w-5" />
      case 'discussion': return <MessageSquare className="h-5 w-5" />
      default: return <MessageSquare className="h-5 w-5" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'announcement': return <Badge variant="default">Announcement</Badge>
      case 'material': return <Badge variant="secondary">Material</Badge>
      case 'discussion': return <Badge variant="outline">Discussion</Badge>
      default: return <Badge variant="outline">{type}</Badge>
    }
  }

  const handleAddComment = () => {
    if (!comment.trim()) return
    addCommentMutation.mutate(comment.trim())
  }

  const handleLike = () => {
    likePostMutation.mutate()
  }

  const isLikedByUser = postData?.likes?.includes(user?.id)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Post Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/posts">
            <Button variant="outline">← Back to Posts</Button>
          </Link>
          {user?.id === postData?.author?._id && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Main Post */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={postData?.author?.avatar} />
                  <AvatarFallback>
                    {postData?.author?.name?.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{postData?.author?.name}</h3>
                  <p className="text-sm text-gray-500">{postData?.author?.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getTypeIcon(postData?.type)}
                {getTypeBadge(postData?.type)}
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-4">
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {new Date(postData?.createdAt).toLocaleString()}
              </div>
              <span>•</span>
              <span>{postData?.classroom?.name}</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Post Content */}
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap text-lg leading-relaxed">
                {postData?.content}
              </p>
            </div>

            {/* Attachments */}
            {postData?.attachments && postData.attachments.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Attachments</h4>
                <div className="space-y-2">
                  {postData.attachments.map((attachment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{attachment.fileName}</p>
                          <p className="text-sm text-gray-500">
                            {attachment.fileSize ? `${Math.round(attachment.fileSize / 1024)} KB` : 'Unknown size'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment._id || attachment.id || index)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post Actions */}
            <div className="border-t pt-4 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-2 transition-colors ${
                    isLikedByUser ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                  }`}
                  disabled={likePostMutation.isPending}
                >
                  <Heart className={`h-5 w-5 ${isLikedByUser ? 'fill-current' : ''}`} />
                  <span>{postData?.likes?.length || 0}</span>
                </button>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MessageSquare className="h-5 w-5" />
                  <span>{postData?.comments?.length || 0} comments</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle>Comments ({postData?.comments?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Comment */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Avatar>
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>
                    {user?.name?.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleAddComment}
                      disabled={!comment.trim() || addCommentMutation.isPending}
                      size="sm"
                    >
                      <Send className="mr-1 h-4 w-4" />
                      {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            {postData?.comments && postData.comments.length > 0 ? (
              <div className="space-y-4 border-t pt-6">
                {postData.comments.map((commentItem: any) => (
                  <div key={commentItem._id} className="flex items-start space-x-3">
                    <Avatar>
                      <AvatarImage src={commentItem.author.avatar} />
                      <AvatarFallback>
                        {commentItem.author.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">{commentItem.author.name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(commentItem.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{commentItem.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-t">
                <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}