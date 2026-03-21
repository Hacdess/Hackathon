import { env } from '../config/env'

export const elevenLabsVoiceService = {
  isEnabled() {
    return Boolean(env.elevenlabsApiKey && env.elevenlabsVoiceId)
  },

  async synthesize(text: string) {
    if (!this.isEnabled()) {
      throw new Error(
        'ElevenLabs voice output requires ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID on the backend.',
      )
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${env.elevenlabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': env.elevenlabsApiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: env.elevenlabsTtsModel,
          language_code: env.elevenlabsLanguageCode || undefined,
          output_format: env.elevenlabsOutputFormat,
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs speech failed: ${errorText || response.statusText}`)
    }

    return Buffer.from(await response.arrayBuffer())
  },
}
