export interface ProctoringConfig {
  faceDetection: boolean
  screenRecording: boolean
  browserLockdown: boolean
  preventCopyPaste: boolean
  preventRightClick: boolean
  preventTabSwitch: boolean
  allowedTabSwitches: number
  webcamRequired: boolean
  microphoneMonitoring: boolean
  environmentScan: boolean
  idVerification: boolean
  suspiciousActivityThreshold: number
}

export interface ViolationEvent {
  type: 'face_not_detected' | 'multiple_faces' | 'tab_switch' | 'window_blur' | 'copy_paste' | 'right_click' | 'suspicious_movement' | 'audio_detected' | 'screen_share_stopped'
  timestamp: number
  severity: 'low' | 'medium' | 'high'
  description: string
  data?: any
}

export interface ProctoringState {
  isActive: boolean
  isInitialized: boolean
  hasWebcam: boolean
  hasMicrophone: boolean
  violations: ViolationEvent[]
  riskScore: number
  lastHeartbeat: number
}