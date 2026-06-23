import { Flame } from 'lucide-react'

const PAGES_THRESHOLD = 5

const Ring = ({ pct, size = 48, stroke = 5, color = '#F59E0B' }) => {
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
 * StudyStreakWidget — "current streak, best streak", as its own dashboard
 * card. (Previously this lived combined with PothiPlan in DashboardWidgets;
 * it's split out so the Library matches the spec's explicit section order.)
 */
const StudyStreakWidget = ({ streak }) => {
  if (!streak) return null

  const { current, longest, today } = streak
  const isLive = current > 0
  const ringPct = today.credited ? 100 : today.aiUsed ? 60 : Math.min(99, (today.pagesRead / PAGES_THRESHOLD) * 100)

  return (
    <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 flex items-center gap-3.5">
      <div className="relative shrink-0">
        <Ring pct={ringPct} color={today.credited ? '#2F7A60' : '#F59E0B'} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Flame size={18} className={today.credited ? 'text-brand-600' : isLive ? 'text-amber-500' : 'text-ink/20'} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-0.5">Study Streak</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-ink leading-none">{current}</span>
          <span className="text-xs text-ink-soft">day{current !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-[11px] text-ink-faint mt-0.5">Best: {longest} day{longest !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

export default StudyStreakWidget
