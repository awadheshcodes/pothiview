import { Target } from 'lucide-react'

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
 * TodaysGoalWidget
 *
 * "Pages left today" against the reader's own daily target (Settings →
 * Reading goal, defaults to 20/day). Distinct from PothiPlan, which is a
 * per-book finish-by-date schedule — this is the simple daily habit
 * counter the spec asks for on the Library dashboard.
 */
const TodaysGoalWidget = ({ streak, dailyGoalPages = 20 }) => {
  const pagesRead = streak?.today?.pagesRead || 0
  const pct = dailyGoalPages > 0 ? Math.min(100, Math.round((pagesRead / dailyGoalPages) * 100)) : 0
  const remaining = Math.max(0, dailyGoalPages - pagesRead)
  const done = remaining === 0

  return (
    <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 flex items-center gap-3.5">
      <div className="relative shrink-0">
        <Ring pct={pct} color={done ? '#2F7A60' : '#549C81'} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Target size={18} className={done ? 'text-brand-600' : 'text-ink/30'} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-0.5">Today's Goal</p>
        <p className="text-sm font-medium text-ink">
          {done ? (
            <span className="text-brand-700">Goal reached — {pagesRead} pages today 🎉</span>
          ) : (
            <><span className="font-semibold">{remaining}</span> page{remaining !== 1 ? 's' : ''} left of {dailyGoalPages}</>
          )}
        </p>
        <p className="text-[11px] text-ink-faint mt-0.5">{pagesRead}/{dailyGoalPages} pages read today</p>
      </div>
    </div>
  )
}

export default TodaysGoalWidget
