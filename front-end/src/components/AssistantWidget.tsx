import { Icon } from '@iconify/react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAssistant } from '../context/AssistantContext'
import { API_BASE_URL } from '../lib/api'
import type { AssistantResponse } from '../lib/api'

async function safeSpeak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1
  window.speechSynthesis.speak(utterance)
}

export function AssistantWidget() {
  const location = useLocation()
  const { messages, setMessages, setProductDraft } = useAssistant()
  const [isOpen, setIsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceStatus, setVoiceStatus] = useState('Ready')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const pushAssistantResponse = (response: AssistantResponse, userText?: string) => {
    setMessages((current) => [
      ...current,
      ...(userText ? [{ role: 'user' as const, content: userText }] : []),
      { role: 'assistant', content: response.reply },
    ])

    if (response.productDraft) {
      setProductDraft(response.productDraft)
    }

    void safeSpeak(response.reply)
  }

  const startVoiceCapture = async () => {
    setError(null)
    setIsOpen(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      streamRef.current = stream
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        setIsProcessing(true)
        setVoiceStatus('Processing speech')

        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', blob, 'assistant.webm')
          formData.append(
            'payload',
            JSON.stringify({
              currentPath: location.pathname,
              conversation: messages,
            }),
          )

          const response = await fetch(`${API_BASE_URL}/api/assistant/voice`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })

          const payload = (await response.json()) as AssistantResponse & { message?: string }

          if (!response.ok) {
            throw new Error(payload.message || 'Unable to process voice input.')
          }

          pushAssistantResponse(payload, payload.transcript)
          setVoiceStatus('Ready')
        } catch (voiceError) {
          setError(voiceError instanceof Error ? voiceError.message : 'Unable to process voice input.')
          setVoiceStatus('Ready')
        } finally {
          setIsProcessing(false)
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setVoiceStatus('Listening')
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Unable to start voice capture.')
      setVoiceStatus('Ready')
    }
  }

  const stopVoiceCapture = async () => {
    if (!mediaRecorderRef.current) {
      return
    }

    mediaRecorderRef.current.stop()
    mediaRecorderRef.current = null
    setIsRecording(false)
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
      {isOpen ? (
        <div className="flex h-[34rem] w-[24rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h4 className="font-heading text-lg font-black text-[#0f1724]">
                OpenAI Assistant
              </h4>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {voiceStatus}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Speak naturally. The assistant can guide you around the website, answer stock or
                tax workflow questions, and fill the add-product form from your voice.
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
          </div>

          <div className="border-t border-slate-200 p-4">
            <p className="mb-3 text-sm text-slate-500">
              The assistant uses OpenAI speech-to-text and LLM processing directly through your backend.
            </p>

            <button
              onClick={() => void (isRecording ? stopVoiceCapture() : startVoiceCapture())}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold ${
                isRecording ? 'bg-red-500 text-white' : 'bg-primary text-white'
              } transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70`}
              title={isRecording ? 'Stop voice capture' : 'Start voice capture'}
              disabled={isProcessing}
            >
              <Icon
                icon={isRecording ? 'solar:danger-circle-bold' : 'solar:microphone-3-bold'}
                className="text-xl"
              />
              {isProcessing
                ? 'Processing...'
                : isRecording
                  ? 'Stop Recording'
                  : 'Start Talking'}
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
