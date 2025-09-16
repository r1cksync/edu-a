import { ProctoringConfig } from './types'

export class BrowserLockdownService {
  private config: ProctoringConfig
  private isEnabled = false
  private originalHandlers: { [key: string]: any } = {}
  private fullscreenElement?: HTMLElement
  
  constructor(config: ProctoringConfig) {
    this.config = config
  }

  enable(): void {
    if (this.isEnabled) return
    
    console.log('Enabling browser lockdown...')
    
    try {
      // Enter fullscreen mode
      if (this.config.browserLockdown) {
        this.enterFullscreen()
      }
      
      // Prevent copy/paste
      if (this.config.preventCopyPaste) {
        this.preventCopyPaste()
      }
      
      // Prevent right click
      if (this.config.preventRightClick) {
        this.preventRightClick()
      }
      
      // Prevent tab switching
      if (this.config.preventTabSwitch) {
        this.preventTabSwitching()
      }
      
      // Prevent common shortcuts
      this.preventKeyboardShortcuts()
      
      // Prevent text selection
      this.preventTextSelection()
      
      // Monitor page visibility
      this.monitorPageVisibility()
      
      this.isEnabled = true
      console.log('Browser lockdown enabled')
      
    } catch (error) {
      console.error('Failed to enable browser lockdown:', error)
    }
  }

  disable(): void {
    if (!this.isEnabled) return
    
    console.log('Disabling browser lockdown...')
    
    try {
      // Exit fullscreen
      this.exitFullscreen()
      
      // Restore event handlers
      this.restoreEventHandlers()
      
      // Re-enable text selection
      this.enableTextSelection()
      
      this.isEnabled = false
      console.log('Browser lockdown disabled')
      
    } catch (error) {
      console.error('Failed to disable browser lockdown:', error)
    }
  }

