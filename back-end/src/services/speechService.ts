import OpenAI, { toFile } from 'openai'
import { env } from '../config/env'

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null

export const speechService = {
  isEnabled() {
    return Boolean(openai)
  },

  async transcribeAudio(file: Express.Multer.File) {
    if (!openai) {
      throw new Error(
        'Voice mode requires OPENAI_API_KEY on the backend so audio can be transcribed.',
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
