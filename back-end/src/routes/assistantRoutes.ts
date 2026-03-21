import { Router } from 'express'
import multer from 'multer'
import { assistantController } from '../controllers/assistantController'
import { requireAuth } from '../middleware/authMiddleware'

const upload = multer({ storage: multer.memoryStorage() })

export const assistantRoutes = Router()

assistantRoutes.post('/agora/session/:sessionId/process', assistantController.processAgoraAgentTurn)
assistantRoutes.use(requireAuth)
assistantRoutes.post('/agora/session/start', assistantController.startAgoraSession)
assistantRoutes.get('/agora/session/:sessionId', assistantController.getAgoraSession)
assistantRoutes.get('/agora-token', assistantController.agoraToken)
assistantRoutes.post('/chat', assistantController.chat)
assistantRoutes.post('/voice', upload.single('audio'), assistantController.voice)
