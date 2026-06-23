import { Response } from 'express'
import Exc from '../util/exc.util'
import { AuthInterface } from '../middleware/guard.middleware'
import { getStreakSummary, getWeeklySummary } from './streak.service'

export const getStreak = Exc(async (req: AuthInterface, res: Response) => {
    const summary = await getStreakSummary(req.user.id)
    res.json(summary)
})

export const getWeekly = Exc(async (req: AuthInterface, res: Response) => {
    const summary = await getWeeklySummary(req.user.id)
    res.json(summary)
})
