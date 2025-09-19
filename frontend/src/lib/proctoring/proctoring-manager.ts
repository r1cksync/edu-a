import { FaceDetectionService } from './face-detection'
import { BrowserLockdownService } from './browser-lockdown'
import { ActivityMonitorService } from './activity-monitor'
import { ViolationDetector } from './violation-detector'
import type { ProctoringConfig, ViolationEvent, ProctoringState } from './types'

// Re-export types for backward compatibility
export type { ProctoringConfig, ViolationEvent, ProctoringState } from './types'

export class ProctoringManager {
  private config: ProctoringConfig
  private state: ProctoringState
  private services: {
    faceDetection?: FaceDetectionService
    browserLockdown?: BrowserLockdownService
    activityMonitor?: ActivityMonitorService
    violationDetector?: ViolationDetector
  } = {}
  
  private videoElement?: HTMLVideoElement
  private stream?: MediaStream
  private onViolation?: (violation: ViolationEvent) => void
  private onStateChange?: (state: ProctoringState) => void
  private canStop: boolean = false // Flag to control stopping proctoring
  
  constructor(config: ProctoringConfig) {
    this.config = config
    this.state = {
      isActive: false,
      isInitialized: false,
      hasWebcam: false,
      hasMicrophone: false,
      violations: [],
      riskScore: 0,
      lastHeartbeat: Date.now()
    }
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing proctoring system...')
      
      // Check device capabilities
      await this.checkDeviceCapabilities()
      
      // Initialize camera if required
      if (this.config.webcamRequired || this.config.faceDetection) {
        await this.initializeCamera()
      }
      
      // Initialize services based on config
      await this.initializeServices()
      
      this.state.isInitialized = true
      this.notifyStateChange()
      
      console.log('Proctoring system initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize proctoring system:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Proctoring initialization failed: ${errorMessage}`)
    }
  }

