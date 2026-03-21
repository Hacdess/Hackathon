import OpenAI, { toFile } from 'openai'
import { env } from '../config/env'

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null
const elevenLabsEnabled = Boolean(env.elevenlabsApiKey)

export const speechService = {
  isEnabled() {
    return elevenLabsEnabled || Boolean(openai)
  },

  async transcribeAudio(file: Express.Multer.File) {
    if (elevenLabsEnabled) {
      const formData = new FormData()
      formData.append('model_id', env.elevenlabsSttModel)
      formData.append('language_code', env.elevenlabsLanguageCode)
      formData.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'audio/webm' }),
        file.originalname || 'voice.webm',
      )

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': env.elevenlabsApiKey,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ElevenLabs transcription failed: ${errorText || response.statusText}`)
      }

      const payload = (await response.json()) as { text?: string }
      if (!payload.text?.trim()) {
        throw new Error('ElevenLabs transcription returned no text.')
      }

      return payload.text
    }

    if (!openai) {
      throw new Error(
        'Voice mode requires ELEVENLABS_API_KEY or OPENAI_API_KEY on the backend so audio can be transcribed.',
      )
    }

    const transcript = await openai.audio.transcriptions.create({
      file: await toFile(file.buffer, file.originalname || 'voice.webm', {
        type: file.mimetype || 'audio/webm',
      }),
      model: env.openaiTranscriptionModel,
    })

    return transcript.text
  },
}
