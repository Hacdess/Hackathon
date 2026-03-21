import { Icon } from '@iconify/react'
import AgoraRTC from 'agora-rtc-sdk-ng'
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAssistant } from '../context/AssistantContext'
import { API_BASE_URL } from '../lib/api'
import type {
  AgoraAssistantSessionResponse,
  AgoraAssistantSessionState,
} from '../lib/api'

const AGORA_CHANNEL = import.meta.env.VITE_AGORA_CHANNEL || 'logikho-ai'
const hasAgoraConfig = Boolean(AGORA_CHANNEL)

export function AssistantWidget() {
  const location = useLocation()
  const { messages, setMessages, setProductDraft } = useAssistant()
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceStatus, setVoiceStatus] = useState('Ready')
  const [agoraWarning, setAgoraWarning] = useState<string | null>(null)
  const [agoraConnected, setAgoraConnected] = useState(false)
  const [remoteAgentConnected, setRemoteAgentConnected] = useState(false)
  const [agentMode, setAgentMode] = useState<string>('Awaiting launch')
  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const trackRef = useRef<IMicrophoneAudioTrack | null>(null)
  const remoteAudioTrackRef = useRef<IRemoteAudioTrack | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const pollingRef = useRef<number | null>(null)
  const lastUpdatedAtRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      remoteAudioTrackRef.current?.stop()
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
      }
    }
  }, [])

  const syncSessionState = (session: AgoraAssistantSessionState | AgoraAssistantSessionResponse) => {
    setMessages(session.messages)
    setProductDraft(session.productDraft)
    setAgentMode(
      `${session.agentLaunch.agentName} · ${session.agentLaunch.mode} · ${session.agentLaunch.status}`,
    )

    if (session.agentLaunch.message) {
      setAgoraWarning(session.agentLaunch.message)
    }

    if ('updatedAt' in session) {
      lastUpdatedAtRef.current = session.updatedAt
    }
  }

  const startAgoraSession = async () => {
    const response = await fetch(`${API_BASE_URL}/api/assistant/agora/session/start`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: AGORA_CHANNEL,
        currentPath: location.pathname,
      }),
    })

    const payload = (await response.json()) as AgoraAssistantSessionResponse & { message?: string }

    if (!response.ok) {
      throw new Error(payload.message || 'Unable to start Agora session.')
    }

    return payload
  }

  const pollSessionState = async (sessionId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/assistant/agora/session/${sessionId}`, {
      credentials: 'include',
    })

    const payload = (await response.json()) as AgoraAssistantSessionState & { message?: string }

    if (!response.ok) {
      throw new Error(payload.message || 'Unable to refresh Agora session.')
    }

    if (lastUpdatedAtRef.current !== payload.updatedAt) {
      syncSessionState(payload)
    }

    if (payload.agentLaunch.status === 'running') {
      setAgoraWarning(null)
    }
  }

  const startPolling = (sessionId: string) => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current)
    }

    pollingRef.current = window.setInterval(() => {
      void pollSessionState(sessionId).catch((pollError) => {
        setError(
          pollError instanceof Error ? pollError.message : 'Unable to refresh Agora session.',
        )
      })
    }, 2500)
  }

  const startAgoraConversation = async () => {
    if (!hasAgoraConfig) {
      throw new Error('Agora is not configured. Please provide a channel name.')
    }

    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    }

    try {
      setIsConnecting(true)
      const agoraSession = await startAgoraSession()
      sessionIdRef.current = agoraSession.sessionId
      syncSessionState(agoraSession)
      const client = clientRef.current
      const handleUserPublished = async (
        remoteUser: IAgoraRTCRemoteUser,
        mediaType: 'audio' | 'video',
      ) => {
        await client.subscribe(remoteUser, mediaType)

        if (mediaType === 'audio' && remoteUser.audioTrack) {
          remoteAudioTrackRef.current?.stop()
          remoteAudioTrackRef.current = remoteUser.audioTrack
          remoteUser.audioTrack.play()
          setRemoteAgentConnected(true)
          setVoiceStatus(`Agora live on ${agoraSession.channel}`)
        }
      }

      const handleRemoteUserGone = (remoteUser: IAgoraRTCRemoteUser) => {
        if (remoteAudioTrackRef.current && remoteUser.audioTrack === remoteAudioTrackRef.current) {
          remoteAudioTrackRef.current.stop()
          remoteAudioTrackRef.current = null
        }

        setRemoteAgentConnected(false)
      }

      client.removeAllListeners()
      client.on('user-published', handleUserPublished)
      client.on('user-unpublished', handleRemoteUserGone)
      client.on('user-left', handleRemoteUserGone)

      await client.join(
        agoraSession.appId,
        agoraSession.channel,
        agoraSession.token,
        agoraSession.account,
      )
      const track = await AgoraRTC.createMicrophoneAudioTrack()
      trackRef.current = track
      await client.publish([track])
      setAgoraConnected(true)
      setAgoraWarning(null)
      setRemoteAgentConnected(false)
      setIsSessionActive(true)
      setVoiceStatus(
        `Joined ${agoraSession.channel}, waiting for ${agoraSession.agentLaunch.agentName} audio`,
      )
      startPolling(agoraSession.sessionId)
    } catch (sessionError) {
      const message =
        sessionError instanceof Error
          ? `Agora session failed: ${sessionError.message}`
          : 'Agora session failed.'
      setAgoraWarning(message)
      await stopAgoraConversation()
      throw new Error(message)
    } finally {
      setIsConnecting(false)
    }
  }

  const stopAgoraConversation = async () => {
    try {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }

      if (trackRef.current) {
        trackRef.current.stop()
        trackRef.current.close()
      }

      if (remoteAudioTrackRef.current) {
        remoteAudioTrackRef.current.stop()
      }

      if (clientRef.current) {
        clientRef.current.removeAllListeners()
        await clientRef.current.leave()
      }
    } finally {
      trackRef.current = null
      remoteAudioTrackRef.current = null
      clientRef.current = null
      sessionIdRef.current = null
      lastUpdatedAtRef.current = null
      setAgoraConnected(false)
      setRemoteAgentConnected(false)
      setIsSessionActive(false)
      setVoiceStatus('Ready')
    }
  }

  const handleStartConversation = async () => {
    setError(null)
    setIsOpen(true)

    try {
      await startAgoraConversation()
      setVoiceStatus('Listening with Agora')
    } catch (captureError) {
      await stopAgoraConversation()
      setError(captureError instanceof Error ? captureError.message : 'Unable to start voice capture.')
    }
  }

  const handleStopConversation = async () => {
    await stopAgoraConversation()
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
      {isOpen ? (
        <div className="flex h-[34rem] w-[24rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h4 className="font-heading text-lg font-black text-[#0f1724]">
                Agora
              </h4>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {voiceStatus}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Agora handles the conversation. The LLM converts voice content into product-form JSON when needed.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    agoraConnected ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {agoraConnected ? 'Agora connected' : 'Agora not connected'}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    remoteAgentConnected ? 'bg-sky-500' : 'bg-slate-300'
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {remoteAgentConnected ? 'Agent audio detected' : 'Waiting for agent audio'}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {agentMode}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <Icon icon="solar:alt-arrow-right-linear" className="rotate-90 text-lg" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  message.role === 'assistant'
                    ? 'bg-white text-slate-700'
                    : 'ml-auto bg-primary text-white'
                }`}
              >
                {message.content}
              </div>
            ))}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {agoraWarning ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {agoraWarning}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 p-4">
            <p className="mb-3 text-sm text-slate-500">
              Agora now owns the voice loop. The backend only processes agent text into replies and
              product-form JSON, while this page listens for remote agent audio.
            </p>

            <p className="mb-3 text-xs font-medium text-slate-400">
              Start the session, join the channel, and let the remote Agora agent do the listening and speaking.
            </p>

            <button
              onClick={() => void (isSessionActive ? handleStopConversation() : handleStartConversation())}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold ${
                isSessionActive ? 'bg-red-500 text-white' : 'bg-primary text-white'
              } transition hover:scale-[1.01]`}
              title={isSessionActive ? 'Stop Agora conversation' : 'Start Agora conversation'}
              disabled={isConnecting}
            >
              <Icon
                icon={isSessionActive ? 'solar:danger-circle-bold' : 'solar:microphone-3-bold'}
                className="text-xl"
              />
              {isConnecting
                ? 'Connecting to Agora...'
                : isSessionActive
                  ? 'Stop Agora conversation'
                  : 'Start Agora conversation'}
            </button>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setIsOpen((current) => !current)}
        className="group flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f1724] text-white shadow-2xl shadow-slate-900/20 transition-all hover:scale-110 active:scale-95"
      >
        <Icon
          icon="solar:magic-stick-3-bold"
          className="text-3xl transition-transform group-hover:rotate-12"
        />
      </button>
    </div>
  )
}