  async start(): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('Proctoring system not initialized')
    }

    try {
      console.log('Starting proctoring monitoring...')
      
      // Start camera stream if not already started
      if (this.config.webcamRequired && !this.stream) {
        await this.startCameraStream()
      }
      
      // Start all active services
      if (this.services.faceDetection && this.config.faceDetection) {
        await this.services.faceDetection.start()
      }
      
      if (this.services.browserLockdown && this.config.browserLockdown) {
        this.services.browserLockdown.enable()
      }
      
      if (this.services.activityMonitor) {
        this.services.activityMonitor.start()
      }
      
      if (this.services.violationDetector) {
        this.services.violationDetector.start()
      }
      
      // Start heartbeat
      this.startHeartbeat()
      
      this.state.isActive = true
      this.canStop = false // Reset canStop flag when starting
      this.notifyStateChange()
      
      console.log('Proctoring monitoring started')
    } catch (error) {
      console.error('Failed to start proctoring:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.canStop) {
      console.log('Proctoring stop prevented: Quiz still in progress')
      return
    }

    console.log('Stopping proctoring monitoring...')
    
    // Stop all services
    if (this.services.faceDetection) {
      this.services.faceDetection.stop()
    }
    
    if (this.services.browserLockdown) {
      this.services.browserLockdown.disable()
    }
    
    if (this.services.activityMonitor) {
      this.services.activityMonitor.stop()
    }
    
    if (this.services.violationDetector) {
      this.services.violationDetector.stop()
    }
    
    // Stop camera stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = undefined
    }
    
    this.state.isActive = false
    this.notifyStateChange()
    
    console.log('Proctoring monitoring stopped')
  }

  // Method to allow stopping proctoring (called when quiz time is up or submitted)
  allowStop(): void {
    this.canStop = true
    console.log('Proctoring stop allowed')
  }

  private async startCameraStream(): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: this.config.microphoneMonitoring
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Create video element for face detection
      this.videoElement = document.createElement('video')
      this.videoElement.srcObject = this.stream
      this.videoElement.autoplay = true
      this.videoElement.muted = true
      this.videoElement.playsInline = true
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        this.videoElement!.onloadedmetadata = () => resolve()
        this.videoElement!.onerror = reject
        setTimeout(reject, 5000) // 5 second timeout
      })
      
      console.log('Camera stream started successfully')
    } catch (error) {
      console.error('Failed to start camera stream:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Camera access denied. Please allow camera access to continue.')
        } else if (error.name === 'NotFoundError') {
          throw new Error('No camera found. Please connect a camera to continue.')
        } else {
          throw new Error(`Camera stream failed: ${error.message}`)
        }
      } else {
        throw new Error('Camera stream failed: Unknown error')
      }
    }
  }

  private async checkDeviceCapabilities(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      
      this.state.hasWebcam = devices.some(device => device.kind === 'videoinput')
      this.state.hasMicrophone = devices.some(device => device.kind === 'audioinput')
      
      if (this.config.webcamRequired && !this.state.hasWebcam) {
        throw new Error('Webcam is required but not available')
      }
      
      console.log('Device capabilities checked:', {
        webcam: this.state.hasWebcam,
        microphone: this.state.hasMicrophone
      })
    } catch (error) {
      console.error('Failed to check device capabilities:', error)
      throw error
    }
  }

  private async initializeCamera(): Promise<void> {
    console.log('Camera setup ready')
  }

  private async initializeServices(): Promise<void> {
    // Initialize face detection service
    if (this.config.faceDetection && this.videoElement) {
      this.services.faceDetection = new FaceDetectionService(
        this.videoElement,
        (violation: ViolationEvent) => this.handleViolation(violation)
      )
      await this.services.faceDetection.initialize()
    }
    
    // Initialize browser lockdown service
    if (this.config.browserLockdown) {
      this.services.browserLockdown = new BrowserLockdownService(this.config)
    }
    
    // Initialize activity monitor service
    this.services.activityMonitor = new ActivityMonitorService(
      this.config,
      (violation: ViolationEvent) => this.handleViolation(violation)
    )
    
    // Initialize violation detector
    this.services.violationDetector = new ViolationDetector(
      this.config,
      (violation: ViolationEvent) => this.handleViolation(violation)
    )
    
    console.log('All services initialized')
  }

  private handleViolation(violation: ViolationEvent): void {
    console.warn('Violation detected:', violation)
    
    this.state.violations.push(violation)
    this.updateRiskScore()
    
    // Notify violation handler
    if (this.onViolation) {
      this.onViolation(violation)
    }
    
    this.notifyStateChange()
  }

  private updateRiskScore(): void {
    const now = Date.now()
    const recentViolations = this.state.violations.filter(
      v => now - v.timestamp < 300000 // Last 5 minutes
    )
    
    // Calculate risk score based on violation severity and frequency
    let score = 0
    recentViolations.forEach(violation => {
      switch (violation.severity) {
        case 'low':
          score += 10
          break
        case 'medium':
          score += 25
          break
        case 'high':
          score += 50
          break
      }
    })
    
    // Apply frequency multiplier
    if (recentViolations.length > 5) {
      score *= 1.5
    }
    
    this.state.riskScore = Math.min(100, score)
  }

  private startHeartbeat(): void {
    const heartbeatInterval = setInterval(() => {
      if (!this.state.isActive) {
        clearInterval(heartbeatInterval)
        return
      }
      
      this.state.lastHeartbeat = Date.now()
      this.notifyStateChange()
    }, 5000) // 5 second heartbeat
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state })
    }
  }

  // Public methods for external access
  getState(): ProctoringState {
    return { ...this.state }
  }

  getVideoElement(): HTMLVideoElement | undefined {
    return this.videoElement
  }

  setViolationHandler(handler: (violation: ViolationEvent) => void): void {
    this.onViolation = handler
  }

  setStateChangeHandler(handler: (state: ProctoringState) => void): void {
    this.onStateChange = handler
  }

  // Environment scan for pre-quiz setup
  async performEnvironmentScan(): Promise<{
    success: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []
    
    try {
      // Check lighting conditions
      if (this.services.faceDetection) {
        const lightingCheck = await this.services.faceDetection.checkLighting()
        if (!lightingCheck.adequate) {
          issues.push('Poor lighting conditions detected')
          recommendations.push('Ensure adequate lighting on your face')
        }
      }
      
      // Check for multiple faces
      if (this.services.faceDetection) {
        const faceCount = await this.services.faceDetection.detectFaces()
        if (faceCount > 1) {
          issues.push('Multiple people detected in camera view')
          recommendations.push('Ensure you are alone in the camera view')
        } else if (faceCount === 0) {
          issues.push('No face detected in camera view')
          recommendations.push('Position yourself clearly in front of the camera')
        }
      }
      
      // Check browser compatibility
      const browserCheck = this.services.browserLockdown?.checkCompatibility()
      if (browserCheck && !browserCheck.compatible) {
        issues.push('Browser not fully compatible with proctoring features')
        recommendations.push('Use Chrome or Firefox for best experience')
      }
      
      return {
        success: issues.length === 0,
        issues,
        recommendations
      }
    } catch (error) {
      console.error('Environment scan failed:', error)
      return {
        success: false,
        issues: ['Environment scan failed'],
        recommendations: ['Please refresh and try again']
      }
    }
  }

  // Get summary for review
  getSummary() {
    const totalViolations = this.state.violations.length
    const violationsByType = this.state.violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const severityBreakdown = this.state.violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalViolations,
      violationsByType,
      severityBreakdown,
      finalRiskScore: this.state.riskScore,
      sessionDuration: this.state.isActive ? Date.now() - this.state.lastHeartbeat : 0
    }
  }
}