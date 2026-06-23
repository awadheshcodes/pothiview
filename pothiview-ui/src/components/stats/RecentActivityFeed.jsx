import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Highlighter, NotebookPen, Bookmark, BookOpen, Trophy, History } from 'lucide-react'
import http from '../../lib/http'

const relativeTime = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// One small icon + sentence per activity type — keeps the feed scannable
// without needing a legend. Falls back gracefully if a future type shows
// up that this build doesn't know about yet.
const describe = (item) => {
  const title = item.pdfId?.title
  switch (item.type) {
    case 'highlight':
      return { Icon: Highlighter, color: 'text-amber-600 bg-amber-50', text: title ? `Highlighted a passage in "${title}"` : 'Highlighted a passage' }
    case 'note':
      return { Icon: NotebookPen, color: 'text-brand-600 bg-brand-50', text: title ? `Added a note in "${title}"` : 'Added a note' }
    case 'bookmark':
      return { Icon: Bookmark, color: 'text-sky-600 bg-sky-50', text: title ? `Bookmarked a page in "${title}"` : 'Bookmarked a page' }
    case 'pages_read': {
      const n = item.meta?.pages || 1
      return { Icon: BookOpen, color: 'text-ink-soft bg-paper-dim', text: title ? `Read ${n} page${n !== 1 ? 's' : ''} of "${title}"` : `Read ${n} page${n !== 1 ? 's' : ''}` }
    }
    case 'achievement':
      return { Icon: Trophy, color: 'text-white bg-gradient-to-br from-amber-400 to-brand-600', text: `Earned "${item.meta?.badgeLabel || 'an achievement'}"` }
    default:
      return { Icon: History, color: 'text-ink-soft bg-paper-dim', text: 'Activity' }
  }
}

/**
 * RecentActivityFeed
 *
 * Chronological list of what's happened across the whole library — pages
 * read, highlights, notes, bookmarks, and PothiXP achievement unlocks.
 * Backed by GET /stats/activity (most-recent-first, capped server-side).
 */
const RecentActivityFeed = ({ limit = 12 }) => {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)

  useEffect(() => {
    http.get(`/stats/activity?limit=${limit}`)
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]))
  }, [limit])

  const onOpen = (item) => {
    if (!item.pdfId?._id) return
    navigate(`/reader/${item.pdfId._id}`)
  }

  return (
    <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint flex items-center gap-1.5 mb-3.5">
        <History size={13} className="text-brand-600" /> Recent Activity
      </p>

      {items === null ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-ink/[0.05] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-soft py-4 text-center">
          Nothing yet — highlight a passage, jot a note, or just keep reading.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const { Icon, color, text } = describe(item)
            const clickable = !!item.pdfId?._id
            return (
              <li key={item._id}>
                <button
                  onClick={() => onOpen(item)}
                  disabled={!clickable}
                  className={`w-full flex items-center gap-3 py-2 px-1.5 -mx-1.5 rounded-lg text-left transition-colors ${clickable ? 'hover:bg-paper-dim' : 'cursor-default'}`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={13} />
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-ink truncate">{text}</span>
                  <span className="text-[11px] text-ink-faint shrink-0">{relativeTime(item.createdAt)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default RecentActivityFeed
