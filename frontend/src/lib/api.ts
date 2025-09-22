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

  async createPostWithAttachments(data: any, files: File[]) {
    const { classroom, ...postData } = data
    const formData = new FormData()
    
    // Add text fields
    Object.keys(postData).forEach(key => {
      if (postData[key] !== undefined && postData[key] !== null) {
        formData.append(key, postData[key])
      }
    })
    
    // Add files
    files.forEach(file => {
      formData.append('attachments', file)
    })
    
    const { token } = useAuthStore.getState()
    
    const url = `${this.baseUrl}/posts/classroom/${classroom}/with-attachments`
    
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

  async downloadPostAttachment(postId: string, attachmentId: string) {
    const { token } = useAuthStore.getState()
    
    if (!token) {
      throw new Error('Authentication required')
    }
    
    // Create download URL with token as query parameter
    const downloadUrl = `${this.baseUrl}/posts/${postId}/attachments/${attachmentId}/download?token=${encodeURIComponent(token)}`
    
    try {
      // Open the download URL directly in a new window
      // This bypasses CORS issues since we're not using fetch()
      window.open(downloadUrl, '_blank')
      
    } catch (error) {
      console.error('Download error:', error)
      throw error
    }
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

  // Video Class endpoints
  async scheduleVideoClass(classData: {
    classroomId: string
    title: string
    description?: string
    scheduledStartTime: string
    scheduledEndTime: string
    type?: 'scheduled' | 'instant'
    allowLateJoin?: boolean
    maxDuration?: number
    isRecorded?: boolean
  }) {
    return this.request('/video-classes/schedule', {
      method: 'POST',
      body: JSON.stringify(classData),
    })
  }

  async startInstantClass(classData: {
    classroomId: string
    title?: string
    description?: string
    maxDuration?: number
  }) {
    return this.request('/video-classes/instant', {
      method: 'POST',
      body: JSON.stringify(classData),
    })
  }

  async startVideoClass(classId: string) {
    return this.request(`/video-classes/${classId}/start`, {
      method: 'PUT',
    })
  }

  async endVideoClass(classId: string) {
    return this.request(`/video-classes/${classId}/end`, {
      method: 'PUT',
    })
  }

  async joinVideoClass(classId: string) {
    return this.request(`/video-classes/${classId}/join`, {
      method: 'POST',
    })
  }

  async leaveVideoClass(classId: string) {
    return this.request(`/video-classes/${classId}/leave`, {
      method: 'PUT',
    })
  }

  async getClassroomVideoClasses(classroomId: string, params?: {
    status?: string
    limit?: number
    page?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.page) queryParams.append('page', params.page.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request(`/video-classes/classroom/${classroomId}${query}`)
  }

  async getUpcomingVideoClasses(classroomId: string) {
    return this.request(`/video-classes/classroom/${classroomId}/upcoming`)
  }

  async getLiveVideoClasses(classroomId: string) {
    return this.request(`/video-classes/classroom/${classroomId}/live`)
  }

  async getVideoClass(classId: string) {
    return this.request(`/video-classes/${classId}`)
  }

  async updateVideoClass(classId: string, updates: {
    title?: string
    description?: string
    scheduledStartTime?: string
    scheduledEndTime?: string
    allowLateJoin?: boolean
    isRecorded?: boolean
  }) {
    return this.request(`/video-classes/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteVideoClass(classId: string) {
    return this.request(`/video-classes/${classId}`, {
      method: 'DELETE',
    })
  }

  // Quiz endpoints
  async createQuiz(data: {
    classroomId: string
    title: string
    description?: string
    instructions?: string
    questions: Array<{
      type: 'multiple-choice' | 'true-false' | 'single-choice'
      question: string
      options: Array<{ text: string; isCorrect: boolean }>
      explanation?: string
      points?: number
      timeLimit?: number
    }>
    scheduledStartTime: string
    scheduledEndTime: string
    duration: number
    passingScore?: number
    shuffleQuestions?: boolean
    shuffleOptions?: boolean
    showResults?: boolean
    allowReview?: boolean
    isProctored?: boolean
    proctoringSettings?: any
    attempts?: number
    tags?: string[]
    difficulty?: 'easy' | 'medium' | 'hard'
  }) {
    return this.request(`/quizzes/classrooms/${data.classroomId}/quizzes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getClassroomQuizzes(classroomId: string, params?: {
    status?: string
    limit?: number
    page?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.page) queryParams.append('page', params.page.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request(`/quizzes/classrooms/${classroomId}/quizzes${query}`)
  }

  async getActiveQuizzes(classroomId: string) {
    return this.request(`/quizzes/classrooms/${classroomId}/quizzes/active`)
  }

  async getQuiz(quizId: string) {
    return this.request(`/quizzes/quizzes/${quizId}`)
  }

  // Student quiz endpoints
  async getStudentQuizzes(classroomId: string, params?: {
    status?: 'all' | 'available' | 'attempted' | 'completed'
  }) {
    const queryParams = new URLSearchParams()
    if (params?.status && params.status !== 'all') {
      queryParams.append('status', params.status)
    }
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request(`/quizzes/classrooms/${classroomId}/quizzes${query}`)
  }

  async getStudentQuizSessions(classroomId: string) {
    return this.request(`/quizzes/classrooms/${classroomId}/sessions/student`)
  }

  async updateQuiz(quizId: string, updates: any) {
    return this.request(`/quizzes/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteQuiz(quizId: string) {
    return this.request(`/quizzes/quizzes/${quizId}`, {
      method: 'DELETE',
    })
  }

  // Quiz Session endpoints
  async startQuizSession(quizId: string, proctoringData?: any) {
    return this.request(`/quizzes/quizzes/${quizId}/sessions`, {
      method: 'POST',
      body: JSON.stringify({ proctoringData }),
    })
  }

  async getCurrentQuizSession(quizId: string) {
    return this.request(`/quizzes/quizzes/${quizId}/sessions/current`)
  }

  async saveQuizAnswers(sessionId: string, answers: Record<string, string>) {
    return this.request(`/quizzes/sessions/${sessionId}/answers`, {
      method: 'PUT',
      body: JSON.stringify({ answers }),
    })
  }

  async submitQuiz(sessionId: string) {
    return this.request(`/quizzes/sessions/${sessionId}/submit`, {
      method: 'POST',
    })
  }

  async getQuizResults(sessionId: string) {
    return this.request(`/quizzes/sessions/${sessionId}/results`, {
      method: 'GET',
    })
  }

  async updateProctoringData(sessionId: string, data: any) {
    return this.request(`/quizzes/sessions/${sessionId}/proctoring`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async reportViolation(sessionId: string, violation: any) {
    return this.request(`/quizzes/sessions/${sessionId}/violations`, {
      method: 'POST',
      body: JSON.stringify({ violation }),
    })
  }

  async getQuizSessionResults(sessionId: string) {
    return this.request(`/quizzes/sessions/${sessionId}/results`)
  }

  // Quiz Review endpoints (for teachers)
  async getSessionsForReview(classroomId: string, params?: {
    status?: string
    riskLevel?: string
    limit?: number
    page?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.riskLevel) queryParams.append('riskLevel', params.riskLevel)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.page) queryParams.append('page', params.page.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request(`/quizzes/classrooms/${classroomId}/sessions/review${query}`)
  }

  async reviewQuizSession(sessionId: string, data: {
    decision: 'accept' | 'reject' | 'partial_credit' | 'retake_required'
    notes?: string
    scoreAdjustment?: number
  }) {
    return this.request(`/quizzes/sessions/${sessionId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getQuizSessionDetails(sessionId: string) {
    return this.request(`/quizzes/sessions/${sessionId}/student-details`)
  }

  // Attendance endpoints
  async getAttendanceDashboard(classroomId: string, params?: {
    startDate?: string
    endDate?: string
    limit?: number
    page?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.page) queryParams.append('page', params.page.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request(`/attendance/classrooms/${classroomId}/dashboard${query}`)
  }

  async getStudentAttendanceStats(classroomId: string, studentId?: string) {
    const endpoint = studentId 
      ? `/attendance/classrooms/${classroomId}/students/stats?studentId=${studentId}`
      : `/attendance/classrooms/${classroomId}/students/stats`
    return this.request(endpoint)
  }

  async getClassroomAttendanceStats(classroomId: string, params?: {
    startDate?: string
    endDate?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request(`/attendance/classrooms/${classroomId}/stats${query}`)
  }

  async getAttendanceHistory(classroomId: string, params?: {
    studentId?: string
    startDate?: string
    endDate?: string
    limit?: number
    page?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params?.studentId) queryParams.append('studentId', params.studentId)
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.page) queryParams.append('page', params.page.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request(`/attendance/classrooms/${classroomId}/records${query}`)
  }

  async markAttendance(data: {
    studentId: string
    videoClassId: string
    status: 'present' | 'absent' | 'joined' | 'left'
    timestamp?: string
  }) {
    return this.request(`/attendance/classes/${data.videoClassId}/mark`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async bulkMarkAttendance(classId: string, data: Array<{
    studentId: string
    status: 'present' | 'absent'
    notes?: string
  }>) {
    return this.request(`/attendance/classes/${classId}/bulk-mark`, {
      method: 'POST',
      body: JSON.stringify({ attendanceRecords: data }),
    })
  }

  async syncAbsencesForEndedClasses(classroomId: string) {
    return this.request(`/attendance/classrooms/${classroomId}/sync-absences`, {
      method: 'POST',
    })
  }

  // Engagement Analysis endpoints
  async analyzeStudentEngagement(formData: FormData) {
    const { token } = useAuthStore.getState()
    const url = `${this.baseUrl}/engagement/analyze`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type, let browser set it for FormData
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async getClassStudents(classId: string) {
    return this.request(`/engagement/class/${classId}/students`)
  }

  async getClassEngagementHistory(classId: string, limit = 10) {
    return this.request(`/engagement/class/${classId}/history?limit=${limit}`)
  }

  async getStudentEngagementHistory(studentId: string, page = 1, limit = 10) {
    return this.request(`/engagement/student/${studentId}/history?page=${page}&limit=${limit}`)
  }

  async checkEngagementApiHealth() {
    return this.request(`/engagement/api/health`)
  }

  // Daily Practice Problems (DPP) endpoints
  async createDPP(dppData: any) {
    return this.request('/dpp', {
      method: 'POST',
      body: JSON.stringify(dppData)
    })
  }

  async getClassroomDPPs(classroomId: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
    return this.request(`/dpp/classroom/${classroomId}${queryString}`)
  }

  async getDPP(dppId: string) {
    return this.request(`/dpp/${dppId}`)
  }

  async updateDPP(dppId: string, updateData: any) {
    return this.request(`/dpp/${dppId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
  }

  async deleteDPP(dppId: string) {
    return this.request(`/dpp/${dppId}`, {
      method: 'DELETE'
    })
  }

  async togglePublishDPP(dppId: string) {
    return this.request(`/dpp/${dppId}/publish`, {
      method: 'PATCH'
    })
  }

  async submitMCQAnswers(dppId: string, answers: any[]) {
    return this.request(`/dpp/${dppId}/submit/mcq`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    })
  }

  async submitDPPFiles(dppId: string, formData: FormData) {
    const { token } = useAuthStore.getState()
    const url = `${this.baseUrl}/dpp/${dppId}/submit/files`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async gradeDPPSubmission(dppId: string, submissionId: string, gradeData: any) {
    return this.request(`/dpp/${dppId}/submissions/${submissionId}/grade`, {
      method: 'PUT',
      body: JSON.stringify(gradeData)
    })
  }

  async getDPPAnalytics(dppId: string) {
    return this.request(`/dpp/${dppId}/analytics`)
  }

  async getSubmission(dppId: string, submissionId: string) {
    return this.request(`/dpp/${dppId}/submissions/${submissionId}`)
  }

  async getMySubmission(dppId: string) {
    return this.request(`/dpp/${dppId}/my-submission`)
  }

  // AI endpoints
  async generateMCQQuestions(data: {
    topics: string
    numberOfQuestions: number
    difficulty?: 'easy' | 'medium' | 'hard'
  }) {
    return this.request('/ai/generate/mcq', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async generateMCQQuestionsFromPDF(formData: FormData) {
    const { token } = useAuthStore.getState()
    const response = await fetch(`${this.baseUrl}/ai/generate/mcq/pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async previewAIQuestions(data: {
    questions: any[]
    metadata: any
  }) {
    return this.request('/ai/preview', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Refresher endpoints
  async getRefresherHistory(classroomId: string) {
    return this.request(`/refresher/classroom/${classroomId}/history`)
  }

  async getAvailableDPPsForRefresher(classroomId: string) {
    return this.request(`/refresher/classroom/${classroomId}/available-dpps`)
  }

  async startRefresherSession(classroomId: string, data: {
    submissionId: string
    questionsPerBatch: number
  }) {
    return this.request(`/refresher/classroom/${classroomId}/start`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getRefresherSession(sessionId: string) {
    return this.request(`/refresher/session/${sessionId}`)
  }

  async submitRefresherBatch(sessionId: string, data: {
    answers: Array<{
      selectedOption: number
      timeSpent?: number
    }>
  }) {
    return this.request(`/refresher/session/${sessionId}/submit-batch`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async generateMoreRefresherQuestions(sessionId: string, data: {
    questionsCount: number
  }) {
    return this.request(`/refresher/session/${sessionId}/generate-more`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async concludeRefresherSession(sessionId: string) {
    return this.request(`/refresher/session/${sessionId}/conclude`, {
      method: 'POST'
    })
  }

  // Calendar endpoints
  async getCalendarEvents(params?: {
    startDate?: string
    endDate?: string
    classroomId?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.classroomId) queryParams.append('classroomId', params.classroomId)
    
    const query = queryParams.toString()
    return this.request(`/calendar/events${query ? `?${query}` : ''}`)
  }

  async getUpcomingEvents(limit?: number) {
    const query = limit ? `?limit=${limit}` : ''
    return this.request(`/calendar/upcoming${query}`)
  }

  async getEventsForDate(date: string) {
    return this.request(`/calendar/date/${date}`)
  }

  // Generic GET method for backward compatibility
  async get<T>(endpoint: string): Promise<T> {
    return this.request(endpoint)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)