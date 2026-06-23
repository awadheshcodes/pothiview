import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Search, X } from 'lucide-react'
import http from '../lib/http'
import { useAuth } from '../lib/AuthContext'
import PlanBadge from '../components/PlanBadge'
import PlanModal from '../components/PlanModal'
import ContinueReadingCard from '../components/library/ContinueReadingCard'
import TodaysGoalWidget from '../components/library/TodaysGoalWidget'
import StudyStreakWidget from '../components/library/StudyStreakWidget'
import XpProgressWidget from '../components/library/XpProgressWidget'

const relativeTime = (dateStr) => {
  if (!dateStr) return ''
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

const PdfIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-ink-faint">
    <path d="M6 2.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 20V4A1.5 1.5 0 0 1 5.5 2.5H6Z" stroke="currentColor" strokeWidth="1.4" />
    <path d="M14 2.5V6a1 1 0 0 0 1 1h3.5" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

const PdfCard = ({ pdf, onOpen, onRename, onDelete, onSetPlan }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const progress = pdf.totalPages > 1 ? Math.round((pdf.lastPage / pdf.totalPages) * 100) : 0

  return (
    <div className="group relative">
      <button onClick={() => onOpen(pdf)} className="w-full text-left">
        <div className="aspect-[3/4] rounded-xl bg-white border border-ink/[0.08] shadow-soft overflow-hidden flex items-center justify-center group-hover:shadow-lift transition-shadow">
          {pdf.thumbnailUrl ? (
            <img src={pdf.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <PdfIcon />
          )}
        </div>
        <p className="mt-2.5 text-sm font-medium text-ink line-clamp-2 leading-snug capitalize">{pdf.title}</p>

        {pdf.planStatus && (
          <div className="mt-1.5">
            <PlanBadge planStatus={pdf.planStatus} size="sm" />
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-ink/[0.08] overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] text-ink-faint shrink-0">{progress}%</span>
        </div>
        <p className="text-[11px] text-ink-faint mt-1">Opened {relativeTime(pdf.lastOpenedAt)}</p>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-white/90 backdrop-blur border border-ink/[0.08] opacity-0 group-hover:opacity-100 flex items-center justify-center text-ink-soft hover:text-ink transition-opacity"
      >
        ⋯
      </button>
      {menuOpen && (
        <div
          className="absolute top-9 right-1.5 z-10 w-40 bg-white rounded-lg shadow-lift border border-ink/[0.06] py-1 text-sm animate-fade-in"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button onClick={() => { setMenuOpen(false); onRename(pdf) }} className="w-full text-left px-3 py-1.5 hover:bg-paper-dim text-ink-soft hover:text-ink">Rename</button>
          <button onClick={() => { setMenuOpen(false); onSetPlan(pdf) }} className="w-full text-left px-3 py-1.5 hover:bg-brand-50 text-ink-soft hover:text-brand-700">
            {pdf.planStatus ? 'Edit goal' : 'Set reading goal'}
          </button>
          <button onClick={() => { setMenuOpen(false); onDelete(pdf) }} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-500">Delete</button>
        </div>
      )}
    </div>
  )
}

// ── StatsCarousel ─────────────────────────────────────────────────────────────
// On mobile: horizontal snap-scroll row [ Goal | Streak | XP ]
// On sm+: CSS grid with 3 equal columns (unchanged)
//
// Implementation notes:
//  - Each card is a fixed-width snap child (calc((100vw - padding - gap) × 0.85))
//    so the right card peeks — Duolingo/Headway pattern signalling swipeability.
//  - scrollbar hidden via inline style (Firefox scrollbarWidth + WebKit pseudo)
//  - No JS needed: pure CSS snap works across all modern mobile browsers.
const StatsCarousel = ({ streak, dailyGoalPages }) => (
  <>
    {/* Mobile: horizontal snap scroll ---------------------------------------- */}
    <div
      className="stats-carousel sm:hidden flex gap-3 -mx-4 px-4 pb-1 overflow-x-auto"
      style={{
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >

      {[
        <TodaysGoalWidget streak={streak} dailyGoalPages={dailyGoalPages} />,
        <StudyStreakWidget streak={streak} />,
        <XpProgressWidget />,
      ].map((card, i) => (
        <div
          key={i}
          className="shrink-0"
          style={{
            // Show ~85% of first card + peek of the second — same as Duolingo streak row
            width: 'calc((100vw - 2rem - 0.75rem) * 0.88)',
            scrollSnapAlign: 'start',
          }}
        >
          {card}
        </div>
      ))}
      {/* Right breathing room so last card can fully snap */}
      <div className="shrink-0 w-4" aria-hidden />
    </div>

    {/* sm+: plain 3-col grid (no change from original) ----------------------- */}
    <div className="hidden sm:grid sm:grid-cols-3 gap-3">
      <TodaysGoalWidget streak={streak} dailyGoalPages={dailyGoalPages} />
      <StudyStreakWidget streak={streak} />
      <XpProgressWidget />
    </div>
  </>
)

// ── Library ──────────────────────────────────────────────────────────────────
const Library = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [pdfs, setPdfs] = useState([])
  const [streak, setStreak] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [search, setSearch] = useState('')
  const [planModal, setPlanModal] = useState(null)

  const load = async () => {
    try {
      const [pdfRes, streakRes] = await Promise.all([
        http.get('/pdf'),
        http.get('/streak').catch(() => ({ data: null })),
      ])
      setPdfs(pdfRes.data)
      setStreak(streakRes.data)
    } catch {
      toast.error('Could not load your library')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredPdfs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pdfs
    return pdfs.filter((p) => p.title?.toLowerCase().includes(q))
  }, [pdfs, search])

  const onPick = () => fileInputRef.current?.click()

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Please choose a PDF file'); return }

    setUploading(true)
    setUploadPct(0)
    try {
      const { renderFirstPageThumbnail } = await import('../lib/pdfjsSetup')
      const thumbBlob = await renderFirstPageThumbnail(file)
      const form = new FormData()
      form.append('file', file)
      if (thumbBlob) form.append('thumbnail', thumbBlob, 'thumbnail.jpg')
      const { data } = await http.post('/pdf', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => setUploadPct(Math.round((evt.loaded / evt.total) * 100)),
      })
      toast.success('PDF uploaded')
      setPdfs((prev) => [data, ...prev])
      setPlanModal({ pdf: data, mode: 'post-upload' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onOpen = (pdf) => navigate(`/reader/${pdf._id}`)

  const onRename = async (pdf) => {
    const title = window.prompt('Rename PDF', pdf.title)
    if (!title || !title.trim() || title.trim() === pdf.title) return
    try {
      const { data } = await http.patch(`/pdf/${pdf._id}`, { title: title.trim() })
      setPdfs((list) => list.map((p) => (p._id === pdf._id ? data : p)))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed')
    }
  }

  const onDelete = async (pdf) => {
    if (!window.confirm(`Delete "${pdf.title}"? This also removes its highlights, notes and bookmarks.`)) return
    try {
      await http.delete(`/pdf/${pdf._id}`)
      setPdfs((list) => list.filter((p) => p._id !== pdf._id))
      toast.success('Deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  const onSetPlan = (pdf) => setPlanModal({ pdf, mode: 'edit' })

  const onPlanSave = (updatedPdf) => {
    setPdfs((list) => list.map((p) => (p._id === updatedPdf._id ? updatedPdf : p)))
    const mode = planModal?.mode
    setPlanModal(null)
    if (mode === 'post-upload') navigate(`/reader/${updatedPdf._id}`)
    else toast.success('Reading goal updated', { autoClose: 2000 })
  }

  const onPlanSkip = () => {
    const pdf = planModal?.pdf
    setPlanModal(null)
    if (planModal?.mode === 'post-upload' && pdf) navigate(`/reader/${pdf._id}`)
  }

  const dailyGoalPages = user?.settings?.dailyGoalPages ?? 20

  return (
    <div>
      {/* ── Continue Reading ─────────────────────────────────────────────── */}
      {!loading && <ContinueReadingCard pdf={pdfs[0]} onOpen={onOpen} />}

      {/* ── Stats cards: horizontal scroll on mobile, 3-col grid on sm+ ── */}
      {!loading && pdfs.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <StatsCarousel streak={streak} dailyGoalPages={dailyGoalPages} />
        </div>
      )}

      {/* ── Recent PDFs header + upload button ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-serif text-xl font-semibold text-ink">Recent PDFs</h2>
            {search.trim() && (
              <button
                onClick={() => setSearch('')}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline shrink-0"
              >
                View All →
              </button>
            )}
          </div>
          <p className="text-sm text-ink-soft mt-0.5">
            {search.trim()
              ? `${filteredPdfs.length} of ${pdfs.length} document${pdfs.length !== 1 ? 's' : ''}`
              : `${pdfs.length} document${pdfs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={onPick}
          disabled={uploading}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors shadow-soft shrink-0"
        >
          {uploading ? `Uploading… ${uploadPct}%` : '+ Upload PDF'}
        </button>
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={onFileSelected} />
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      {!loading && pdfs.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PDFs by title…"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-ink/[0.1] bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* ── PDF grid / carousel / states ────────────────────────────────── */}
      {loading ? (
        <div className="flex gap-4 overflow-hidden pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36 sm:w-44">
              <div className="aspect-[3/4] rounded-xl bg-ink/[0.05] animate-pulse" />
              <div className="h-3 mt-3 rounded bg-ink/[0.05] animate-pulse w-3/4" />
            </div>
          ))}
        </div>
      ) : pdfs.length === 0 ? (
        <div className="flex flex-col items-center text-center py-24 px-6 border border-dashed border-ink/15 rounded-2xl">
          <p className="font-serif text-xl font-semibold text-ink mb-1.5">Your shelf is empty</p>
          <p className="text-sm text-ink-soft max-w-sm mb-5">Upload a PDF to start highlighting, asking questions, and generating study material from it.</p>
          <button onClick={onPick} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
            Upload your first PDF
          </button>
        </div>
      ) : filteredPdfs.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-6 border border-dashed border-ink/15 rounded-2xl">
          <p className="text-sm text-ink-soft">No PDFs match "{search}"</p>
          <button onClick={() => setSearch('')} className="text-sm text-brand-700 font-medium hover:underline mt-2">Clear search</button>
        </div>
      ) : (
        <div
          className="pdf-carousel flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          onWheel={(e) => {
            if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) e.currentTarget.scrollLeft += e.deltaY
          }}
        >
          {filteredPdfs.map((pdf) => (
            <div key={pdf._id} className="shrink-0 w-36 sm:w-44" style={{ scrollSnapAlign: 'start' }}>
              <PdfCard pdf={pdf} onOpen={onOpen} onRename={onRename} onDelete={onDelete} onSetPlan={onSetPlan} />
            </div>
          ))}
          <div className="pointer-events-none shrink-0 w-8" aria-hidden />
        </div>
      )}

      {planModal && (
        <PlanModal
          pdf={planModal.pdf}
          mode={planModal.mode}
          onSave={onPlanSave}
          onSkip={onPlanSkip}
        />
      )}
    </div>
  )
}

export default Library
