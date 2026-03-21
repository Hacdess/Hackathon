import { Buffer } from 'buffer'
import { env } from '../config/env'
import type { AgoraAgentLaunch } from '../types/domain'
import { agoraService } from './agoraService'

type StartAgentSessionInput = {
  channel: string
}

function buildJoinUrl() {
  if (!env.agoraAppId) {
    throw new Error('AGORA_APP_ID is required to call the Agora Conversational AI REST API.')
  }

  return `https://api.agora.io/api/conversational-ai-agent/v2/projects/${env.agoraAppId}/join`
}

function buildBasicAuthorization() {
  if (!env.agoraCustomerId || !env.agoraCustomerSecret) {
    throw new Error(
      'AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET are required for Agora REST authentication.',
    )
  }

  return `Basic ${Buffer.from(`${env.agoraCustomerId}:${env.agoraCustomerSecret}`).toString(
    'base64',
  )}`
}

export const agoraHandler = {
  async startAgentSession(input: StartAgentSessionInput): Promise<AgoraAgentLaunch> {
    if (!env.agoraAgentRtcUid) {
      return {
        agentName: env.agoraAgentName,
        mode: 'external',
        status: 'failed',
        message: 'AGORA_AGENT_RTC_UID is required for the Agora agent join request.',
      }
    }

    const rtcUid = Number(env.agoraAgentRtcUid)

    if (!Number.isFinite(rtcUid)) {
      return {
        agentName: env.agoraAgentName,
        mode: 'external',
        status: 'failed',
        message: 'AGORA_AGENT_RTC_UID must be a valid number.',
      }
    }

    const agentRtcCredentials = agoraService.createRtcTokenForUid(input.channel, rtcUid)
    const requestBody = {
      name: env.agoraAgentName,
      ...(env.agoraAgentPipelineId ? { pipeline_id: env.agoraAgentPipelineId } : {}),
      properties: {
        asr: {
          vendor: env.agoraAgentAsrVendor,
          params: {
            url: env.agoraAgentAsrUrl,
            model: env.agoraAgentAsrModel,
            keyterm: '',
            language: env.agoraAgentAsrLanguage,
          },
        },
        llm: {
          url: env.agoraAgentLlmUrl,
          vendor: env.agoraAgentLlmVendor,
          failure_message: env.agoraAgentLlmFailureMessage,
          system_messages: [
            {
              role: 'system',
              content: env.agoraAgentLlmSystemMessage,
            },
          ],
          greeting_message: env.agoraAgentLlmGreetingMessage,
          params: {
            model: env.agoraAgentLlmModel,
          },
        },
        tts: {
          vendor: env.agoraAgentTtsVendor,
          params: {
            url: env.agoraAgentTtsUrl,
            model: env.agoraAgentTtsModel,
            voice_setting: {
              voice_id: env.agoraAgentTtsVoiceId,
            },
          },
        },
        parameters: {
          silence_config: {
            action: 'think',
            content: 'politely ask if the user is still online',
            timeout_ms: 10000,
          },
        },
        turn_detection: null,
        advanced_features: {
          enable_rtm: true,
          enable_sal: false,
          enable_aivad: false,
        },
        channel: input.channel,
        token: agentRtcCredentials.token,
        agent_rtc_uid: env.agoraAgentRtcUid,
        remote_rtc_uids: ['*'],
        enable_string_uid: false,
        idle_timeout: 120,
      },
    }

    const url = buildJoinUrl()
    const authorization = buildBasicAuthorization()

    console.log('Agora agent join request:', {
      url,
      authorizationType: 'Basic',
      body: {
        ...requestBody,
        properties: {
          ...requestBody.properties,
          token: '[redacted]',
        },
      },
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string
          agent_id?: string
          status?: string
          reason?: string
          detail?: string
        }
      | null

    console.log('Agora agent join response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: payload,
    })

    if (!response.ok) {
      if (response.status === 409 && payload?.reason === 'TaskConflict' && payload?.agent_id) {
        return {
          agentName: env.agoraAgentName,
          mode: 'external',
          status: 'running',
          message: 'Agora agent is already running for this channel. Reusing the existing agent.',
          sessionId: payload.agent_id,
        }
      }

      return {
        agentName: env.agoraAgentName,
        mode: 'external',
        status: 'failed',
        message: payload?.message || 'Unable to start Agora agent session.',
        sessionId: payload?.agent_id,
      }
    }

    return {
      agentName: env.agoraAgentName,
      mode: 'external',
      status: payload?.status === 'RUNNING' ? 'running' : 'starting',
      message: payload?.message,
      sessionId: payload?.agent_id,
    }
  },

  async stopAgentSession(agentId: string): Promise<void> {
    if (!agentId) {
      return
    }

    const url = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${env.agoraAppId}/agents/${agentId}/leave`
    const authorization = buildBasicAuthorization()

    console.log('Agora agent leave request:', {
      url,
      authorizationType: 'Basic',
      agentId,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
    })

    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string
          reason?: string
          detail?: string
        }
      | null

    console.log('Agora agent leave response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: payload,
    })

    if (!response.ok) {
      throw new Error(payload?.message || 'Unable to stop Agora agent session.')
    }
  },
}
