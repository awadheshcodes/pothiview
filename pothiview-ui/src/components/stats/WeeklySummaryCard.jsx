import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import http from '../../lib/http'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const WeeklySummaryCard = () => {
  const [week, setWeek] = useState(null)

  useEffect(() => {
    http.get('/streak/weekly').then(({ data }) => setWeek(data)).catch(() => {})
  }, [])

  if (!week) {
    return <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-5 h-[180px] animate-pulse" />
  }

  const maxPages = Math.max(1, ...week.days.map((d) => d.pagesRead))

  return (
    <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint flex items-center gap-1.5 mb-3.5">
        <CalendarDays size={13} className="text-brand-600" /> Weekly Summary
      </p>

      <div className="flex items-end justify-between gap-2 h-24 mb-2">
        {week.days.map((d) => {
          const barPct = Math.max(6, Math.round((d.pagesRead / maxPages) * 100))
          const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay()
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${d.credited ? 'bg-brand-500' : d.pagesRead > 0 ? 'bg-brand-200' : 'bg-ink/[0.06]'}`}
                style={{ height: `${barPct}%` }}
                title={`${d.pagesRead} pages`}
              />
              <span className="text-[10px] text-ink-faint">{DAY_LABELS[dow]}</span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-ink/[0.06] text-center">
        <div className="flex-1">
          <p className="text-lg font-bold text-ink leading-none">{week.totalPagesRead}</p>
          <p className="text-[10px] text-ink-faint mt-1">pages this week</p>
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-ink leading-none">{week.activeDays}/7</p>
          <p className="text-[10px] text-ink-faint mt-1">active days</p>
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-ink leading-none">{week.creditedDays}</p>
          <p className="text-[10px] text-ink-faint mt-1">streak days</p>
        </div>
      </div>
    </div>
  )
}

export default WeeklySummaryCard
