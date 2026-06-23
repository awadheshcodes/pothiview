import { useEffect, useState } from 'react'
import { Clock, TrendingUp, CalendarCheck, Flame } from 'lucide-react'
import http from '../../lib/http'

// 152400000ms → "2h 32m". Caps the minutes-only case at "<1m" so a tiny
// amount of accumulated time (e.g. a single quick page flip) doesn't
// render as a misleading "0m".
const formatDuration = (ms) => {
  const totalMinutes = Math.floor((ms || 0) / 60000)
  if (totalMinutes < 1) return '<1m'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// "2026-06-18" → "Wed, Jun 18". Parsed as UTC midnight to match how the
// backend stores DailyActivity dates (UTC calendar days), so this never
// drifts a day off depending on the reader's own timezone.
const formatDayLabel = (dateStr) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 flex flex-col gap-2">
    <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-lg font-bold text-ink leading-none">{value}</p>
      <p className="text-[11px] text-ink-faint mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-ink-faint mt-0.5">{sub}</p>}
    </div>
  </div>
)

/**
 * AnalyticsDashboard
 *
 * Four at-a-glance numbers for the Reading Stats page — total reading
 * time, pages read this week, the single most active day on record, and
 * the longest streak ever hit. Backed by GET /stats/analytics, which
 * derives all four from data already written by the reader/streak
 * features (no separate analytics table).
 */
const AnalyticsDashboard = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    http.get('/stats/analytics').then(({ data }) => setData(data)).catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[92px] rounded-2xl bg-ink/[0.05] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-3">Analytics</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Total reading time"
          value={formatDuration(data.totalReadingTimeMs)}
        />
        <StatCard
          icon={TrendingUp}
          label="Pages this week"
          value={data.pagesThisWeek}
        />
        <StatCard
          icon={CalendarCheck}
          label="Most active day"
          value={data.mostActiveDay ? formatDayLabel(data.mostActiveDay.date) : '—'}
          sub={data.mostActiveDay ? `${data.mostActiveDay.pagesRead} pages` : 'No activity yet'}
        />
        <StatCard
          icon={Flame}
          label="Longest streak"
          value={`${data.longestStreak} day${data.longestStreak !== 1 ? 's' : ''}`}
        />
      </div>
    </div>
  )
}

export default AnalyticsDashboard
