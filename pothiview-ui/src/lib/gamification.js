// ─── PothiXP ───────────────────────────────────────────────────────────────
// Everything here is *derived*, in the browser, from data the reader already
// fetches (progress, highlights, notes, bookmarks, AI messages, /streak).
// There is no XP/badge table on the server — this is intentionally a pure
// function of state that's already in memory, so it costs nothing extra and
// never drifts from the backend's source of truth (pages/streak/etc).

const XP_RULES = {
  perPercentRead: 3,   // progress into *this* document
  perHighlight: 15,
  perNote: 20,
  perBookmark: 10,
  perAiQuestion: 10,
  perStreakDay: 25,
}

const XP_PER_LEVEL = 250

export const BADGES = [
  {
    id: 'first-page',
    label: 'Cracked the Spine',
    hint: 'Open a page',
    icon: 'BookOpen',
    test: (s) => s.pageNum > 1 || s.progressPct > 0,
  },
  {
    id: 'first-highlight',
    label: 'First Highlight',
    hint: 'Highlight any passage',
    icon: 'Highlighter',
    test: (s) => s.highlights >= 1,
  },
  {
    id: 'first-note',
    label: 'Margin Notes',
    hint: 'Write your first note',
    icon: 'NotebookPen',
    test: (s) => s.notes >= 1,
  },
  {
    id: 'curious-mind',
    label: 'Curious Mind',
    hint: 'Ask the AI 5 questions',
    icon: 'Sparkles',
    test: (s) => s.aiQuestions >= 5,
  },
  {
    id: 'quiz-whiz',
    label: 'Quiz Whiz',
    hint: 'Generate a quiz',
    icon: 'Brain',
    test: (s) => s.usedMcq,
  },
  {
    id: 'highlighter-pro',
    label: 'Highlighter Pro',
    hint: 'Save 10 highlights',
    icon: 'Highlighter',
    test: (s) => s.highlights >= 10,
  },
  {
    id: 'bookmark-collector',
    label: 'Trail Marker',
    hint: 'Save 5 bookmarks',
    icon: 'Bookmark',
    test: (s) => s.bookmarks >= 5,
  },
  {
    id: 'streak-3',
    label: '3-Day Streak',
    hint: 'Read 3 days in a row',
    icon: 'Flame',
    test: (s) => s.streakCurrent >= 3,
  },
  {
    id: 'streak-7',
    label: 'Week Strong',
    hint: 'Read 7 days in a row',
    icon: 'Flame',
    test: (s) => s.streakCurrent >= 7,
  },
  {
    id: 'finisher',
    label: 'Finisher',
    hint: 'Reach the last page',
    icon: 'Trophy',
    test: (s) => s.progressPct >= 100,
  },
]

/**
 * computeGamification
 *
 * @param {object} stats - { pageNum, progressPct, highlights, notes,
 *   bookmarks, aiMessages, streakCurrent, streakLongest }
 * @returns {object} { xp, level, xpIntoLevel, xpToNextLevel, levelProgressPct,
 *   earnedBadgeIds: string[], badges: (BADGES[i] & { earned: boolean })[] }
 */
export const computeGamification = (stats) => {
  const {
    pageNum = 1,
    progressPct = 0,
    highlights = 0,
    notes = 0,
    bookmarks = 0,
    aiMessages = [],
    streakCurrent = 0,
    streakLongest = 0,
  } = stats

  const aiQuestions = aiMessages.filter((m) => m.role === 'user').length
  const usedMcq = aiMessages.some((m) => m.type === 'mcq')

  const xp = Math.round(
    progressPct * XP_RULES.perPercentRead +
    highlights * XP_RULES.perHighlight +
    notes * XP_RULES.perNote +
    bookmarks * XP_RULES.perBookmark +
    aiQuestions * XP_RULES.perAiQuestion +
    streakCurrent * XP_RULES.perStreakDay
  )

  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel
  const levelProgressPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)

  const badgeStats = { pageNum, progressPct, highlights, notes, bookmarks, aiQuestions, usedMcq, streakCurrent, streakLongest }
  const badges = BADGES.map((b) => ({ ...b, earned: b.test(badgeStats) }))
  const earnedBadgeIds = badges.filter((b) => b.earned).map((b) => b.id)

  return { xp, level, xpIntoLevel, xpToNextLevel, levelProgressPct, earnedBadgeIds, badges }
}

export const XP_PER_LEVEL_CONST = XP_PER_LEVEL

// ─── Student-friendly level titles (Feature 1) ─────────────────────────────
// 6 named levels; above Level 6 we keep cycling "Pothi Master (L7)" etc.
export const LEVEL_NAMES = [
  'Fresh Reader',      // Level 1
  'Curious Mind',      // Level 2
  'Study Explorer',    // Level 3
  'Knowledge Builder', // Level 4
  'Scholar',           // Level 5
  'Pothi Master',      // Level 6+
]

/**
 * Get the friendly title for a level number (1-indexed).
 * Levels beyond 6 stay "Pothi Master".
 */
export const levelTitle = (level) => {
  const idx = Math.min(level - 1, LEVEL_NAMES.length - 1)
  return LEVEL_NAMES[Math.max(0, idx)]
}

/**
 * Get the title of the NEXT level (what the user is working toward).
 */
export const nextLevelTitle = (level) => {
  const nextIdx = Math.min(level, LEVEL_NAMES.length - 1)
  return LEVEL_NAMES[nextIdx]
}

/**
 * Motivational sentence pointing toward the next level.
 */
export const motivationalText = (level) => {
  const next = nextLevelTitle(level)
  const messages = [
    `Keep reading to become a ${next}.`,
    `You're on your way to ${next}!`,
    `Every page gets you closer to ${next}.`,
    `Stay consistent — ${next} is within reach.`,
  ]
  return messages[Math.min(level - 1, messages.length - 1)]
}

// ─── Library-wide PothiXP ───────────────────────────────────────────────
// Same idea as computeGamification, but fed from /stats/library (counts
// aggregated across every PDF) instead of a single document's stats —
// this is what powers the Library dashboard's XP Progress widget and the
// Reading Stats page, where "this one book's progress" doesn't make sense.
const LIBRARY_XP_RULES = {
  perPageRead: 2,
  perHighlight: 15,
  perNote: 20,
  perBookmark: 10,
  perAiQuestion: 10,
  perStreakDay: 25,
}

export const computeLibraryGamification = (stats) => {
  const {
    totalPagesRead = 0,
    avgProgressPct = 0,
    highlights = 0,
    notes = 0,
    bookmarks = 0,
    aiQuestions = 0,
    streakCurrent = 0,
    streakLongest = 0,
  } = stats

  const xp = Math.round(
    totalPagesRead * LIBRARY_XP_RULES.perPageRead +
    highlights * LIBRARY_XP_RULES.perHighlight +
    notes * LIBRARY_XP_RULES.perNote +
    bookmarks * LIBRARY_XP_RULES.perBookmark +
    aiQuestions * LIBRARY_XP_RULES.perAiQuestion +
    streakCurrent * LIBRARY_XP_RULES.perStreakDay
  )

  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel
  const levelProgressPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)

  const badgeStats = { pageNum: totalPagesRead, progressPct: avgProgressPct, highlights, notes, bookmarks, aiQuestions, usedMcq: false, streakCurrent, streakLongest }
  const badges = BADGES.map((b) => ({ ...b, earned: b.test(badgeStats) }))
  const earnedBadgeIds = badges.filter((b) => b.earned).map((b) => b.id)

  return { xp, level, xpIntoLevel, xpToNextLevel, levelProgressPct, earnedBadgeIds, badges }
}
