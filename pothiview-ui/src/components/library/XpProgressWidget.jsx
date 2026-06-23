import { useEffect, useState } from 'react'
import { Award } from 'lucide-react'
import http from '../../lib/http'
import { computeLibraryGamification, levelTitle, nextLevelTitle } from '../../lib/gamification'

const Ring = ({ pct, size = 48, stroke = 5, color = '#2F7A60' }) => {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(1, pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E3D8" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  )
}

/**
 * XpProgressWidget
 *
 * Shows: level title, XP, and XP to next level name.
 * Example: "Curious Mind · 332 XP · 168 XP until Study Explorer"
 */
const XpProgressWidget = () => {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    http.get('/stats/library').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  if (!stats) {
    return (
      <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 h-[76px] animate-pulse" />
    )
  }

  const { level, levelProgressPct, xp, xpToNextLevel } = computeLibraryGamification(stats)
  const currentTitle = levelTitle(level)
  const nextTitle = nextLevelTitle(level)
  const hasNextLevel = nextTitle !== currentTitle

  return (
    <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 flex items-center gap-3.5">
      <div className="relative shrink-0">
        <Ring pct={levelProgressPct} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold text-brand-600">{level}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-0.5 flex items-center gap-1">
          <Award size={11} /> XP Progress
        </p>
        <p className="text-sm font-bold text-ink leading-tight">{currentTitle}</p>
        <p className="text-[11px] text-ink-soft mt-0.5">
          {xp.toLocaleString()} XP
          {hasNextLevel && (
            <> · <span className="text-brand-600">{xpToNextLevel} until {nextTitle}</span></>
          )}
        </p>
      </div>
    </div>
  )
}

export default XpProgressWidget
