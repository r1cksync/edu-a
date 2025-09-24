
import { ViolationEvent } from './types'

interface FaceDetection {
  box: { x: number; y: number; width: number; height: number }
  landmarks: any
  descriptor: Float32Array
}

interface FaceApiDetections {
  length: number
  forEach: (callback: (detection: FaceDetection) => void) => void
}

declare global {
  interface Window {
    faceapi?: {
      nets: {
        tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void> }
        faceLandmark68Net: { loadFromUri: (uri: string) => Promise<void> }
        faceRecognitionNet: { loadFromUri: (uri: string) => Promise<void> }
      }
      detectAllFaces: (input: HTMLVideoElement, options?: any) => Promise<FaceApiDetections>
      TinyFaceDetectorOptions: new (options?: { inputSize?: number; scoreThreshold?: number }) => any
    }
  }
}

export class FaceDetectionService {
  private videoElement: HTMLVideoElement
  private onViolation: (violation: ViolationEvent) => void
  private isRunning = false
  private detectionInterval?: number
  private isModelLoaded = false
  private lastFaceCount = 0
  private noFaceStartTime?: number
  private multipleFaceStartTime?: number
  
  private readonly NO_FACE_THRESHOLD = 3000
  private readonly MULTIPLE_FACE_THRESHOLD = 2000
  private readonly DETECTION_INTERVAL = 1000
  
  constructor(videoElement: HTMLVideoElement, onViolation: (violation: ViolationEvent) => void) {
    this.videoElement = videoElement
    this.onViolation = onViolation
  }

  async initialize(): Promise<void> {
    try {
      console.log('Loading face detection models...')
      
      if (!window.faceapi) {
        await this.loadFaceApiScript()
      }
      
      const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model'
      await Promise.all([
        window.faceapi!.nets.tinyFaceDetector.loadFromUri(modelUrl),
        window.faceapi!.nets.faceLandmark68Net.loadFromUri(modelUrl),
        window.faceapi!.nets.faceRecognitionNet.loadFromUri(modelUrl)
      ])
      
      this.isModelLoaded = true
      console.log('Face detection models loaded successfully')
    } catch (error) {
      console.warn('Failed to load face detection models, falling back to basic detection:', error)
      this.isModelLoaded = false
      this.onViolation({
        type: 'suspicious_movement',
        timestamp: Date.now(),
        severity: 'medium',
        description: 'Failed to load face detection models',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  private async loadFaceApiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.faceapi) {
        resolve()
        return
      }
      
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/dist/face-api.min.js'
      script.onload = () => resolve()
      script.onerror = () => {
        console.warn('Failed to load face-api.js, continuing without AI detection')
        reject(new Error('Failed to load face-api.js'))
      }
      document.head.appendChild(script)
    })
  }

  async start(): Promise<void> {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('Starting face detection monitoring...')
    
    this.detectionInterval = window.setInterval(() => {
      this.performFaceDetection()
    }, this.DETECTION_INTERVAL)
  }

  stop(): void {
    if (!this.isRunning) return
    
    this.isRunning = false
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
      this.detectionInterval = undefined
    }
    
    console.log('Face detection monitoring stopped')
  }

  private async performFaceDetection(): Promise<void> {
    if (!this.isModelLoaded || !this.videoElement || this.videoElement.readyState !== 4) {
      this.performBasicDetection()
      return
    }
    
    try {
      const detections = await window.faceapi!
        .detectAllFaces(this.videoElement, new window.faceapi!.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5
        }))
      
      const faceCount = detections.length
      this.handleFaceDetectionResult(faceCount)
      
    } catch (error) {
      console.warn('Face detection failed, falling back to basic detection:', error)
      this.performBasicDetection()
    }
  }

  private performBasicDetection(): void {
    if (!this.videoElement || this.videoElement.readyState !== 4) {
      this.handleFaceDetectionResult(0)
      return
    }
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      this.handleFaceDetectionResult(0)
      return
    }
    
    canvas.width = this.videoElement.videoWidth
    canvas.height = this.videoElement.videoHeight
    
    try {
      ctx.drawImage(this.videoElement, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      const hasContent = this.analyzeImageData(imageData)
      this.handleFaceDetectionResult(hasContent ? 1 : 0)
      
    } catch (error) {
      this.handleFaceDetectionResult(0)
    }
  }

  private analyzeImageData(imageData: ImageData): boolean {
    const data = imageData.data
    let totalBrightness = 0
    let variance = 0
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      totalBrightness += brightness
    }
    
    const avgBrightness = totalBrightness / (data.length / 4)
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      variance += Math.pow(brightness - avgBrightness, 2)
    }
    
    variance = variance / (data.length / 4)
    
    return variance > 100 && avgBrightness > 20 && avgBrightness < 235
  }

  private handleFaceDetectionResult(faceCount: number): void {
    const now = Date.now()
    
    if (faceCount === 0) {
      if (!this.noFaceStartTime) {
        this.noFaceStartTime = now
      } else if (now - this.noFaceStartTime > this.NO_FACE_THRESHOLD) {
        this.onViolation({
          type: 'face_not_detected',
          timestamp: now,
          severity: 'high',
          description: 'Student face not visible in camera',
          data: { duration: now - this.noFaceStartTime }
        })
        this.noFaceStartTime = now
      }
      this.multipleFaceStartTime = undefined
    } else if (faceCount > 1) {
      if (!this.multipleFaceStartTime) {
        this.multipleFaceStartTime = now
      } else if (now - this.multipleFaceStartTime > this.MULTIPLE_FACE_THRESHOLD) {
        this.onViolation({
          type: 'multiple_faces',
          timestamp: now,
          severity: 'high',
          description: `Multiple people detected in camera (${faceCount} faces)`,
          data: { faceCount, duration: now - this.multipleFaceStartTime }
        })
        this.multipleFaceStartTime = now
      }
      this.noFaceStartTime = undefined
    } else {
      this.noFaceStartTime = undefined
      this.multipleFaceStartTime = undefined
    }
    
    this.lastFaceCount = faceCount
  }

  async detectFaces(): Promise<number> {
    if (!this.isModelLoaded || !this.videoElement) {
      return this.lastFaceCount
    }
    
    try {
      const detections = await window.faceapi!
        .detectAllFaces(this.videoElement, new window.faceapi!.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5
        }))
      
      return detections.length
    } catch (error) {
      console.warn('Face detection failed in detectFaces:', error)
      return 0
    }
  }

  async checkLighting(): Promise<{ adequate: boolean; brightness: number }> {
    if (!this.videoElement || this.videoElement.readyState !== 4) {
      return { adequate: false, brightness: 0 }
    }
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      return { adequate: false, brightness: 0 }
    }
    
    canvas.width = this.videoElement.videoWidth
    canvas.height = this.videoElement.videoHeight
    
    try {
      ctx.drawImage(this.videoElement, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      let totalBrightness = 0
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3
      }
      
      const avgBrightness = totalBrightness / (data.length / 4)
      const adequate = avgBrightness > 50 && avgBrightness < 200
      
      return { adequate, brightness: avgBrightness }
    } catch (error) {
      console.warn('Lighting check failed:', error)
      return { adequate: false, brightness: 0 }
    }
  }

  getCurrentFaceCount(): number {
    return this.lastFaceCount
  }

  isInitialized(): boolean {
    return this.isModelLoaded
  }
}
