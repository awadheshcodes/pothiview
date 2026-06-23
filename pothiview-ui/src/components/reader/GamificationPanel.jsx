import * as Icons from 'lucide-react'
import { motion } from 'framer-motion'
import ProgressRing from './ProgressRing'
import { XP_PER_LEVEL_CONST, levelTitle, nextLevelTitle, motivationalText } from '../../lib/gamification'

// ── Compact toolbar pill: level ring + streak flame ─────────────────────────
export const XpPill = ({ gamification, streakCurrent, darkMode, onOpen }) => {
  const { level, levelProgressPct } = gamification
  const title = levelTitle(level)
  return (
    <button
      onClick={onOpen}
      className={`flex items-center gap-1.5 pl-1 pr-2.5 h-9 rounded-full border shrink-0 transition active:scale-95 ${
        darkMode
          ? 'bg-white/5 border-white/10 hover:border-white/20'
          : 'bg-paper-dim border-ink/[0.08] hover:border-brand-300'
      }`}
      title={`${title} — Reading progress`}
    >
      <ProgressRing
        pct={levelProgressPct}
        size={28}
        stroke={3}
        color="#2F7A60"
        trackColor={darkMode ? 'rgba(255,255,255,0.12)' : '#E8E3D8'}
      >
        <span className="text-[9px] font-bold text-brand-600">{level}</span>
      </ProgressRing>
      <span className={`text-[10px] font-semibold hidden sm:inline truncate max-w-[80px] ${darkMode ? 'text-white/70' : 'text-ink-soft'}`}>
        {title}
      </span>
      {streakCurrent > 0 && (
        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
          <Icons.Flame size={12} strokeWidth={2.5} />
          {streakCurrent}
        </span>
      )}
    </button>
  )
}

// ── Card wrapper for consistent look ───────────────────────────────────────
const Card = ({ children, className = '', darkMode }) => (
  <div className={`rounded-2xl border p-4 ${
    darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-ink/[0.07] shadow-soft'
  } ${className}`}>
    {children}
  </div>
)

// ── Full "Progress" tab ─────────────────────────────────────────────────────
export const ProgressTab = ({ gamification, streak, darkMode }) => {
  const { xp, level, xpIntoLevel, xpToNextLevel, levelProgressPct, badges } = gamification
  const earned = badges.filter((b) => b.earned)
  const locked = badges.filter((b) => !b.earned)

  const currentTitle = levelTitle(level)
  const nextTitle = nextLevelTitle(level)
  const motivText = motivationalText(level)
  // Only show "next level" block when there IS a distinct next level name
  const hasNextLevel = nextTitle !== currentTitle

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-thin">

      {/* ── Level + XP card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Card darkMode={darkMode} className={!darkMode ? 'bg-gradient-to-br from-brand-50 to-paper-dim border-brand-100' : ''}>
          <div className="flex items-center gap-4">
            {/* Animated ring entrance */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
            >
              <ProgressRing
                pct={levelProgressPct}
                size={72}
                stroke={7}
                color="#2F7A60"
                trackColor={darkMode ? 'rgba(255,255,255,0.12)' : '#D9EBE2'}
              >
                <div className="flex flex-col items-center leading-none">
                  <span className="text-xl font-bold text-brand-600">{level}</span>
                  <span className="text-[7px] uppercase tracking-widest text-ink-faint mt-0.5">LVL</span>
                </div>
              </ProgressRing>
            </motion.div>

            <div className="flex-1 min-w-0">
              {/* Level name — the main identity label */}
              <p className={`text-base font-bold leading-tight mb-0.5 ${darkMode ? 'text-white' : 'text-ink'}`}>
                {currentTitle}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint mb-1">PothiXP</p>
              <motion.p
                className="text-2xl font-bold text-ink leading-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {xp.toLocaleString()}
                <span className="text-sm font-medium text-ink-faint ml-1">XP</span>
              </motion.p>

              {/* XP to next level */}
              {hasNextLevel && (
                <p className={`text-[11px] mt-1.5 font-medium ${darkMode ? 'text-white/50' : 'text-ink-soft'}`}>
                  {xpToNextLevel} XP until{' '}
                  <span className="text-brand-600 font-semibold">{nextTitle}</span>
                </p>
              )}

              {/* Animated XP bar */}
              <div className="h-2 rounded-full bg-ink/10 overflow-hidden mt-2">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgressPct}%` }}
                  transition={{ type: 'spring', stiffness: 70, damping: 16, delay: 0.25 }}
                />
              </div>
              <p className="text-[10px] text-ink-faint mt-1 tabular-nums">{levelProgressPct}% of this level</p>
            </div>
          </div>

          {/* Motivational text */}
          {hasNextLevel && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`mt-3 pt-3 border-t text-[11px] italic ${
                darkMode ? 'border-white/10 text-white/50' : 'border-brand-100 text-brand-700'
              }`}
            >
              ✨ {motivText}
            </motion.p>
          )}
        </Card>
      </motion.div>

      {/* ── Streak card ── */}
      {streak && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
        >
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-amber-50 border-amber-100'
          }`}>
            {/* Flame with pulse if active */}
            <div className="relative shrink-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                darkMode ? 'bg-white/10' : 'bg-white shadow-soft'
              }`}>
                <Icons.Flame
                  size={22}
                  className={streak.current > 0 ? 'text-amber-500' : 'text-ink/20'}
                  strokeWidth={2.25}
                />
              </div>
              {streak.current > 0 && (
                <motion.span
                  className="absolute inset-0 rounded-xl bg-amber-400 pointer-events-none"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-0.5">PothiStreak</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-ink tabular-nums">{streak.current}</span>
                <span className="text-sm text-ink-soft">
                  day{streak.current !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[11px] text-ink-faint mt-0.5">
                Best: {streak.longest} day{streak.longest !== 1 ? 's' : ''}
              </p>
            </div>
            {/* Visual streak dots — last 7 days indicator */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < streak.current
                        ? 'bg-amber-500'
                        : darkMode ? 'bg-white/15' : 'bg-ink/10'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[9px] text-ink-faint">last 7 days</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Badges ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.14 }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            Achievements
          </p>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            darkMode ? 'bg-white/10 text-white/60' : 'bg-brand-50 text-brand-600'
          }`}>
            {earned.length}/{badges.length}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[...earned, ...locked].map((b, i) => {
            const Icon = Icons[b.icon] || Icons.Award
            return (
              <motion.div
                key={b.id}
                initial={false}
                animate={b.earned ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 0.45 }}
                whileHover={b.earned ? { scale: 1.04 } : {}}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.03 }}
                className={`rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5 border cursor-default ${
                  b.earned
                    ? darkMode
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-ink/[0.07] shadow-soft'
                    : darkMode
                    ? 'bg-white/[0.02] border-white/5'
                    : 'bg-paper-dim/60 border-ink/[0.04]'
                }`}
                title={b.hint}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  b.earned
                    ? 'bg-gradient-to-br from-amber-400 to-brand-600'
                    : darkMode ? 'bg-white/10' : 'bg-ink/8'
                }`}>
                  {b.earned
                    ? <Icon size={18} className="text-white" strokeWidth={2} />
                    : <Icons.Lock size={14} className="text-ink-faint" />
                  }
                </div>
                <p className="text-[10px] font-medium leading-tight">{b.label}</p>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
