import type { Request, Response } from 'express'
import type { AssistantMessage } from '../types/domain'
import type { AuthenticatedRequest } from '../middleware/authMiddleware'
import { env } from '../config/env'
import { agoraAssistantSessionService } from '../services/agoraAssistantSessionService'
import { agoraService } from '../services/agoraService'
import { assistantService } from '../services/assistantService'

export const assistantController = {
  async startAgoraSession(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      const channel = typeof req.body?.channel === 'string' ? req.body.channel : ''

      if (!user) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }

      const result = await agoraAssistantSessionService.startSession({
        channel,
        userId: user.id,
        currentPath: typeof req.body?.currentPath === 'string' ? req.body.currentPath : undefined,
      })

      res.json(result)
    } catch (error) {
      console.error('Agora session start error:', error)
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Unable to start Agora session.',
      })
    }
  },

  async getAgoraSession(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }

      const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : ''
      const session = agoraAssistantSessionService.getSession(sessionId, req.user.id)
      res.json(session)
    } catch (error) {
      res.status(404).json({
        message: error instanceof Error ? error.message : 'Unable to load Agora session.',
      })
    }
  },

  async processAgoraAgentTurn(req: Request, res: Response) {
    try {
      if (
        env.agoraAgentWebhookSecret &&
        req.headers['x-agora-agent-secret'] !== env.agoraAgentWebhookSecret
      ) {
        res.status(401).json({ message: 'Invalid agent webhook secret.' })
        return
      }

      const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : ''
      const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript : ''

      if (!transcript.trim()) {
        res.status(400).json({ message: 'Transcript is required.' })
        return
      }

      const result = await agoraAssistantSessionService.processAgentTurn({
        sessionId,
        transcript,
        currentPath: typeof req.body?.currentPath === 'string' ? req.body.currentPath : undefined,
      })

      res.json(result)
    } catch (error) {
      console.error('Agora agent turn error:', error)
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Unable to process Agora agent turn.',
      })
    }
  },

  async agoraToken(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      const channel =
        typeof req.query.channel === 'string' ? req.query.channel : req.body?.channel ?? ''

      if (!user) {
        res.status(401).json({ message: 'Unauthorized' })
        return
      }

      const result = agoraService.createRtcToken(channel, user.id)
      res.json(result)
    } catch (error) {
      console.error('Agora token error:', error)
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Unable to create Agora token.',
      })
    }
  },

  async chat(req: Request, res: Response) {
    try {
      const result = await assistantService.respond({
        message: req.body?.message ?? '',
        currentPath: req.body?.currentPath,
        conversation: (req.body?.conversation ?? []) as AssistantMessage[],
      })

      res.json(result)
    } catch (error) {
      console.error('Assistant chat error:', error)
      res.status(500).json({
        message:
          error instanceof Error ? error.message : 'Unable to generate assistant response.',
      })
    }
  },

  async voice(req: Request, res: Response) {
    try {
      const file = req.file
      const payload = JSON.parse((req.body?.payload as string | undefined) ?? '{}') as {
        currentPath?: string
        conversation?: AssistantMessage[]
      }

      if (!file) {
        res.status(400).json({ message: 'Audio file is required.' })
        return
      }

      const transcript = await assistantService.transcribeAudio(file)
      const result = await assistantService.respond({
        message: transcript,
        currentPath: payload.currentPath,
        conversation: payload.conversation,
      })

      res.json({
        ...result,
        transcript,
      })
    } catch (error) {
      console.error('Assistant voice error:', error)
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Unable to process assistant audio.',
      })
    }
  },
}
