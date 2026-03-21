import { env } from '../config/env'
import type { AgoraAgentLaunch } from '../types/domain'

type StartAgentSessionInput = {
  channel: string
  userId: string
  sessionId: string
  currentPath?: string
}

export const agoraAgentService = {
  async startSession(input: StartAgentSessionInput): Promise<AgoraAgentLaunch> {
    if (!env.agoraAgentStartUrl) {
      return {
        agentName: env.agoraAgentName,
        mode: 'manual',
        status: 'not_configured',
        message:
          'No remote Agora agent launcher is configured yet. The website can still join the channel, but you need to start the voice agent separately.',
      }
    }

    if (!env.agoraAgentApiKey) {
      return {
        agentName: env.agoraAgentName,
        mode: 'external',
        status: 'failed',
        message:
          'AGORA_AGENT_API_KEY is required for the Agora Conversational AI join request.',
      }
    }

    if (!env.agoraAgentPipelineId || !env.agoraAgentRtcUid) {
      return {
        agentName: env.agoraAgentName,
        mode: 'external',
        status: 'failed',
        message:
          'AGORA_AGENT_PIPELINE_ID and AGORA_AGENT_RTC_UID are required for the Agora Conversational AI join request.',
      }
    }

    const requestBody = {
      name: env.agoraAgentName,
      pipeline_id: env.agoraAgentPipelineId,
      properties: {
        channel: input.channel,
        agent_rtc_uid: env.agoraAgentRtcUid,
        remote_rtc_uids: ['*'],
        token: env.agoraAgentApiKey,
      },
    }

    console.log('Agora agent join request:', {
      url: env.agoraAgentStartUrl,
      authorizationType: 'agora token',
      body: {
        ...requestBody,
        properties: {
          ...requestBody.properties,
          token: '[redacted]',
        },
      },
    })

    const response = await fetch(env.agoraAgentStartUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `agora token=${env.agoraAgentApiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string
          sessionId?: string
          status?: string
          agentName?: string
        }
      | null

    console.log('Agora agent join response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: payload,
    })

    if (!response.ok) {
      return {
        agentName: payload?.agentName || env.agoraAgentName,
        mode: 'external',
        status: 'failed',
        message: payload?.message || 'Unable to start Agora agent session.',
        sessionId: payload?.sessionId,
      }
    }

    return {
      agentName: payload?.agentName || env.agoraAgentName,
      mode: 'external',
      status: payload?.status === 'running' ? 'running' : 'starting',
      message: payload?.message,
      sessionId: payload?.sessionId,
    }
  },
}
