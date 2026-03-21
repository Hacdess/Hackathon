import { RtcRole, RtcTokenBuilder } from 'agora-access-token'
import { env } from '../config/env'

function normalizeChannelName(channelName: string) {
  const channel = channelName.trim()

  if (!channel) {
    throw new Error('Agora channel is required.')
  }

  if (channel.length > 64) {
    throw new Error('Agora channel must be 64 characters or fewer.')
  }

  return channel
}

export const agoraService = {
  createRtcToken(channelName: string, account: string) {
    if (!env.agoraAppId || !env.agoraAppCertificate) {
      throw new Error(
        'Agora token service is not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE on the backend.',
      )
    }

    const channel = normalizeChannelName(channelName)
    const issuedAt = Math.floor(Date.now() / 1000)
    const expiresAt = issuedAt + env.agoraTokenExpirationInSeconds
    const token = RtcTokenBuilder.buildTokenWithAccount(
      env.agoraAppId,
      env.agoraAppCertificate,
      channel,
      account,
      RtcRole.PUBLISHER,
      expiresAt,
    )

    return {
      appId: env.agoraAppId,
      channel,
      account,
      token,
      expiresAt,
      expiresInSeconds: env.agoraTokenExpirationInSeconds,
    }
  },
}
