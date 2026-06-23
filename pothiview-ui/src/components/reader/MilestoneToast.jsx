/**
 * MilestoneToast (Feature 6: Reading Motivation)
 *
 * A compact non-blocking toast shown when a reading milestone is hit.
 * This component is used with react-toastify's `toast()` content API,
 * but we also export a standalone helper `showMilestone()` that fires
 * the toast with consistent styling — just import and call it anywhere.
 */
import { motion } from 'framer-motion'

export const MILESTONES = [
  // { id, emoji, label, xp, test(stats) }
  // "stats" shape: { pageNum, progressPct, highlights, notes, aiMessages, streakCurrent }
  {
    id: 'read-10-pages',
    emoji: '📖',
    label: 'Read 10 Pages',
    xp: 30,
    test: (s) => s.pageNum >= 10,
  },
  {
    id: 'read-25-pages',
    emoji: '📚',
    label: 'Read 25 Pages',
    xp: 50,
    test: (s) => s.pageNum >= 25,
  },
  {
    id: 'read-50-pages',
    emoji: '🎯',
    label: 'Read 50 Pages',
    xp: 75,
    test: (s) => s.pageNum >= 50,
  },
  {
    id: 'first-highlight',
    emoji: '✨',
    label: 'Created First Highlight',
    xp: 20,
    test: (s) => s.highlights >= 1,
  },
  {
    id: 'first-ai-question',
    emoji: '🧠',
    label: 'Asked First AI Question',
    xp: 20,
    test: (s) => s.aiQuestions >= 1,
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    label: '3 Day Streak',
    xp: 75,
    test: (s) => s.streakCurrent >= 3,
  },
  {
    id: 'first-note',
    emoji: '📝',
    label: 'Wrote First Note',
    xp: 20,
    test: (s) => s.notes >= 1,
  },
  {
    id: 'halfway',
    emoji: '🚀',
    label: 'Halfway Through!',
    xp: 50,
    test: (s) => s.progressPct >= 50,
  },
  {
    id: 'finished',
    emoji: '🏆',
    label: 'Finished the Book!',
    xp: 150,
    test: (s) => s.progressPct >= 100,
  },
]

/**
 * The visual content of one milestone toast bubble.
 */
const MilestoneToast = ({ milestone }) => (
  <motion.div
    initial={{ scale: 0.85, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 340, damping: 22 }}
    className="flex items-center gap-2.5"
  >
    <span className="text-2xl shrink-0">{milestone.emoji}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 leading-none mb-0.5">
        Milestone!
      </p>
      <p className="text-[13px] font-semibold text-ink leading-tight">{milestone.label}</p>
    </div>
    <span className="shrink-0 text-[11px] font-bold text-brand-600 bg-brand-50 rounded-lg px-1.5 py-0.5 ml-auto">
      +{milestone.xp} XP
    </span>
  </motion.div>
)

export default MilestoneToast
