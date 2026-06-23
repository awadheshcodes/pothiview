import { Response } from 'express'
import Exc from '../util/exc.util'
import { AuthInterface } from '../middleware/guard.middleware'
import PdfModel from '../pdf/pdf.model'
import HighlightModel from '../reader/highlight.model'
import NoteModel from '../reader/note.model'
import BookmarkModel from '../reader/bookmark.model'
import AiMessageModel from '../ai/ai.model'
import ProgressModel from '../reader/progress.model'
import DailyActivityModel from '../streak/dailyActivity.model'
import ActivityModel from './activity.model'
import { getStreakSummary, getWeeklySummary } from '../streak/streak.service'

// Library-wide gamification source data — everything the frontend's
// computeLibraryGamification() needs to derive a single XP/level number
// across the whole library, plus raw totals for the Reading Stats page.
// Intentionally read-only/derived (same philosophy as the per-document
// PothiXP in lib/gamification.js): no separate "library stats" table to
// keep in sync, just a handful of counts pulled in parallel.
export const getLibraryStats = Exc(async (req: AuthInterface, res: Response) => {
    const userId = req.user.id

    const [
        pdfs,
        highlights,
        notes,
        bookmarks,
        aiQuestions,
        streak,
    ] = await Promise.all([
        PdfModel.find({ userId }).select('totalPages lastPage title lastOpenedAt').lean(),
        HighlightModel.countDocuments({ userId }),
        NoteModel.countDocuments({ userId }),
        BookmarkModel.countDocuments({ userId }),
        AiMessageModel.countDocuments({ userId, role: 'user' }),
        getStreakSummary(userId),
    ])

    const totalPdfs = pdfs.length
    const totalPagesRead = pdfs.reduce((sum, p) => sum + Math.min(p.lastPage || 0, p.totalPages || p.lastPage || 0), 0)
    const completedPdfs = pdfs.filter((p) => p.totalPages > 0 && p.lastPage >= p.totalPages).length
    const avgProgressPct = totalPdfs
        ? Math.round(pdfs.reduce((sum, p) => sum + (p.totalPages ? Math.min(100, (p.lastPage / p.totalPages) * 100) : 0), 0) / totalPdfs)
        : 0

    res.json({
        totalPdfs,
        totalPagesRead,
        completedPdfs,
        avgProgressPct,
        highlights,
        notes,
        bookmarks,
        aiQuestions,
        streakCurrent: streak.current,
        streakLongest: streak.longest,
    })
})

// ─── ANALYTICS DASHBOARD ────────────────────────────────────────────────
// Four at-a-glance numbers for the Reading Stats page. Each is cheap to
// derive from data that's already being written elsewhere (ReadingProgress,
// DailyActivity, Streak) — no separate "analytics" table to keep in sync.
export const getAnalytics = Exc(async (req: AuthInterface, res: Response) => {
    const userId = req.user.id

    const [progressDocs, weekly, streak, busiestDay] = await Promise.all([
        ProgressModel.find({ userId }).select('readingTimeMs').lean(),
        getWeeklySummary(userId),
        getStreakSummary(userId),
        // All-time busiest single day, not just within the last 7 — the
        // Weekly Summary card already covers the 7-day view, so this is
        // deliberately a different (longer) lens.
        DailyActivityModel.findOne({ userId, pagesRead: { $gt: 0 } }).sort({ pagesRead: -1 }).lean(),
    ])

    const totalReadingTimeMs = progressDocs.reduce((sum, p: any) => sum + (p.readingTimeMs || 0), 0)

    res.json({
        totalReadingTimeMs,
        pagesThisWeek: weekly.totalPagesRead,
        longestStreak: streak.longest,
        mostActiveDay: busiestDay
            ? { date: (busiestDay as any).date, pagesRead: (busiestDay as any).pagesRead }
            : null,
    })
})

// ─── RECENT ACTIVITY FEED ───────────────────────────────────────────────
// Most-recent-first feed of highlights, notes, bookmarks, reading
// sessions, and achievement unlocks. Backed by the append-only Activity
// log — see reader.controller (highlight/note/bookmark/progress) and
// logAchievement below for the write side.
export const getRecentActivity = Exc(async (req: AuthInterface, res: Response) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const activity = await ActivityModel.find({ userId: req.user.id })
        .populate('pdfId', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
    res.json(activity)
})

// PothiXP badges are computed client-side from in-memory state (see
// lib/gamification.js) — there's no server-side source of truth for
// "which badges has this user earned". So the activity feed is told
// about a new unlock explicitly, the moment AchievementCenter shows it.
// Deliberately narrow (exactly this shape) rather than a generic
// "log any activity" endpoint, so a compromised/buggy client can't
// pollute the feed with arbitrary event types.
export const logAchievement = Exc(async (req: AuthInterface, res: Response) => {
    const { badgeId, badgeLabel, badgeIcon, pdfId } = req.body
    if (!badgeLabel || !String(badgeLabel).trim())
        return res.status(400).json({ message: 'badgeLabel is required' })

    const activity = await ActivityModel.create({
        userId: req.user.id,
        type: 'achievement',
        pdfId: pdfId || null,
        meta: {
            badgeId: badgeId || null,
            badgeLabel: String(badgeLabel).trim(),
            badgeIcon: badgeIcon || 'Trophy',
        },
    })
    res.status(201).json(activity)
})
