import express from 'express'
const StreakRouter = express.Router()
import { UserGuard } from '../middleware/guard.middleware'
import { getStreak, getWeekly } from './streak.controller'

StreakRouter.get('/', UserGuard, getStreak)
StreakRouter.get('/weekly', UserGuard, getWeekly)

export default StreakRouter
