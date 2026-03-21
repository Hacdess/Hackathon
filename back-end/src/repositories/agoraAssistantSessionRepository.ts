import { randomUUID } from 'crypto'
import type { AgoraAssistantSession, AgoraAgentLaunch, AssistantMessage, ProductDraft } from '../types/domain'

const sessions = new Map<string, AgoraAssistantSession>()

export const agoraAssistantSessionRepository = {
  create(input: {
    userId: string
    channel: string
    account: string
    currentPath?: string
    initialMessage: AssistantMessage
    agentLaunch: AgoraAgentLaunch
  }) {
    const timestamp = new Date().toISOString()
    const session: AgoraAssistantSession = {
      id: randomUUID(),
      userId: input.userId,
      channel: input.channel,
      account: input.account,
      currentPath: input.currentPath,
      messages: [input.initialMessage],
      productDraft: null,
      agentLaunch: input.agentLaunch,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    sessions.set(session.id, session)
    return session
  },

  findById(id: string) {
    return sessions.get(id) ?? null
  },

  updateSession(
    session: AgoraAssistantSession,
    input: {
      messages?: AssistantMessage[]
      productDraft?: ProductDraft | null
      agentLaunch?: AgoraAgentLaunch
      currentPath?: string
    },
  ) {
    const updatedSession: AgoraAssistantSession = {
      ...session,
      messages: input.messages ?? session.messages,
      productDraft:
        input.productDraft !== undefined ? input.productDraft : session.productDraft,
      agentLaunch: input.agentLaunch ?? session.agentLaunch,
      currentPath: input.currentPath ?? session.currentPath,
      updatedAt: new Date().toISOString(),
    }

    sessions.set(updatedSession.id, updatedSession)
    return updatedSession
  },
}
