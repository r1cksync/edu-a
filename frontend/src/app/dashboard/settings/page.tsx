'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Settings, 
  Shield,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Profile stats - mock data for now
  const statsData = {
    classrooms: 0,
    students: 0,
    assignments: 0,
    posts: 0,
    enrolledClasses: 0,
    submissions: 0,
    averageGrade: 'N/A'
  }

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) => 
      apiClient.updateProfile(data),
    onSuccess: (updatedUser) => {
      // Update local storage and refresh
      localStorage.setItem('user', JSON.stringify(updatedUser))
      window.location.reload()
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      // Mock password change for now
      Promise.resolve({}),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
  })

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    updateProfileMutation.mutate({
      name: name.trim(),
      email: email.trim(),
    })
  }

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      return
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    })
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Bell className="mr-2 h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Info */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information and profile details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={user?.avatar} />
                          <AvatarFallback className="text-xl">
                            {user?.name?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Button variant="outline" size="sm">
                            Change Avatar
                          </Button>
                          <p className="text-sm text-gray-500 mt-1">
                            JPG, GIF or PNG. 1MB max.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Role</Label>
                          <div className="flex items-center space-x-2">
                            <Badge variant={user?.role === 'teacher' ? 'default' : 'secondary'}>
                              {user?.role}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Contact admin to change role
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Member Since</Label>
                          <p className="text-sm text-gray-600">
                            {new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Stats */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Your Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {user?.role === 'teacher' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Classrooms</span>
                          <span className="font-medium">{statsData?.classrooms || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Students</span>
                          <span className="font-medium">{statsData?.students || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assignments</span>
                          <span className="font-medium">{statsData?.assignments || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Posts</span>
                          <span className="font-medium">{statsData?.posts || 0}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Enrolled Classes</span>
                          <span className="font-medium">{statsData?.enrolledClasses || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assignments</span>
                          <span className="font-medium">{statsData?.assignments || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Submissions</span>
                          <span className="font-medium">{statsData?.submissions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Average Grade</span>
                          <span className="font-medium">{statsData?.averageGrade || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>

                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-sm text-red-600">Passwords do not match</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      disabled={
                        !currentPassword || 
                        !newPassword || 
                        newPassword !== confirmPassword ||
                        changePasswordMutation.isPending
                      }
                    >
                      {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Email Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">New Assignments</p>
                          <p className="text-sm text-gray-500">Get notified when teachers post new assignments</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Grade Updates</p>
                          <p className="text-sm text-gray-500">Get notified when your assignments are graded</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Class Announcements</p>
                          <p className="text-sm text-gray-500">Get notified about important class announcements</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Privacy Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Profile Visibility</p>
                          <p className="text-sm text-gray-500">Allow other students to see your profile</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Show Online Status</p>
                          <p className="text-sm text-gray-500">Show when you're active in classes</p>
                        </div>
                        <input type="checkbox" className="toggle" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button>Save Preferences</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}