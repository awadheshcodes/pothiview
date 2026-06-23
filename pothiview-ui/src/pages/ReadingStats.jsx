import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import http from '../lib/http'
import { computeLibraryGamification } from '../lib/gamification'
import { ProgressTab } from '../components/reader/GamificationPanel'
import WeeklySummaryCard from '../components/stats/WeeklySummaryCard'
import DailyQuizCard from '../components/stats/DailyQuizCard'
import AnalyticsDashboard from '../components/stats/AnalyticsDashboard'
import RecentActivityFeed from '../components/stats/RecentActivityFeed'

const ReadingStats = () => {
  const [stats, setStats] = useState(null)
  const [streak, setStreak] = useState(null)
  const [recentPdf, setRecentPdf] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      http.get('/stats/library'),
      http.get('/streak'),
      http.get('/pdf').catch(() => ({ data: [] })),
    ])
      .then(([statsRes, streakRes, pdfRes]) => {
        setStats(statsRes.data)
        setStreak(streakRes.data)
        setRecentPdf(pdfRes.data?.[0] || null)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold text-ink mb-1 flex items-center gap-2">
        <BarChart3 size={22} className="text-brand-600" /> Reading Stats
      </h1>
      <p className="text-sm text-ink-soft mb-7">Your level, streak, and achievements across the whole library.</p>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-ink/[0.05] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {stats && (
            <ProgressTab gamification={computeLibraryGamification(stats)} streak={streak} darkMode={false} />
          )}

          {stats && (
            <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
              <div>
                <p className="text-base font-bold text-ink leading-none">{stats.totalPdfs}</p>
                <p className="text-[10px] text-ink-faint mt-1">PDFs</p>
              </div>
              <div>
                <p className="text-base font-bold text-ink leading-none">{stats.totalPagesRead}</p>
                <p className="text-[10px] text-ink-faint mt-1">pages read</p>
              </div>
              <div>
                <p className="text-base font-bold text-ink leading-none">{stats.completedPdfs}</p>
                <p className="text-[10px] text-ink-faint mt-1">finished</p>
              </div>
              <div>
                <p className="text-base font-bold text-ink leading-none">{stats.highlights}</p>
                <p className="text-[10px] text-ink-faint mt-1">highlights</p>
              </div>
              <div>
                <p className="text-base font-bold text-ink leading-none">{stats.notes}</p>
                <p className="text-[10px] text-ink-faint mt-1">notes</p>
              </div>
            </div>
          )}

          <AnalyticsDashboard />

          <WeeklySummaryCard />
          <RecentActivityFeed />
          <DailyQuizCard pdf={recentPdf} />
        </div>
      )}
    </div>
  )
}

export default ReadingStats
