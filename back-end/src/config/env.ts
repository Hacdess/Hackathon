import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'auth_token',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000',
  agoraAppId: process.env.AGORA_APP_ID || '',
  agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  agoraTokenExpirationInSeconds: Number(process.env.AGORA_TOKEN_EXPIRATION_IN_SECONDS || 3600),
  agoraAgentStartUrl: process.env.AGORA_AGENT_START_URL || '',
  agoraAgentApiKey: process.env.AGORA_AGENT_API_KEY || '',
  agoraAgentName: process.env.AGORA_AGENT_NAME || 'logikho-agora-agent',
  agoraAgentPipelineId: process.env.AGORA_AGENT_PIPELINE_ID || '',
  agoraAgentRtcUid: process.env.AGORA_AGENT_RTC_UID || '',
  agoraAgentWebhookSecret: process.env.AGORA_AGENT_WEBHOOK_SECRET || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiTranscriptionModel:
    process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
}

export const isProduction = env.nodeEnv === 'production'
