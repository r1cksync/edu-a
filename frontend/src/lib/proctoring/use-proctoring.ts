import { useState, useEffect, useCallback, useRef } from 'react'
import { ProctoringManager, ProctoringConfig, ViolationEvent, ProctoringState } from './proctoring-manager'

export interface UseProctoringOptions {
  config: ProctoringConfig
  onViolation?: (violation: ViolationEvent) => void
  onStateChange?: (state: ProctoringState) => void
  autoStart?: boolean
}

export interface UseProctoringReturn {
  // State
  isInitialized: boolean
  isActive: boolean
  isLoading: boolean
  error: string | null
  state: ProctoringState | null
  violations: ViolationEvent[]
  riskScore: number
  
  // Video element for preview
  videoElement: HTMLVideoElement | null
  
  // Actions
  initialize: () => Promise<boolean>
  start: () => Promise<void>
  stop: () => Promise<void>
  allowStop: () => void
  performEnvironmentScan: () => Promise<{
    success: boolean
    issues: string[]
    recommendations: string[]
  }>
  
  // Utils
  reset: () => void
  getSummary: () => any
}

export function useProctoring({
  config,
  onViolation,
  onStateChange,
  autoStart = false
}: UseProctoringOptions): UseProctoringReturn {
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<ProctoringState | null>(null)
  const [violations, setViolations] = useState<ViolationEvent[]>([])
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  
  const proctoringManagerRef = useRef<ProctoringManager | null>(null)
  
  // Initialize proctoring manager
  useEffect(() => {
    const manager = new ProctoringManager(config)
    proctoringManagerRef.current = manager
    
    // Set up violation handler
    manager.setViolationHandler((violation: ViolationEvent) => {
      setViolations(prev => [...prev, violation])
      onViolation?.(violation)
    })
    
    // Set up state change handler
    manager.setStateChangeHandler((newState: ProctoringState) => {
      setState(newState)
      setIsInitialized(newState.isInitialized)
      setIsActive(newState.isActive)
      setViolations(newState.violations)
      onStateChange?.(newState)
    })
    
    // Auto-start if enabled
    if (autoStart) {
      initialize()
    }
    
    return () => {
      // Cleanup on unmount
      if (proctoringManagerRef.current && proctoringManagerRef.current.getState().isActive) {
        proctoringManagerRef.current.allowStop()
        proctoringManagerRef.current.stop()
      }
    }
  }, [config, onViolation, onStateChange, autoStart])
  
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!proctoringManagerRef.current) return false
    
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await proctoringManagerRef.current.initialize()
      
      if (success) {
        const videoEl = proctoringManagerRef.current.getVideoElement()
        setVideoElement(videoEl || null)
        setIsInitialized(true)
      }
      
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize proctoring'
      setError(errorMessage)
      console.error('Proctoring initialization failed:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const start = useCallback(async (): Promise<void> => {
    if (!proctoringManagerRef.current || !isInitialized) {
      throw new Error('Proctoring not initialized')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      await proctoringManagerRef.current.start()
      setIsActive(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start proctoring'
      setError(errorMessage)
      console.error('Failed to start proctoring:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized])
  
  const stop = useCallback(async (): Promise<void> => {
    if (!proctoringManagerRef.current) return
    
    setIsLoading(true)
    
    try {
      await proctoringManagerRef.current.stop()
      setIsActive(false)
    } catch (err) {
      console.error('Failed to stop proctoring:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const allowStop = useCallback(() => {
    if (proctoringManagerRef.current) {
      proctoringManagerRef.current.allowStop()
    }
  }, [])
  
  const performEnvironmentScan = useCallback(async () => {
    if (!proctoringManagerRef.current) {
      return {
        success: false,
        issues: ['Proctoring not initialized'],
        recommendations: ['Initialize proctoring first']
      }
    }
    
    return await proctoringManagerRef.current.performEnvironmentScan()
  }, [])
  
  const reset = useCallback(() => {
    setIsInitialized(false)
    setIsActive(false)
    setIsLoading(false)
    setError(null)
    setState(null)
    setViolations([])
    setVideoElement(null)
    
    if (proctoringManagerRef.current) {
      proctoringManagerRef.current.allowStop()
      proctoringManagerRef.current.stop()
    }
  }, [])
  
  const getSummary = useCallback(() => {
    if (!proctoringManagerRef.current) return null
    return proctoringManagerRef.current.getSummary()
  }, [])
  
  const riskScore = state?.riskScore || 0
  
  return {
    // State
    isInitialized,
    isActive,
    isLoading,
    error,
    state,
    violations,
    riskScore,
    videoElement,
    
    // Actions
    initialize,
    start,
    stop,
    allowStop,
    performEnvironmentScan,
    
    // Utils
    reset,
    getSummary
  }
}

// Hook for environment scan only (pre-quiz setup)
export function useEnvironmentScan(config: ProctoringConfig) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    issues: string[]
    recommendations: string[]
  } | null>(null)
  
  const performScan = useCallback(async () => {
    setIsScanning(true)
    setScanResult(null)
    
    try {
      const manager = new ProctoringManager(config)
      await manager.initialize()
      const result = await manager.performEnvironmentScan()
      setScanResult(result)
      await manager.stop()
      return result
    } catch (error) {
      const result = {
        success: false,
        issues: [error instanceof Error ? error.message : 'Scan failed'],
        recommendations: ['Please check your camera and microphone settings']
      }
      setScanResult(result)
      return result
    } finally {
      setIsScanning(false)
    }
  }, [config])
  
  return {
    isScanning,
    scanResult,
    performScan,
    reset: () => setScanResult(null)
  }
}

// Hook for violation monitoring during quiz
export function useViolationMonitor() {
  const [violations, setViolations] = useState<ViolationEvent[]>([])
  const [riskScore, setRiskScore] = useState(0)
  
  const addViolation = useCallback((violation: ViolationEvent) => {
    setViolations(prev => {
      const updated = [...prev, violation]
      
      // Calculate risk score
      const now = Date.now()
      const recentViolations = updated.filter(v => now - v.timestamp < 300000) // Last 5 minutes
      
      let score = 0
      recentViolations.forEach(v => {
        switch (v.severity) {
          case 'low': score += 10; break
          case 'medium': score += 25; break
          case 'high': score += 50; break
        }
      })
      
      if (recentViolations.length > 5) {
        score *= 1.5
      }
      
      setRiskScore(Math.min(100, score))
      
      return updated
    })
  }, [])
  
  const clearViolations = useCallback(() => {
    setViolations([])
    setRiskScore(0)
  }, [])
  
  const getViolationSummary = useCallback(() => {
    const totalViolations = violations.length
    const violationsByType = violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const severityBreakdown = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalViolations,
      violationsByType,
      severityBreakdown,
      riskScore
    }
  }, [violations, riskScore])
  
  return {
    violations,
    riskScore,
    addViolation,
    clearViolations,
    getViolationSummary
  }
}