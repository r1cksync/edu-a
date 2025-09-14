import { useAuthStore } from '@/store/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { token } = useAuthStore.getState()
    
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        // Handle authentication errors
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          useAuthStore.getState().logout()
        }
        throw error
      }
      throw new Error('An unexpected error occurred')
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(name: string, email: string, password: string, role: 'teacher' | 'student'): Promise<{ token: string; user: any }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    })
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, password: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  }

  async getProfile() {
    return this.request('/auth/profile')
  }

  async updateProfile(data: any) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Classroom endpoints
  async getClassrooms() {
    return this.request('/classrooms')
  }

  async getClassroom(id: string) {
    return this.request(`/classrooms/${id}`)
  }

  async createClassroom(data: any) {
    return this.request('/classrooms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateClassroom(id: string, data: any) {
    return this.request(`/classrooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteClassroom(id: string) {
    return this.request(`/classrooms/${id}`, {
      method: 'DELETE',
    })
  }

  async joinClassroom(classCode: string) {
    return this.request('/classrooms/join', {
      method: 'POST',
      body: JSON.stringify({ classCode: classCode.toUpperCase() }),
    })
  }

  async leaveClassroom(id: string) {
    return this.request(`/classrooms/${id}/leave`, {
      method: 'POST',
    })
  }

  async getClassroomStudents(id: string) {
    return this.request(`/classrooms/${id}/students`)
  }

  async removeStudent(classroomId: string, studentId: string) {
    return this.request(`/classrooms/${classroomId}/students/${studentId}`, {
      method: 'DELETE',
    })
  }

  // Assignment endpoints
  async getAssignments(classroomId?: string) {
    if (classroomId) {
      return this.request(`/assignments/classroom/${classroomId}`)
    }
    return this.request('/assignments')
  }

  async getAssignment(id: string) {
    return this.request(`/assignments/${id}`)
  }

  async createAssignment(data: any) {
    const { classroom, points, ...assignmentData } = data
    const requestData = {
      ...assignmentData,
      totalPoints: points || 100
    }
    return this.request(`/assignments/classroom/${classroom}`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async updateAssignment(id: string, data: any) {
    return this.request(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteAssignment(id: string) {
    return this.request(`/assignments/${id}`, {
      method: 'DELETE',
    })
  }

  async getSubmissions(assignmentId: string) {
    return this.request(`/assignments/${assignmentId}/submissions`)
  }

  async submitAssignment(assignmentId: string, data: any) {
    return this.request(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async gradeSubmission(submissionId: string, data: any) {
    return this.request(`/assignments/submissions/${submissionId}/grade`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // MCQ Assignment submission
  async submitMCQAssignment(assignmentId: string, data: { answers: { [questionId: string]: string } }) {
    return this.request(`/assignments/${assignmentId}/submit-mcq`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // File-based assignment submission  
  async submitFileAssignment(assignmentId: string, files: File[]) {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append(`files`, file)
    })

    // For FormData, we need to override the request method to not set Content-Type
    const { token } = useAuthStore.getState()
    const url = `${this.baseUrl}/assignments/${assignmentId}/submit-files`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  // Add attachments to assignment (Teachers)
  async addAssignmentAttachments(assignmentId: string, files: File[]) {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append(`attachments`, file)
    })

    const { token } = useAuthStore.getState()
    const url = `${this.baseUrl}/assignments/${assignmentId}/attachments`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  // Download assignment attachment
  async downloadAssignmentAttachment(assignmentId: string, attachmentId: string) {
    const { token } = useAuthStore.getState()
    
    if (!token) {
      throw new Error('Authentication required')
    }
    
    // Create download URL with token as query parameter
    const downloadUrl = `${this.baseUrl}/assignments/${assignmentId}/attachments/${attachmentId}/download?token=${encodeURIComponent(token)}`
    
    try {
      // Open the download URL directly in a new window
      // This bypasses CORS issues since we're not using fetch()
      window.open(downloadUrl, '_blank')
      
    } catch (error) {
      console.error('Download error:', error)
      throw error
    }
  }

  // Post endpoints
  async getPosts(classroomId?: string) {
    if (classroomId) {
      return this.request(`/posts/classroom/${classroomId}`)
    }
    return this.request('/posts')
  }

  async getPost(id: string) {
    return this.request(`/posts/${id}`)
  }

  async createPost(data: any) {
    const { classroom, ...postData } = data
    return this.request(`/posts/classroom/${classroom}`, {
      method: 'POST',
      body: JSON.stringify(postData),
    })
  }

  async updatePost(id: string, data: any) {
    return this.request(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deletePost(id: string) {
    return this.request(`/posts/${id}`, {
      method: 'DELETE',
    })
  }

  async likePost(id: string) {
    return this.request(`/posts/${id}/like`, {
      method: 'POST',
    })
  }

  async unlikePost(id: string) {
    return this.request(`/posts/${id}/unlike`, {
      method: 'POST',
    })
  }

  async getComments(postId: string) {
    return this.request(`/posts/${postId}/comments`)
  }

  async createComment(postId: string, data: any) {
    return this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateComment(commentId: string, data: any) {
    return this.request(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteComment(commentId: string) {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE',
    })
  }

  // File upload endpoint
  async uploadFile(file: File, folder?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) {
      formData.append('folder', folder)
    }

    const { token } = useAuthStore.getState()
    
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }
}

export const apiClient = new ApiClient(API_BASE_URL)