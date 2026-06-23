// Lightweight, zero-dependency status chip. Reads from the planStatus
// object the server computes and attaches to every PDF response.

const STYLES = {
  ahead:     { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Ahead' },
  on_track:  { bg: 'bg-brand-50 border-brand-200',    text: 'text-brand-700',   dot: 'bg-brand-500',   label: 'On Track' },
  behind:    { bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Behind' },
  completed: { bg: 'bg-sky-50 border-sky-200',        text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'Completed ✓' },
}

/**
 * PlanBadge
 *
 * Props:
 *   planStatus  – the planStatus object attached to a PDF response, or null
 *   size        – 'sm' (library card) | 'md' (reader sidebar, default)
 *   showDetail  – show pagesPerDay + daysRemaining line
 */
const PlanBadge = ({ planStatus, size = 'md', showDetail = false }) => {
  if (!planStatus) return null

  const s = STYLES[planStatus.status] || STYLES.on_track
  const isSmall = size === 'sm'

  return (
    <div className={`inline-flex flex-col gap-1 ${isSmall ? '' : ''}`}>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold ${s.bg} ${s.text} ${isSmall ? 'text-[10px]' : 'text-xs'}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        {s.label}
      </span>
      {showDetail && planStatus.status !== 'completed' && (
        <p className="text-[11px] text-ink-faint pl-1">
          {planStatus.pagesPerDay} pg/day · {planStatus.daysRemaining}d left
        </p>
      )}
    </div>
  )
}

export default PlanBadge
