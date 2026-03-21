import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'auth_token',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiTranscriptionModel:
    process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '',
  elevenlabsTtsModel: process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2',
  elevenlabsSttModel: process.env.ELEVENLABS_STT_MODEL || 'scribe_v1',
  elevenlabsOutputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128',
  elevenlabsLanguageCode: process.env.ELEVENLABS_LANGUAGE_CODE || 'en',
  agoraAppId: process.env.AGORA_APP_ID || '',
  agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  agoraTokenExpirationInSeconds: Number(process.env.AGORA_TOKEN_EXPIRATION_IN_SECONDS || 3600),
  agoraCustomerId: process.env.AGORA_CUSTOMER_ID || '',
  agoraCustomerSecret: process.env.AGORA_CUSTOMER_SECRET || '',
  agoraAgentName: process.env.AGORA_AGENT_NAME || 'logikho-agora-agent',
  agoraAgentPipelineId: process.env.AGORA_AGENT_PIPELINE_ID || '',
  agoraAgentRtcUid: process.env.AGORA_AGENT_RTC_UID || '',
  agoraAgentAsrVendor: process.env.AGORA_AGENT_ASR_VENDOR || 'deepgram',
  agoraAgentAsrUrl: process.env.AGORA_AGENT_ASR_URL || 'wss://api.deepgram.com/v1/listen',
  agoraAgentAsrModel: process.env.AGORA_AGENT_ASR_MODEL || 'nova-3',
  agoraAgentAsrLanguage: process.env.AGORA_AGENT_ASR_LANGUAGE || 'en',
  agoraAgentLlmUrl:
    process.env.AGORA_AGENT_LLM_URL || 'https://api.openai.com/v1/chat/completions',
  agoraAgentLlmVendor: process.env.AGORA_AGENT_LLM_VENDOR || 'openai',
  agoraAgentLlmModel: process.env.AGORA_AGENT_LLM_MODEL || 'gpt-4.1-mini',
  agoraAgentLlmFailureMessage:
    process.env.AGORA_AGENT_LLM_FAILURE_MESSAGE || 'Please hold on a second.',
  agoraAgentLlmSystemMessage:
    process.env.AGORA_AGENT_LLM_SYSTEM_MESSAGE || 'You are a helpful chatbot',
  agoraAgentLlmGreetingMessage: process.env.AGORA_AGENT_LLM_GREETING_MESSAGE || '',
  agoraAgentTtsVendor: process.env.AGORA_AGENT_TTS_VENDOR || 'minimax',
  agoraAgentTtsUrl:
    process.env.AGORA_AGENT_TTS_URL || 'wss://api-uw.minimax.io/ws/v1/t2a_v2',
  agoraAgentTtsModel: process.env.AGORA_AGENT_TTS_MODEL || 'speech-2.8-turbo',
  agoraAgentTtsVoiceId: process.env.AGORA_AGENT_TTS_VOICE_ID || 'English_radiant_girl',
  agoraAgentWebhookSecret: process.env.AGORA_AGENT_WEBHOOK_SECRET || '',
}

export const isProduction = env.nodeEnv === 'production'

export function validateEnv() {
  const missing: string[] = []

  if (!env.databaseUrl) {
    missing.push('DATABASE_URL')
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
