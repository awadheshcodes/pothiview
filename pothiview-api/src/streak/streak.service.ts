import StreakModel from './streak.model'
import DailyActivityModel from './dailyActivity.model'

// Streak credit requires either of these in a single calendar day.
export const PAGES_THRESHOLD = 5

// UTC calendar date as YYYY-MM-DD. Using UTC (rather than server-local or
// per-user timezone) keeps this simple and consistent across a single
// deployment — the tradeoff is that a reader near a UTC day boundary might
// see their "day" roll over at a slightly unintuitive local time.
const dateStr = (d: Date) => d.toISOString().slice(0, 10)
const todayStr = () => dateStr(new Date())
const yesterdayStr = () => dateStr(new Date(Date.now() - 86_400_000))

// Bumps Streak.current/longest exactly once per calendar day, the first
// time a daily activity doc crosses the credit threshold. The
// `streakCredited: false` filter on the update makes the "claim" atomic —
// if two requests race (e.g. a page-read and an AI call land together),
// only one of them will actually find+flip the doc and proceed to bump
// the streak.
const creditStreakIfEligible = async (userId: string) => {
    const today = todayStr()

    const activity = await DailyActivityModel.findOne({ userId, date: today })
    if (!activity || activity.streakCredited) return
    if (activity.pagesRead < PAGES_THRESHOLD && !activity.aiUsed) return

    // Atomic "claim" — if two requests race, only one succeeds here.
    const claimed = await DailyActivityModel.findOneAndUpdate(
        { userId, date: today, streakCredited: false },
        { streakCredited: true },
        { new: true }
    )
    if (!claimed) return

    const streak = await StreakModel.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, current: 0, longest: 0, lastActiveDate: null } },
        { upsert: true, new: true }
    )

    const yesterday = yesterdayStr()
    const newCurrent = streak.lastActiveDate === yesterday
        ? streak.current + 1
        : streak.lastActiveDate === today
            ? streak.current  // already credited today (shouldn't happen but guard it)
            : 1

    streak.current = newCurrent
    streak.longest = Math.max(streak.longest, newCurrent)
    streak.lastActiveDate = today
    await streak.save()
}

// Called from reader.controller saveProgress with however many pages
// the reader advanced since their last save (0 for heartbeat/back-scroll).
export const recordPagesRead = async (userId: string, pagesAdvanced: number) => {
    if (pagesAdvanced <= 0) return
    const today = todayStr()
    await DailyActivityModel.findOneAndUpdate(
        { userId, date: today },
        { $inc: { pagesRead: pagesAdvanced }, $setOnInsert: { userId, date: today } },
        { upsert: true }
    )
    await creditStreakIfEligible(userId)
}

// Called from ai.controller after any successful Gemini response.
export const recordAiUsage = async (userId: string) => {
    const today = todayStr()
    await DailyActivityModel.findOneAndUpdate(
        { userId, date: today },
        { $set: { aiUsed: true }, $setOnInsert: { userId, date: today } },
        { upsert: true }
    )
    await creditStreakIfEligible(userId)
}

// Last 7 calendar days (oldest first) for the Weekly Summary widget. No
// writes — purely reads what recordPagesRead/recordAiUsage already logged
// in DailyActivity, so there's no separate "weekly stats" table to keep
// in sync.
export const getWeeklySummary = async (userId: string) => {
    const days: string[] = []
    for (let i = 6; i >= 0; i--) days.push(dateStr(new Date(Date.now() - i * 86_400_000)))

    const activity = await DailyActivityModel.find({ userId, date: { $in: days } }).lean()
    const byDate = new Map(activity.map((a) => [a.date, a]))

    const daily = days.map((date) => {
        const a = byDate.get(date)
        return {
            date,
            pagesRead: a?.pagesRead || 0,
            aiUsed: a?.aiUsed || false,
            credited: a?.streakCredited || false,
        }
    })

    return {
        days: daily,
        totalPagesRead: daily.reduce((sum, d) => sum + d.pagesRead, 0),
        activeDays: daily.filter((d) => d.pagesRead > 0 || d.aiUsed).length,
        creditedDays: daily.filter((d) => d.credited).length,
    }
}

// Fully read-only summary for the dashboard — no writes. If the last
// credited day is older than yesterday the streak has lapsed naturally,
// and we reflect that as current: 0 without a background expiry job.
export const getStreakSummary = async (userId: string) => {
    const today = todayStr()
    const yesterday = yesterdayStr()

    const [streak, activity] = await Promise.all([
        StreakModel.findOne({ userId }).lean(),
        DailyActivityModel.findOne({ userId, date: today }).lean(),
    ])

    const lapsed = !streak?.lastActiveDate
        || (streak.lastActiveDate !== today && streak.lastActiveDate !== yesterday)

    return {
        current: lapsed ? 0 : (streak?.current || 0),
        longest: streak?.longest || 0,
        today: {
            pagesRead: activity?.pagesRead || 0,
            aiUsed: activity?.aiUsed || false,
            credited: activity?.streakCredited || false,
            pagesNeeded: activity?.streakCredited
                ? 0
                : Math.max(0, PAGES_THRESHOLD - (activity?.pagesRead || 0)),
        },
    }
}
