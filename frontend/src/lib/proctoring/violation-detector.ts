import { ProctoringConfig, ViolationEvent } from './types'

export class ViolationDetector {
  private config: ProctoringConfig
  private onViolation: (violation: ViolationEvent) => void
  private isRunning = false
  
  // Audio monitoring
  private audioContext?: AudioContext
  private audioStream?: MediaStream
  private audioAnalyser?: AnalyserNode
  private audioMonitorInterval?: number
  
  // Performance monitoring
  private performanceMonitorInterval?: number
  private lastFrameTime = performance.now()
  private frameDropCount = 0
  
  constructor(config: ProctoringConfig, onViolation: (violation: ViolationEvent) => void) {
    this.config = config
    this.onViolation = onViolation
  }

  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('Starting violation detector...')
    
    // Start audio monitoring if enabled
    if (this.config.microphoneMonitoring) {
      this.startAudioMonitoring()
    }
    
    // Start performance monitoring
    this.startPerformanceMonitoring()
    
    // Monitor device changes
    this.monitorDeviceChanges()
    
    // Monitor network changes
    this.monitorNetworkChanges()
  }

  stop(): void {
    if (!this.isRunning) return
    
    this.isRunning = false
    console.log('Stopping violation detector...')
    
    // Stop audio monitoring
    this.stopAudioMonitoring()
    
    // Stop performance monitoring
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval)
      this.performanceMonitorInterval = undefined
    }
  }

  private async startAudioMonitoring(): Promise<void> {
    try {
      // Get microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      
      // Set up audio analysis
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = this.audioContext.createMediaStreamSource(this.audioStream)
      this.audioAnalyser = this.audioContext.createAnalyser()
      
      this.audioAnalyser.fftSize = 256
      const bufferLength = this.audioAnalyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      source.connect(this.audioAnalyser)
      
      // Monitor audio levels
      this.audioMonitorInterval = window.setInterval(() => {
        if (!this.audioAnalyser) return
        
        this.audioAnalyser.getByteFrequencyData(dataArray)
        
        // Calculate average volume
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const average = sum / bufferLength
        
        // Detect suspicious audio activity
        this.analyzeAudioLevel(average, dataArray)
        
      }, 1000) // Check every second
      
      console.log('Audio monitoring started')
      
    } catch (error) {
      console.warn('Could not start audio monitoring:', error)
      // Continue without audio monitoring
    }
  }

  private stopAudioMonitoring(): void {
    if (this.audioMonitorInterval) {
      clearInterval(this.audioMonitorInterval)
      this.audioMonitorInterval = undefined
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop())
      this.audioStream = undefined
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = undefined
    }
    
    console.log('Audio monitoring stopped')
  }

  private analyzeAudioLevel(average: number, frequencyData: Uint8Array): void {
    const now = Date.now()
    
    // Detect sudden loud noises (might indicate cheating assistance)
    if (average > 50) { // Threshold for "loud" audio
      // Analyze frequency distribution to distinguish speech from noise
      const speechFrequencies = frequencyData.slice(5, 25) // Typical speech range
      const speechLevel = speechFrequencies.reduce((sum, val) => sum + val, 0) / speechFrequencies.length
      
      if (speechLevel > 30) {
        this.onViolation({
          type: 'audio_detected',
          timestamp: now,
          severity: 'medium',
          description: 'Suspicious audio activity detected - possible communication',
          data: { 
            averageLevel: average,
            speechLevel: speechLevel,
            maxFrequency: Math.max.apply(Math, Array.from(frequencyData))
          }
        })
      }
    }
    
    // Detect multiple voices or conversation patterns
    const highFreqEnergy = frequencyData.slice(25, 60).reduce((sum, val) => sum + val, 0)
    const lowFreqEnergy = frequencyData.slice(5, 25).reduce((sum, val) => sum + val, 0)
    
    if (highFreqEnergy > 0 && lowFreqEnergy > 0 && average > 20) {
      const ratio = highFreqEnergy / lowFreqEnergy
      
      // Complex audio patterns might indicate multiple people talking
      if (ratio > 1.5 || ratio < 0.3) {
        this.onViolation({
          type: 'audio_detected',
          timestamp: now,
          severity: 'low',
          description: 'Complex audio pattern detected',
          data: { 
            ratio,
            highFreq: highFreqEnergy,
            lowFreq: lowFreqEnergy
          }
        })
      }
    }
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitorInterval = window.setInterval(() => {
      this.checkPerformanceMetrics()
    }, 5000) // Check every 5 seconds
  }

  private checkPerformanceMetrics(): void {
    const now = performance.now()
    const deltaTime = now - this.lastFrameTime
    this.lastFrameTime = now
    
    // Check for frame drops (might indicate screen recording software)
    if (deltaTime > 100) { // More than 100ms between checks indicates lag
      this.frameDropCount++
      
      if (this.frameDropCount > 3) {
        this.onViolation({
          type: 'suspicious_movement',
          timestamp: Date.now(),
          severity: 'low',
          description: 'Performance degradation detected - possible screen recording',
          data: { 
            frameDrops: this.frameDropCount,
            deltaTime: deltaTime
          }
        })
        
        this.frameDropCount = 0 // Reset to avoid spam
      }
    } else {
      this.frameDropCount = Math.max(0, this.frameDropCount - 1)
    }
    
    // Check memory usage (might indicate other applications running)
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      const memUsage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize
      
      if (memUsage > 0.8) {
        this.onViolation({
          type: 'suspicious_movement',
          timestamp: Date.now(),
          severity: 'low',
          description: 'High memory usage detected',
          data: { 
            memoryUsage: memUsage,
            usedMemory: memInfo.usedJSHeapSize,
            totalMemory: memInfo.totalJSHeapSize
          }
        })
      }
    }
  }

  private monitorDeviceChanges(): void {
    // Monitor for device connection/disconnection
    navigator.mediaDevices.addEventListener('devicechange', () => {
      this.onViolation({
        type: 'suspicious_movement',
        timestamp: Date.now(),
        severity: 'medium',
        description: 'Media device configuration changed',
        data: { event: 'devicechange' }
      })
    })
  }

  private monitorNetworkChanges(): void {
    // Monitor network status changes
    window.addEventListener('online', () => {
      console.log('Network connection restored')
    })
    
    window.addEventListener('offline', () => {
      this.onViolation({
        type: 'suspicious_movement',
        timestamp: Date.now(),
        severity: 'high',
        description: 'Network connection lost',
        data: { event: 'offline' }
      })
    })
    
    // Monitor connection type changes (if supported)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      const handleConnectionChange = () => {
        this.onViolation({
          type: 'suspicious_movement',
          timestamp: Date.now(),
          severity: 'low',
          description: 'Network connection type changed',
          data: { 
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          }
        })
      }
      
      connection.addEventListener('change', handleConnectionChange)
    }
  }

  // Advanced violation detection methods
  detectAnomalousPatterns(recentViolations: ViolationEvent[]): ViolationEvent[] {
    const now = Date.now()
    const suspiciousPatterns: ViolationEvent[] = []
    
    // Pattern 1: Rapid succession of violations
    const recentCount = recentViolations.filter(v => now - v.timestamp < 60000).length
    if (recentCount > 10) {
      suspiciousPatterns.push({
        type: 'suspicious_movement',
        timestamp: now,
        severity: 'high',
        description: 'Unusual violation pattern detected - rapid succession',
        data: { violationCount: recentCount, timeWindow: 60000 }
      })
    }
    
    // Pattern 2: Regular intervals (might indicate automation)
    const intervals = []
    for (let i = 1; i < recentViolations.length; i++) {
      intervals.push(recentViolations[i].timestamp - recentViolations[i-1].timestamp)
    }
    
    if (intervals.length > 5) {
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length
      
      // Low variance indicates regular timing (suspicious)
      if (variance < 1000 && avgInterval < 10000) {
        suspiciousPatterns.push({
          type: 'suspicious_movement',
          timestamp: now,
          severity: 'high',
          description: 'Regular violation timing detected - possible automation',
          data: { averageInterval: avgInterval, variance: variance }
        })
      }
    }
    
    // Pattern 3: Specific violation type clustering
    const violationTypes = recentViolations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(violationTypes).forEach(([type, count]) => {
      if (count > 8 && type !== 'face_not_detected') { // Face detection can be flaky
        suspiciousPatterns.push({
          type: 'suspicious_movement',
          timestamp: now,
          severity: 'medium',
          description: `Excessive ${type} violations detected`,
          data: { violationType: type, count: count }
        })
      }
    })
    
    return suspiciousPatterns
  }

  // Analyze timing patterns for authenticity
  analyzeResponseTiming(questionTimings: { questionId: string, timeSpent: number }[]): ViolationEvent[] {
    const violations: ViolationEvent[] = []
    const now = Date.now()
    
    if (questionTimings.length < 3) return violations
    
    // Check for suspiciously consistent timing
    const times = questionTimings.map(q => q.timeSpent)
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length
    
    // Very low variance indicates possible pre-knowledge or automation
    if (variance < 1000 && avgTime < 30000) { // Less than 30 seconds average
      violations.push({
        type: 'suspicious_movement',
        timestamp: now,
        severity: 'medium',
        description: 'Suspiciously consistent response timing',
        data: { averageTime: avgTime, variance: variance, questionCount: times.length }
      })
    }
    
    // Check for extremely fast responses
    const fastResponses = times.filter(time => time < 5000) // Less than 5 seconds
    if (fastResponses.length > times.length * 0.5) {
      violations.push({
        type: 'suspicious_movement',
        timestamp: now,
        severity: 'high',
        description: 'Multiple extremely fast responses detected',
        data: { fastResponseCount: fastResponses.length, totalQuestions: times.length }
      })
    }
    
    return violations
  }

  // Check browser fingerprint for consistency
  checkBrowserFingerprint(): { consistent: boolean, changes: string[] } {
    const changes: string[] = []
    
    // Store initial fingerprint
    const currentFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth
    }
    
    // Compare with stored fingerprint (would be stored in session storage)
    const storedFingerprint = sessionStorage.getItem('proctoringFingerprint')
    
    if (storedFingerprint) {
      const stored = JSON.parse(storedFingerprint)
      
      Object.entries(currentFingerprint).forEach(([key, value]) => {
        if (stored[key] !== value) {
          changes.push(`${key} changed from ${stored[key]} to ${value}`)
        }
      })
    } else {
      // First time - store the fingerprint
      sessionStorage.setItem('proctoringFingerprint', JSON.stringify(currentFingerprint))
    }
    
    return {
      consistent: changes.length === 0,
      changes
    }
  }
}