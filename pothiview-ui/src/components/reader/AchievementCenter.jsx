import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'

/**
 * AchievementCenter (Feature 5: Compact Achievement Popup)
 *
 * Single compact pill toast — small, non-intrusive, auto-dismisses after 2 s.
 * Shows "🏆 Badge Name · +20 XP" inline. Tap to open full sheet.
 */

const Particle = ({ x, color, delay }) => (
  <motion.div
    className="fixed pointer-events-none z-[9999] w-2 h-2 rounded-sm"
    style={{ left: x, top: '20%', background: color }}
    initial={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
    animate={{ y: 180, opacity: 0, rotate: 360, scale: 0.4 }}
    transition={{ duration: 1.2, delay, ease: 'easeIn' }}
  />
)

const CONFETTI_COLORS = ['#F59E0B', '#2F7A60', '#A78BFA', '#F87171', '#34D399', '#60A5FA']

// XP awarded per badge unlock (matches gamification context for display only)
const BADGE_XP = 20

const AchievementCenter = ({ newBadges = [], onDismiss }) => {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [particles, setParticles] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const prevCountRef = useRef(0)
  const autoTimerRef = useRef(null)

  // Spawn confetti when new badges arrive
  useEffect(() => {
    if (newBadges.length > 0 && newBadges.length > prevCountRef.current) {
      const burst = Array.from({ length: 16 }, (_, i) => ({
        id: Date.now() + i,
        x: `${15 + Math.random() * 70}%`,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.3,
      }))
      setParticles(burst)
      setTimeout(() => setParticles([]), 1800)
      setCurrentIdx(0)
    }
    prevCountRef.current = newBadges.length
  }, [newBadges.length])

  // Auto-dismiss after 2 s per badge (Feature 5)
  useEffect(() => {
    if (newBadges.length === 0) return
    clearTimeout(autoTimerRef.current)
    autoTimerRef.current = setTimeout(() => {
      if (currentIdx < newBadges.length - 1) {
        setCurrentIdx((i) => i + 1)
      } else {
        onDismiss?.()
      }
    }, 2200)
    return () => clearTimeout(autoTimerRef.current)
  }, [currentIdx, newBadges.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = newBadges.length > 0
  const badge = visible ? newBadges[currentIdx] : null

  return (
    <>
      {/* Confetti */}
      {particles.map((p) => (
        <Particle key={p.id} x={p.x} color={p.color} delay={p.delay} />
      ))}

      {/* Compact achievement pill (Feature 5) */}
      <AnimatePresence mode="wait">
        {visible && !sheetOpen && badge && (
          <motion.button
            key={badge.id}
            initial={{ x: 80, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 80, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={() => setSheetOpen(true)}
            style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}
            className="fixed right-3 z-[200] flex items-center gap-2 pl-2 pr-3 py-2 rounded-2xl bg-white border border-amber-200 shadow-lift"
          >
            {/* Badge icon */}
            <motion.div
              animate={{ scale: [0.8, 1.15, 1], rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-brand-600 flex items-center justify-center shrink-0"
            >
              {(() => {
                const Icon = Icons[badge.icon] || Icons.Award
                return <Icon size={15} className="text-white" strokeWidth={2} />
              })()}
            </motion.div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide leading-none mb-0.5">
                Achievement!
              </p>
              <p className="text-[12px] font-semibold text-ink leading-tight truncate max-w-[120px]">
                {badge.label}
              </p>
            </div>
            {/* XP reward chip */}
            <span className="shrink-0 text-[11px] font-bold text-brand-600 bg-brand-50 rounded-lg px-1.5 py-0.5">
              +{BADGE_XP} XP
            </span>
            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss?.() }}
              className="w-4 h-4 rounded-full bg-ink/10 flex items-center justify-center text-ink-faint hover:bg-ink/20 transition shrink-0 ml-0.5"
            >
              <Icons.X size={9} />
            </button>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full achievement sheet (tap the pill to open) */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSheetOpen(false); onDismiss?.() }}
              className="fixed inset-0 bg-black/40 z-[201]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[202] bg-white rounded-t-3xl border-t border-ink/[0.08] shadow-lift"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: '80dvh', overflowY: 'auto' }}
            >
              <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-ink/[0.06]">
                <span className="text-xl">🏆</span>
                <p className="flex-1 font-bold text-sm text-ink">New Achievements</p>
                <button
                  onClick={() => { setSheetOpen(false); onDismiss?.() }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-ink/[0.06] text-ink-faint"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <div className="p-4 grid grid-cols-2 gap-3">
                {newBadges.map((b, i) => {
                  const Icon = Icons[b.icon] || Icons.Award
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.08, type: 'spring', stiffness: 280, damping: 20 }}
                      className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-paper-dim"
                    >
                      <motion.div
                        animate={{ scale: [0.8, 1.15, 1] }}
                        transition={{ delay: i * 0.08 + 0.15, duration: 0.4 }}
                        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-brand-600 flex items-center justify-center shadow-lift"
                      >
                        <Icon size={24} className="text-white" strokeWidth={2} />
                      </motion.div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">Unlocked!</p>
                        <p className="text-sm font-semibold text-ink leading-tight">{b.label}</p>
                        <p className="text-[10px] text-ink-faint mt-0.5">{b.hint}</p>
                        <p className="text-[11px] font-bold text-brand-600 mt-1">+{BADGE_XP} XP</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default AchievementCenter
