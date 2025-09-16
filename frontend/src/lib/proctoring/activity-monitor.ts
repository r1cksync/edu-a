import { ProctoringConfig, ViolationEvent } from './types'

export class ActivityMonitorService {
  private config: ProctoringConfig
  private onViolation: (violation: ViolationEvent) => void
  private isRunning = false
  
  // Violation tracking
  private tabSwitchCount = 0
  private lastTabSwitchTime = 0
  private windowBlurTime?: number
  private isWindowFocused = true
  
  // Event listeners
  private eventListeners: { [key: string]: any } = {}
  
  constructor(config: ProctoringConfig, onViolation: (violation: ViolationEvent) => void) {
    this.config = config
    this.onViolation = onViolation
  }

  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('Starting activity monitoring...')
    
    // Monitor page visibility changes (tab switching)
    this.monitorPageVisibility()
    
    // Monitor window focus/blur
    this.monitorWindowFocus()
    
    // Monitor copy/paste attempts
    this.monitorClipboard()
    
    // Monitor right-click attempts
    this.monitorRightClick()
    
    // Monitor suspicious keyboard activity
    this.monitorKeyboardActivity()
    
    // Monitor mouse activity
    this.monitorMouseActivity()
    
    // Monitor screen share/recording
    this.monitorScreenShare()
  }

  stop(): void {
    if (!this.isRunning) return
    
    this.isRunning = false
    console.log('Stopping activity monitoring...')
    
    // Remove all event listeners
    Object.entries(this.eventListeners).forEach(([event, listener]) => {
      if (event.includes('window:')) {
        window.removeEventListener(event.replace('window:', ''), listener)
      } else if (event.includes('document:')) {
        document.removeEventListener(event.replace('document:', ''), listener)
      }
    })
    
    this.eventListeners = {}
  }

  private monitorPageVisibility(): void {
    const handleVisibilityChange = () => {
      const now = Date.now()
      
      if (document.hidden) {
        // Page became hidden (likely tab switch)
        this.windowBlurTime = now
        this.isWindowFocused = false
        
        if (this.config.preventTabSwitch) {
          this.tabSwitchCount++
          this.lastTabSwitchTime = now
          
          // Check if exceeded allowed switches
          if (this.tabSwitchCount > this.config.allowedTabSwitches) {
            this.onViolation({
              type: 'tab_switch',
              timestamp: now,
              severity: 'high',
              description: `Exceeded allowed tab switches (${this.tabSwitchCount}/${this.config.allowedTabSwitches})`,
              data: {
                totalSwitches: this.tabSwitchCount,
                allowedSwitches: this.config.allowedTabSwitches
              }
            })
          } else {
            this.onViolation({
              type: 'tab_switch',
              timestamp: now,
              severity: 'medium',
              description: `Tab switch detected (${this.tabSwitchCount}/${this.config.allowedTabSwitches})`,
              data: {
                totalSwitches: this.tabSwitchCount,
                allowedSwitches: this.config.allowedTabSwitches
              }
            })
          }
        }
      } else {
        // Page became visible again
        if (this.windowBlurTime) {
          const duration = now - this.windowBlurTime
          this.windowBlurTime = undefined
          this.isWindowFocused = true
          
          // Log return from tab switch
          console.log(`Returned to quiz tab after ${duration}ms`)
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    this.eventListeners['document:visibilitychange'] = handleVisibilityChange
  }

  private monitorWindowFocus(): void {
    const handleBlur = () => {
      const now = Date.now()
      this.windowBlurTime = now
      this.isWindowFocused = false
      
      this.onViolation({
        type: 'window_blur',
        timestamp: now,
        severity: 'medium',
        description: 'Window lost focus - possible external application access',
        data: { blurTime: now }
      })
    }
    
    const handleFocus = () => {
      const now = Date.now()
      
      if (this.windowBlurTime) {
        const duration = now - this.windowBlurTime
        this.windowBlurTime = undefined
        this.isWindowFocused = true
        
        // Log duration of focus loss
        console.log(`Window regained focus after ${duration}ms`)
      }
    }
    
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    
    this.eventListeners['window:blur'] = handleBlur
    this.eventListeners['window:focus'] = handleFocus
  }

  private monitorClipboard(): void {
    if (!this.config.preventCopyPaste) return
    
    const handleClipboard = (e: ClipboardEvent) => {
      const now = Date.now()
      
      this.onViolation({
        type: 'copy_paste',
        timestamp: now,
        severity: 'medium',
        description: `Clipboard operation attempted: ${e.type}`,
        data: { operation: e.type }
      })
    }
    
    document.addEventListener('copy', handleClipboard)
    document.addEventListener('paste', handleClipboard)
    document.addEventListener('cut', handleClipboard)
    
    this.eventListeners['document:copy'] = handleClipboard
    this.eventListeners['document:paste'] = handleClipboard
    this.eventListeners['document:cut'] = handleClipboard
  }

  private monitorRightClick(): void {
    if (!this.config.preventRightClick) return
    
    const handleRightClick = (e: MouseEvent) => {
      const now = Date.now()
      
      this.onViolation({
        type: 'right_click',
        timestamp: now,
        severity: 'low',
        description: 'Right-click context menu attempted',
        data: { x: e.clientX, y: e.clientY }
      })
    }
    
    document.addEventListener('contextmenu', handleRightClick)
    this.eventListeners['document:contextmenu'] = handleRightClick
  }

  private monitorKeyboardActivity(): void {
    let suspiciousKeyCount = 0
    let lastSuspiciousKeyTime = 0
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      
      // Detect suspicious key combinations
      const suspiciousKeys = [
        // Developer tools
        { key: 'F12' },
        { key: 'I', ctrl: true, shift: true },
        { key: 'J', ctrl: true, shift: true },
        { key: 'C', ctrl: true, shift: true },
        { key: 'U', ctrl: true },
        
        // Browser shortcuts
        { key: 'R', ctrl: true },
        { key: 'F5' },
        { key: 'T', ctrl: true },
        { key: 'N', ctrl: true },
        { key: 'W', ctrl: true },
        
        // Alt+Tab detection
        { key: 'Tab', alt: true }
      ]
      
      const isSuspicious = suspiciousKeys.some(suspiciousKey => {
        return (
          e.key === suspiciousKey.key &&
          (!suspiciousKey.ctrl || e.ctrlKey) &&
          (!suspiciousKey.shift || e.shiftKey) &&
          (!suspiciousKey.alt || e.altKey)
        )
      })
      
      if (isSuspicious) {
        suspiciousKeyCount++
        lastSuspiciousKeyTime = now
        
        // Rate limiting to avoid spam
        if (now - lastSuspiciousKeyTime > 1000) {
          this.onViolation({
            type: 'suspicious_movement',
            timestamp: now,
            severity: 'medium',
            description: `Suspicious keyboard shortcut detected: ${e.key}`,
            data: { 
              key: e.key,
              ctrl: e.ctrlKey,
              shift: e.shiftKey,
              alt: e.altKey,
              count: suspiciousKeyCount
            }
          })
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown, true)
    this.eventListeners['document:keydown'] = handleKeyDown
  }

  private monitorMouseActivity(): void {
    let rapidClickCount = 0
    let lastClickTime = 0
    let mouseIdleStart: number | undefined
    let lastMouseMove = Date.now()
    
    const handleMouseMove = () => {
      const now = Date.now()
      lastMouseMove = now
      
      if (mouseIdleStart) {
        mouseIdleStart = undefined
      }
    }
    
    const handleClick = (e: MouseEvent) => {
      const now = Date.now()
      
      // Detect rapid clicking (potential automation)
      if (now - lastClickTime < 100) {
        rapidClickCount++
        
        if (rapidClickCount > 5) {
          this.onViolation({
            type: 'suspicious_movement',
            timestamp: now,
            severity: 'low',
            description: 'Rapid clicking detected - possible automation',
            data: { clickCount: rapidClickCount, interval: now - lastClickTime }
          })
          
          rapidClickCount = 0 // Reset to avoid spam
        }
      } else {
        rapidClickCount = 0
      }
      
      lastClickTime = now
    }
    
    // Check for mouse idle (student may have left)
    const checkMouseIdle = () => {
      const now = Date.now()
      const idleTime = now - lastMouseMove
      
      if (idleTime > 300000 && !mouseIdleStart) { // 5 minutes of no mouse movement
        mouseIdleStart = now
        
        this.onViolation({
          type: 'suspicious_movement',
          timestamp: now,
          severity: 'medium',
          description: 'No mouse activity detected for extended period',
          data: { idleTime }
        })
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    
    this.eventListeners['document:mousemove'] = handleMouseMove
    this.eventListeners['document:click'] = handleClick
    
    // Check mouse idle every 30 seconds
    const idleInterval = setInterval(checkMouseIdle, 30000)
    
    // Store interval for cleanup
    this.eventListeners['mouseIdleInterval'] = (() => {
      clearInterval(idleInterval)
    }) as any
  }

  private monitorScreenShare(): void {
    // Monitor for screen sharing/recording using Screen Capture API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return // Screen capture not supported
    }
    
    // We can't directly detect if someone else is recording the screen,
    // but we can detect if the student tries to share their screen
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
    
    navigator.mediaDevices.getDisplayMedia = (...args) => {
      const now = Date.now()
      
      this.onViolation({
        type: 'screen_share_stopped',
        timestamp: now,
        severity: 'high',
        description: 'Screen sharing/recording attempt detected',
        data: { args }
      })
      
      // Still allow the call but log it
      return originalGetDisplayMedia(...args)
    }
  }

  // Public methods for getting activity stats
  getTabSwitchCount(): number {
    return this.tabSwitchCount
  }

  isCurrentlyFocused(): boolean {
    return this.isWindowFocused && !document.hidden
  }

  getLastActivityTime(): number {
    return Math.max(
      this.lastTabSwitchTime,
      this.windowBlurTime || 0,
      Date.now()
    )
  }

  // Reset counters (useful for testing or when quiz restarts)
  resetCounters(): void {
    this.tabSwitchCount = 0
    this.lastTabSwitchTime = 0
    this.windowBlurTime = undefined
    this.isWindowFocused = true
  }
}