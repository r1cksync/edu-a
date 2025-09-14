'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageSquare, 
  Search, 
  Plus,
  Calendar,
  BookOpen,
  Bell,
  FileText
} from 'lucide-react'
import Link from 'next/link'

export default function PostsPage() {
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => apiClient.getPosts(),
  })

  // Handle backend response structure: { posts: [], total: number }
  const postsList = Array.isArray(posts) ? posts : (posts as any)?.posts || []
  
  const filteredPosts = postsList.filter((post: any) =>
    post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.classroom?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPostsByType = () => {
    const announcements = filteredPosts.filter((post: any) => post.type === 'announcement')
    const materials = filteredPosts.filter((post: any) => post.type === 'material') 
    const discussions = filteredPosts.filter((post: any) => post.type === 'discussion')
    
    return { announcements, materials, discussions }
  }

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'announcement': return <Bell className="h-4 w-4" />
      case 'material': return <FileText className="h-4 w-4" />
      case 'discussion': return <MessageSquare className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const { announcements, materials, discussions } = getPostsByType()

  const renderPostCard = (post: any) => (
    <Card key={post._id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {getTypeIcon(post.type)}
              {getTypeBadge(post.type)}
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">{post.classroom?.name}</span>
            </div>
            <p className="text-gray-700 line-clamp-3">{post.content}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <MessageSquare className="mr-1 h-4 w-4" />
                {post.comments?.length || 0} comments
              </div>
            </div>
          </div>
          <Link href={`/dashboard/posts/${post._id}`}>
            <Button variant="outline" size="sm">
              View
            </Button>
          </Link>
        </div>
      </CardHeader>
    </Card>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Posts & Announcements</h1>
            <p className="text-gray-600 mt-2">
              Stay updated with class announcements, materials, and discussions
            </p>
          </div>
          {user?.role === 'teacher' && (
            <Link href="/dashboard/posts/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Post
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Posts Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({filteredPosts.length})</TabsTrigger>
            <TabsTrigger value="announcements">
              <Bell className="mr-1 h-4 w-4" />
              Announcements ({announcements.length})
            </TabsTrigger>
            <TabsTrigger value="materials">
              <FileText className="mr-1 h-4 w-4" />
              Materials ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="discussions">
              <MessageSquare className="mr-1 h-4 w-4" />
              Discussions ({discussions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredPosts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                  <p className="text-gray-500">
                    {user?.role === 'teacher' 
                      ? 'Create your first post to share with your students.'
                      : 'Your teachers will share announcements and materials here.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map(renderPostCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4">
            {announcements.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
                  <p className="text-gray-500">
                    Important class announcements will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {announcements.map(renderPostCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            {materials.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No materials</h3>
                  <p className="text-gray-500">
                    Course materials and resources will be shared here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {materials.map(renderPostCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discussions" className="space-y-4">
            {discussions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions</h3>
                  <p className="text-gray-500">
                    Class discussions and Q&A will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {discussions.map(renderPostCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}