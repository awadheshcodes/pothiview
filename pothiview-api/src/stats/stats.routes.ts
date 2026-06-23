import express from 'express'
const StatsRouter = express.Router()
import { UserGuard } from '../middleware/guard.middleware'
import { getLibraryStats, getAnalytics, getRecentActivity, logAchievement } from './stats.controller'

StatsRouter.get('/library', UserGuard, getLibraryStats)
StatsRouter.get('/analytics', UserGuard, getAnalytics)
StatsRouter.get('/activity', UserGuard, getRecentActivity)
StatsRouter.post('/activity/achievement', UserGuard, logAchievement)

export default StatsRouter
