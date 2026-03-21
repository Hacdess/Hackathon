import { agoraAssistantSessionRepository } from '../repositories/agoraAssistantSessionRepository'
import { env } from '../config/env'
import type { AssistantMessage, AssistantResponse } from '../types/domain'
import { agoraHandler } from './agoraHandler'
import { agoraService } from './agoraService'
import { assistantService } from './assistantService'

export const agoraAssistantSessionService = {
  async startSession(input: {
    channel: string
    userId: string
    currentPath?: string
  }) {
    const agoraCredentials = agoraService.createRtcToken(input.channel, input.userId)

    const session = agoraAssistantSessionRepository.create({
      userId: input.userId,
      channel: agoraCredentials.channel,
      account: agoraCredentials.account,
      currentPath: input.currentPath,
      initialMessage: {
        role: 'assistant',
        content:
          'Agora session is ready. Once the voice agent joins the channel, it can guide the user, answer stock or tax questions, and confirm product fields before the form is filled.',
      },
      agentLaunch: {
        agentName: env.agoraAgentName,
        mode: 'manual',
        status: 'not_configured',
      },
    })

    const agentLaunch = await agoraHandler.startAgentSession({
      channel: session.channel,
    })

    const updatedSession = agoraAssistantSessionRepository.updateSession(session, {
      agentLaunch,
    })

    return {
      sessionId: updatedSession.id,
      appId: agoraCredentials.appId,
      channel: agoraCredentials.channel,
      account: agoraCredentials.account,
      token: agoraCredentials.token,
      expiresAt: agoraCredentials.expiresAt,
      expiresInSeconds: agoraCredentials.expiresInSeconds,
      agentLaunch: updatedSession.agentLaunch,
      messages: updatedSession.messages,
      productDraft: updatedSession.productDraft,
    }
  },

  getSession(sessionId: string, userId: string) {
    const session = agoraAssistantSessionRepository.findById(sessionId)

    if (!session) {
      throw new Error('Agora assistant session not found.')
    }

    if (session.userId !== userId) {
      throw new Error('Agora assistant session not found.')
    }

    return session
  },

  async stopSession(sessionId: string, userId: string) {
    const session = this.getSession(sessionId, userId)

    if (session.agentLaunch.mode === 'external' && session.agentLaunch.sessionId) {
      await agoraHandler.stopAgentSession(session.agentLaunch.sessionId)
    }

    return agoraAssistantSessionRepository.updateSession(session, {
      agentLaunch: {
        ...session.agentLaunch,
        status: 'stopped',
        message: 'Agora agent session stopped.',
      },
    })
  },

  async processAgentTurn(input: {
    sessionId: string
    transcript: string
    currentPath?: string
  }): Promise<AssistantResponse> {
    const session = agoraAssistantSessionRepository.findById(input.sessionId)

    if (!session) {
      throw new Error('Agora assistant session not found.')
    }

    const result = await assistantService.respond({
      message: input.transcript,
      currentPath: input.currentPath ?? session.currentPath,
      conversation: session.messages,
    })

    const nextMessages: AssistantMessage[] = [
      ...session.messages,
      { role: 'user', content: input.transcript },
      { role: 'assistant', content: result.reply },
    ]

    agoraAssistantSessionRepository.updateSession(session, {
      messages: nextMessages,
      productDraft: result.productDraft,
      currentPath: input.currentPath ?? session.currentPath,
    })

    return result
  },
}
