import express from 'express'
const AiRouter = express.Router()
import { UserGuard } from '../middleware/guard.middleware'
import { AiRateLimiter } from './ai.middleware'
import { getHistory, askQuestion, generateSummary, generateMcq, generateFlashcards } from './ai.controller'

AiRouter.get('/history/:pdfId', UserGuard, getHistory)
AiRouter.post('/ask', UserGuard, AiRateLimiter, askQuestion)
AiRouter.post('/summary', UserGuard, AiRateLimiter, generateSummary)
AiRouter.post('/mcq', UserGuard, AiRateLimiter, generateMcq)
AiRouter.post('/flashcards', UserGuard, AiRateLimiter, generateFlashcards)

export default AiRouter
