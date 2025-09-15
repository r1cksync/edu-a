'use client'

import { useEffect, useRef } from 'react'

interface JitsiMeetProps {
  meetingId: string
  meetingUrl: string
  displayName?: string
  isTeacher?: boolean
  onMeetingEnded?: () => void
  onParticipantLeft?: (participantId: string) => void
  onParticipantJoined?: (participantId: string) => void
}

export default function JitsiMeet({
  meetingId,
  meetingUrl,
  displayName = 'Student',
  isTeacher = false,
  onMeetingEnded,
  onParticipantLeft,
  onParticipantJoined
}: JitsiMeetProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)

  useEffect(() => {
    // Load Jitsi Meet API script if not already loaded
    const loadJitsiAPI = () => {
      return new Promise((resolve) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI)
          return
        }

        const script = document.createElement('script')
        script.src = 'https://meet.jit.si/external_api.js'
        script.async = true
        script.onload = () => resolve(window.JitsiMeetExternalAPI)
        document.head.appendChild(script)
      })
    }

    const initJitsi = async () => {
      if (!jitsiContainerRef.current) return

      try {
        const JitsiMeetExternalAPI = await loadJitsiAPI()

        // Extract domain and room name from meeting URL
        const url = new URL(meetingUrl)
        const domain = url.hostname
        const roomName = url.pathname.substring(1) // Remove leading slash

        const options = {
          roomName: roomName,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            startWithAudioMuted: !isTeacher,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: true,
            toolbarButtons: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 
              'fullscreen', 'fodeviceselection', 'hangup', 'profile',
              'info', 'chat', 'settings', 'raisehand', 
              'videoquality', 'filmstrip', 'shortcuts',
              'tileview', 'select-background', 'download'
            ],
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_ALWAYS_VISIBLE: false,
            DEFAULT_BACKGROUND: '#474747',
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            DISABLE_PRESENCE_STATUS: false,
          },
          userInfo: {
            displayName: displayName,
            email: '', // Could be passed from user data
          }
        }

        // Create Jitsi Meet instance
        const api = new (JitsiMeetExternalAPI as any)(domain, options)
        apiRef.current = api

        // Set up event listeners
        api.addEventListener('videoConferenceJoined', (event: any) => {
          console.log('Joined video conference:', event)
          if (onParticipantJoined) {
            onParticipantJoined(event.participantId || event.id)
          }
        })

        api.addEventListener('videoConferenceLeft', () => {
          console.log('Left video conference')
          if (onMeetingEnded) {
            onMeetingEnded()
          }
        })

        api.addEventListener('participantJoined', (event: any) => {
          console.log('Participant joined:', event)
          if (onParticipantJoined) {
            onParticipantJoined(event.participantId || event.id)
          }
        })

        api.addEventListener('participantLeft', (event: any) => {
          console.log('Participant left:', event)
          if (onParticipantLeft) {
            onParticipantLeft(event.participantId || event.id)
          }
        })

        api.addEventListener('readyToClose', () => {
          console.log('Ready to close')
          if (onMeetingEnded) {
            onMeetingEnded()
          }
        })

        // Teacher-specific permissions
        if (isTeacher) {
          api.addEventListener('videoConferenceJoined', () => {
            // Teachers can mute all participants
            // api.executeCommand('toggleAudio') // Example command
          })
        }

      } catch (error) {
        console.error('Failed to initialize Jitsi Meet:', error)
      }
    }

    initJitsi()

    // Cleanup function
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [meetingId, meetingUrl, displayName, isTeacher, onMeetingEnded, onParticipantJoined, onParticipantLeft])

  return (
    <div className="w-full h-full relative">
      <div 
        ref={jitsiContainerRef} 
        className="w-full h-full min-h-[600px] bg-gray-900 rounded-lg overflow-hidden"
      />
      
      {/* Loading overlay - shown while Jitsi is initializing */}
      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center" id="jitsi-loading">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining video call...</p>
          <p className="text-sm text-gray-400 mt-2">Meeting ID: {meetingId}</p>
        </div>
      </div>

      <style jsx>{`
        #jitsi-loading {
          z-index: 10;
        }
        
        /* Hide loading overlay once Jitsi loads */
        :global(.jitsi-meet-container) ~ #jitsi-loading {
          display: none;
        }
      `}</style>
    </div>
  )
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}