  private async enterFullscreen(): Promise<void> {
    try {
      // Create a fullscreen container for the quiz
      const container = document.createElement('div')
      container.id = 'proctoring-fullscreen-container'
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: white;
        z-index: 999999;
        overflow: auto;
      `
      
      // Move the current body content to the container
      const body = document.body
      const children = Array.from(body.children)
      children.forEach(child => {
        if (child.id !== 'proctoring-fullscreen-container') {
          container.appendChild(child)
        }
      })
      
      body.appendChild(container)
      this.fullscreenElement = container
      
      // Request fullscreen API if available
      if (container.requestFullscreen) {
        await container.requestFullscreen()
      } else if ((container as any).webkitRequestFullscreen) {
        await (container as any).webkitRequestFullscreen()
      } else if ((container as any).msRequestFullscreen) {
        await (container as any).msRequestFullscreen()
      }
      
    } catch (error) {
      console.warn('Could not enter fullscreen mode:', error)
      // Continue without fullscreen - not critical
    }
  }

  private async exitFullscreen(): Promise<void> {
    try {
      // Exit fullscreen API
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
      
      // Remove fullscreen container
      const container = document.getElementById('proctoring-fullscreen-container')
      if (container && this.fullscreenElement) {
        const body = document.body
        const children = Array.from(container.children)
        children.forEach(child => body.appendChild(child))
        container.remove()
        this.fullscreenElement = undefined
      }
      
    } catch (error) {
      console.warn('Could not exit fullscreen mode:', error)
    }
  }

  private preventCopyPaste(): void {
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      console.log('Copy/paste attempt blocked')
      return false
    }
    
    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault()
      console.log('Copy/paste attempt blocked')
      return false
    }
    
    document.addEventListener('copy', preventCopy)
    document.addEventListener('paste', preventPaste)
    document.addEventListener('cut', preventCopy)
    
    this.originalHandlers.copy = preventCopy
    this.originalHandlers.paste = preventPaste
    this.originalHandlers.cut = preventCopy
  }

  private preventRightClick(): void {
    const preventContext = (e: MouseEvent) => {
      e.preventDefault()
      console.log('Right-click attempt blocked')
      return false
    }
    
    document.addEventListener('contextmenu', preventContext)
    this.originalHandlers.contextmenu = preventContext
  }

  private preventTabSwitching(): void {
    // Note: We can't actually prevent tab switching, but we can detect it
    // The actual prevention happens through monitoring in activity-monitor.ts
    
    // Prevent Alt+Tab detection
    const preventAltTab = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault()
        console.log('Alt+Tab attempt blocked')
        return false
      }
    }
    
    document.addEventListener('keydown', preventAltTab)
    this.originalHandlers.altTab = preventAltTab
  }

  private preventKeyboardShortcuts(): void {
    const preventShortcuts = (e: KeyboardEvent) => {
      // Prevent common shortcuts
      const blockedShortcuts = [
        // Developer tools
        { key: 'F12' },
        { key: 'I', ctrl: true, shift: true }, // Ctrl+Shift+I
        { key: 'J', ctrl: true, shift: true }, // Ctrl+Shift+J
        { key: 'C', ctrl: true, shift: true }, // Ctrl+Shift+C
        { key: 'U', ctrl: true }, // Ctrl+U (view source)
        
        // Browser shortcuts
        { key: 'R', ctrl: true }, // Ctrl+R (refresh)
        { key: 'F5' }, // F5 (refresh)
        { key: 'T', ctrl: true }, // Ctrl+T (new tab)
        { key: 'N', ctrl: true }, // Ctrl+N (new window)
        { key: 'W', ctrl: true }, // Ctrl+W (close tab)
        
        // Navigation
        { key: 'L', ctrl: true }, // Ctrl+L (address bar)
        { key: 'D', ctrl: true }, // Ctrl+D (bookmark)
        
        // System shortcuts
        { key: 'Tab', alt: true }, // Alt+Tab
        { key: 'Escape' }, // Escape key
      ]
      
      const isBlocked = blockedShortcuts.some(shortcut => {
        return (
          e.key === shortcut.key &&
          (!shortcut.ctrl || e.ctrlKey) &&
          (!shortcut.shift || e.shiftKey) &&
          (!shortcut.alt || e.altKey)
        )
      })
      
      if (isBlocked) {
        e.preventDefault()
        e.stopPropagation()
        console.log(`Blocked shortcut: ${e.key}`)
        return false
      }
    }
    
    document.addEventListener('keydown', preventShortcuts, true)
    this.originalHandlers.shortcuts = preventShortcuts
  }

  private preventTextSelection(): void {
    const style = document.createElement('style')
    style.id = 'proctoring-no-select'
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      
      input, textarea, [contenteditable] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `
    
    document.head.appendChild(style)
    this.originalHandlers.noSelectStyle = style
  }

  private enableTextSelection(): void {
    const style = document.getElementById('proctoring-no-select')
    if (style) {
      style.remove()
    }
  }

  private monitorPageVisibility(): void {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page visibility lost - potential tab switch')
        // This will be handled by the activity monitor
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    this.originalHandlers.visibilitychange = handleVisibilityChange
    
    // Monitor window blur/focus
    const handleBlur = () => {
      console.log('Window lost focus')
      // This will be handled by the activity monitor
    }
    
    const handleFocus = () => {
      console.log('Window gained focus')
    }
    
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    
    this.originalHandlers.blur = handleBlur
    this.originalHandlers.focus = handleFocus
  }

  private restoreEventHandlers(): void {
    // Remove copy/paste prevention
    if (this.originalHandlers.copy) {
      document.removeEventListener('copy', this.originalHandlers.copy)
      document.removeEventListener('paste', this.originalHandlers.paste)
      document.removeEventListener('cut', this.originalHandlers.cut)
    }
    
    // Remove right-click prevention
    if (this.originalHandlers.contextmenu) {
      document.removeEventListener('contextmenu', this.originalHandlers.contextmenu)
    }
    
    // Remove keyboard shortcut prevention
    if (this.originalHandlers.shortcuts) {
      document.removeEventListener('keydown', this.originalHandlers.shortcuts, true)
    }
    
    if (this.originalHandlers.altTab) {
      document.removeEventListener('keydown', this.originalHandlers.altTab)
    }
    
    // Remove visibility monitoring
    if (this.originalHandlers.visibilitychange) {
      document.removeEventListener('visibilitychange', this.originalHandlers.visibilitychange)
    }
    
    if (this.originalHandlers.blur) {
      window.removeEventListener('blur', this.originalHandlers.blur)
    }
    
    if (this.originalHandlers.focus) {
      window.removeEventListener('focus', this.originalHandlers.focus)
    }
    
    this.originalHandlers = {}
  }

  // Check browser compatibility
  checkCompatibility(): { compatible: boolean; issues: string[] } {
    const issues: string[] = []
    
    // Check fullscreen API support
    if (!document.fullscreenEnabled && 
        !(document as any).webkitFullscreenEnabled && 
        !(document as any).msFullscreenEnabled) {
      issues.push('Fullscreen mode not supported')
    }
    
    // Check media devices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      issues.push('Camera access not supported')
    }
    
    // Check clipboard API
    if (!navigator.clipboard) {
      issues.push('Advanced clipboard protection not available')
    }
    
    // Check if in secure context (HTTPS)
    if (!window.isSecureContext) {
      issues.push('Secure context (HTTPS) required for full functionality')
    }
    
    return {
      compatible: issues.length === 0,
      issues
    }
  }

  isLockdownEnabled(): boolean {
    return this.isEnabled
  }

  // Force focus back to the quiz
  forceFocus(): void {
    if (this.fullscreenElement) {
      this.fullscreenElement.focus()
    } else {
      window.focus()
    }
  }
}