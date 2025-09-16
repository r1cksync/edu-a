// Core proctoring system
export { ProctoringManager } from './proctoring-manager'
export type { ProctoringConfig, ViolationEvent, ProctoringState } from './proctoring-manager'

// Individual services
export { FaceDetectionService } from './face-detection'
export { BrowserLockdownService } from './browser-lockdown'
export { ActivityMonitorService } from './activity-monitor'
export { ViolationDetector } from './violation-detector'

// React hooks
export { useProctoring, useEnvironmentScan, useViolationMonitor } from './use-proctoring'
export type { UseProctoringOptions, UseProctoringReturn } from './use-proctoring'

// Import the type for use in constants
import type { ProctoringConfig } from './proctoring-manager'

// Default proctoring configurations
export const STRICT_PROCTORING_CONFIG: ProctoringConfig = {
  faceDetection: true,
  screenRecording: false,
  browserLockdown: true,
  preventCopyPaste: true,
  preventRightClick: true,
  preventTabSwitch: true,
  allowedTabSwitches: 0,
  webcamRequired: true,
  microphoneMonitoring: true,
  environmentScan: true,
  idVerification: false,
  suspiciousActivityThreshold: 50
}

export const MODERATE_PROCTORING_CONFIG: ProctoringConfig = {
  faceDetection: true,
  screenRecording: false,
  browserLockdown: true,
  preventCopyPaste: true,
  preventRightClick: true,
  preventTabSwitch: true,
  allowedTabSwitches: 2,
  webcamRequired: true,
  microphoneMonitoring: false,
  environmentScan: true,
  idVerification: false,
  suspiciousActivityThreshold: 70
}

export const LENIENT_PROCTORING_CONFIG: ProctoringConfig = {
  faceDetection: true,
  screenRecording: false,
  browserLockdown: false,
  preventCopyPaste: false,
  preventRightClick: false,
  preventTabSwitch: true,
  allowedTabSwitches: 5,
  webcamRequired: true,
  microphoneMonitoring: false,
  environmentScan: false,
  idVerification: false,
  suspiciousActivityThreshold: 80
}

export const BASIC_PROCTORING_CONFIG: ProctoringConfig = {
  faceDetection: false,
  screenRecording: false,
  browserLockdown: false,
  preventCopyPaste: false,
  preventRightClick: false,
  preventTabSwitch: false,
  allowedTabSwitches: 10,
  webcamRequired: false,
  microphoneMonitoring: false,
  environmentScan: false,
  idVerification: false,
  suspiciousActivityThreshold: 90
}