import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import http from '../lib/http'
import '../lib/pdfjsSetup' // sets the pdf.js worker as a side effect
import PlanModal from '../components/PlanModal'
import PlanBadge from '../components/PlanBadge'
import BrandLink from '../components/BrandLink'
import { recordPdfOpened } from '../lib/installTracking'
import { useAuth } from '../lib/AuthContext'

import useViewport from '../hooks/useViewport'
import usePdfZoom from '../hooks/usePdfZoom'
import { computeGamification } from '../lib/gamification'
import { HIGHLIGHT_COLORS, HighlightsTab, NotesTab, BookmarksTab } from '../components/reader/ReaderTabsContent'
import { ProgressTab, XpPill } from '../components/reader/GamificationPanel'
import AiSlidePanel from '../components/reader/AiSlidePanel'
import BottomSheet from '../components/reader/BottomSheet'
import SidePanel from '../components/reader/SidePanel'
import FloatingAIButton from '../components/reader/FloatingAIButton'
import AchievementCenter from '../components/reader/AchievementCenter'
import MilestoneToast, { MILESTONES } from '../components/reader/MilestoneToast'
import ContinuousPdfList from '../components/reader/ContinuousPdfList'

// ── Page-turn animation variants ───────────────────────────────────────────
const pageVariants = {
  enter: (dir) => ({ x: dir > 0 ? 36 : dir < 0 ? -36 : 0, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -36 : dir < 0 ? 36 : 0, opacity: 0 }),
}

// ── Reader ──────────────────────────────────────────────────────────────
const Reader = () => {
  const { id: pdfId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const viewport = useViewport() // 'mobile' | 'tablet' | 'desktop'
  const isMobile = viewport === 'mobile'

  const [pdf, setPdf] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [numPages, setNumPages] = useState(null)
  const [pageNum, setPageNum] = useState(1)
  const [pageDirection, setPageDirection] = useState(0)

  // ── Zoom state — unified for both mobile (continuous) and desktop ─────────
  // usePdfZoom owns pinch + double-tap gesture detection. `scale` is used:
  //   - Mobile: passed to <ContinuousPdfList scale={scale}> as a CSS transform
  //   - Desktop: passed to <Page scale={scale}> as a render scale
  // Separated initial values: mobile starts at 1 (full-width), desktop at 1.15
  const {
    scale,
    setScale,
    resetZoom,
    zoomHandlers: pdfZoomHandlers,
  } = usePdfZoom({
    min: isMobile ? 1 : 0.6,
    max: 4,
    doubleTapScale: 2.2,
  })

  // Desktop-only initial scale (1.15 feels better than 100% on wide screens).
  // We set it once after mount, not on every render.
  const desktopScaleInitRef = useRef(false)
  useEffect(() => {
    if (!isMobile && !desktopScaleInitRef.current) {
      desktopScaleInitRef.current = true
      setScale(1.15)
    }
  }, [isMobile, setScale])

  const [darkMode, setDarkMode] = useState(() => user?.settings?.theme === 'dark')
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef(null)
  const continuousListRef = useRef(null)
  // While actively scrolling, the text layer (per-glyph DOM spans) is the
  // most expensive part of each page render. Dropping it during scroll and
  // restoring it ~150ms after scroll settles keeps continuous scroll smooth
  // on mid-range phones without losing text selection once the user stops.
  const [isFastScrolling, setIsFastScrolling] = useState(false)
  const fastScrollTimerRef = useRef(null)

  // Bottom sheet / AI panel open state lives here (rather than further down)
  // so the focus-mode logic below can reach it: per the "controls" contract,
  // the bottom sheet is treated as part of the control surface and must
  // appear/disappear in lockstep with the toolbars, never as an orphaned
  // panel floating over a chrome-less reader.
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  // ── Focus / Immersive Reading Mode ───────────────────────────────────
  // On mobile, toolbars (top + bottom) and the bottom sheet/AI panel all
  // hide automatically. A single tap reveals them, then they auto-hide
  // after 3 seconds of inactivity. Scrolling hides them immediately.
  // Every hide path below funnels through hideControls() so the bottom
  // sheet can never be left open while the rest of the chrome is hidden.
  const [focusMode, setFocusMode] = useState(true) // start immersed
  const focusTimerRef = useRef(null)
  const isScrollingRef = useRef(false)
  const scrollTimerRef = useRef(null)

  const clearFocusTimer = () => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
  }

  // Single source of truth for "hide everything" — toolbars AND any open
  // bottom sheet / AI panel collapse together, so there's never a state
  // where a sheet is visible but its parent toolbar isn't (or vice versa).
  const hideControls = useCallback(() => {
    clearFocusTimer()
    setFocusMode(true)
    setSheetOpen(false)
    setAiPanelOpen(false)
  }, [])

  const exitFocusMode = useCallback((autoHide = true) => {
    clearFocusTimer()
    setFocusMode(false)
    if (autoHide) {
      // Auto-hide after 3 s of inactivity
      focusTimerRef.current = setTimeout(hideControls, 3000)
    }
  }, [hideControls])

  // Tap on the PDF area to toggle toolbars (Feature 2 §2).
  // Double-tap zoom is handled by usePdfZoom (onTouchStart). We suppress
  // the resulting click if two clicks arrive within 300 ms — that is the
  // browser's synthetic click pair for a double-tap, and we don't want the
  // toolbar to toggle on top of the zoom gesture.
  const lastClickRef = useRef(0)
  const handlePdfAreaTap = useCallback((e) => {
    if (e.target.closest('button, a, input, textarea, select')) return
    if (isScrollingRef.current) return

    const now = Date.now()
    if (now - lastClickRef.current < 300) {
      lastClickRef.current = 0
      return // swallow — this is the second click of a double-tap
    }
    lastClickRef.current = now

    if (focusMode) {
      exitFocusMode(true)
    } else {
      hideControls()
    }
  }, [focusMode, exitFocusMode, hideControls])

  // While scrolling: hide everything immediately (Feature 2 §5), and drop
  // the text layer for the duration of a fast scroll for perf (re-enabled
  // ~150ms after the scroll settles).
  const handleScrollStart = useCallback(() => {
    isScrollingRef.current = true
    hideControls()
    setIsFastScrolling(true)
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false
    }, 250)
    if (fastScrollTimerRef.current) clearTimeout(fastScrollTimerRef.current)
    fastScrollTimerRef.current = setTimeout(() => setIsFastScrolling(false), 150)
  }, [hideControls])

  // On desktop, toolbars are always visible (no focus mode)
  const toolbarsHidden = isMobile && focusMode

  useEffect(() => () => {
    clearFocusTimer()
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    if (fastScrollTimerRef.current) clearTimeout(fastScrollTimerRef.current)
  }, [])

  const [highlights, setHighlights] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [notes, setNotes] = useState([])
  const [selectedText, setSelectedText] = useState('')
  const [selectionPos, setSelectionPos] = useState(null)

  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiScope, setAiScope] = useState('page') // 'page' | 'document'

  const [sheetTab, setSheetTab] = useState('highlights')

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState('ai')

  const [noteText, setNoteText] = useState('')
  const [noteAnchor, setNoteAnchor] = useState(null)
  const [planModalOpen, setPlanModalOpen] = useState(false)

  const [streak, setStreak] = useState(null)
  const earnedBadgesRef = useRef(null)

  const sessionStartRef = useRef(Date.now())
  const initialPageSetRef = useRef(false)
  const didInitialScrollRef = useRef(false)

  const [pendingBadges, setPendingBadges] = useState([])

  const onPlanSave = (updatedPdf) => {
    setPdf((prev) => ({ ...prev, planStatus: updatedPdf.planStatus, planTargetDate: updatedPdf.planTargetDate, planPagesPerDay: updatedPdf.planPagesPerDay }))
    setPlanModalOpen(false)
    toast.success('Reading goal set', { autoClose: 2000 })
  }

  const openAi = useCallback(() => {
    if (isMobile) {
      setSheetOpen(false)
      setAiPanelOpen(true)
      exitFocusMode(false) // panel is a control surface — controls must be visible alongside it
    } else {
      setSidebarOpen(true)
      setSidebarTab('ai')
    }
  }, [isMobile, exitFocusMode])

  const openPanelTab = useCallback((tabId) => {
    if (isMobile) {
      setAiPanelOpen(false)
      setSheetTab(tabId)
      setSheetOpen(true)
      exitFocusMode(false) // same — sheet and toolbars stay in lockstep
    } else {
      setSidebarOpen(true)
      setSidebarTab(tabId)
    }
  }, [isMobile, exitFocusMode])

  const changePage = useCallback((updater, dir) => {
    setPageNum((prev) => {
      const target = typeof updater === 'function' ? updater(prev) : updater
      const clamped = Math.max(1, Math.min(numPages || 1, target))
      setPageDirection(dir !== undefined ? dir : (clamped > prev ? 1 : clamped < prev ? -1 : 0))
      if (isMobile) {
        // Continuous list: "changing the page" means scrolling to it.
        // pageNum itself still updates above (drives the page-number input,
        // bookmark-star state, etc.) — onCurrentPageChange will also fire
        // once the scroll lands and correct it if the estimate was off.
        continuousListRef.current?.scrollToPage(clamped)
      }
      return clamped
    })
  }, [numPages, isMobile])

  const jumpToPage = useCallback((target) => changePage(target, 0), [changePage])

  // ── Continuous scroll: current-page auto-detection (Mobile reader §4-5) ──
  // ContinuousPdfList reports whichever page has the most visible area.
  // This must NOT call scrollToPage (that's only for explicit jumps from
  // the bookmarks/highlights tabs or the page-number input) — it only
  // updates the pageNum state that drives the progress bar, the "page X of
  // Y" label, and the page tag saved on new highlights/notes/bookmarks.
  const handleCurrentPageChange = useCallback((detectedPage) => {
    setPageNum((prev) => (prev === detectedPage ? prev : detectedPage))
  }, [])

  // ── Load PDF + reader data ─────────────────────────────────
  useEffect(() => {
    if (!pdfId) return
    let cancelled = false

    const load = async () => {
      try {
        didInitialScrollRef.current = false
        const [pdfRes, hRes, bRes, nRes, aiRes, streakRes] = await Promise.all([
          http.get(`/pdf/${pdfId}`),
          http.get(`/reader/highlight/${pdfId}`),
          http.get(`/reader/bookmark/${pdfId}`),
          http.get(`/reader/note/${pdfId}`),
          http.get(`/ai/history/${pdfId}`),
          http.get('/streak').catch(() => ({ data: null })),
        ])
        if (cancelled) return

        setPdf(pdfRes.data)
        setHighlights(hRes.data || [])
        setBookmarks(bRes.data || [])
        setNotes(nRes.data || [])
        setAiMessages((aiRes.data || []).map((m) => ({
          role: m.role === 'user' ? 'user' : 'ai',
          type: m.kind === 'mcq' ? 'mcq' : m.kind === 'flashcards' ? 'flashcard' : undefined,
          content: m.content,
          data: m.data,
        })))
        setStreak(streakRes.data)
        resetZoom() // reset zoom on every new document

        const fromQuery = parseInt(searchParams.get('page'))
        setPageNum(fromQuery > 0 ? fromQuery : (pdfRes.data.lastPage || 1))
        initialPageSetRef.current = true
        recordPdfOpened()
        if (searchParams.get('panel') === 'ai') openAi()
      } catch (err) {
        if (!cancelled) setLoadError(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [pdfId]) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshStreak = useCallback(() => {
    http.get('/streak').then(({ data }) => setStreak(data)).catch(() => {})
  }, [])

  // ── Continuous scroll: land on the saved/queried page once it's known ──
  // The list always mounts starting from page 1; pageNum is set to
  // lastPage (or ?page=) before numPages arrives, so this fires exactly
  // once per document load, as soon as both are ready.
  useEffect(() => {
    if (!isMobile || !numPages || !initialPageSetRef.current || didInitialScrollRef.current) return
    didInitialScrollRef.current = true
    if (pageNum > 1) {
      // Defer one tick so the placeholder slots for all `numPages` pages
      // have committed to the DOM before we ask to scroll to one of them.
      requestAnimationFrame(() => continuousListRef.current?.scrollToPage(pageNum))
    }
  }, [isMobile, numPages, pageNum])

  // ── Save reading progress ──
  const saveProgress = useCallback(() => {
    if (!pdfId || !numPages || !initialPageSetRef.current) return
    const sessionMs = Date.now() - sessionStartRef.current
    sessionStartRef.current = Date.now()
    http.post('/reader/progress', { pdfId, lastPage: pageNum, totalPages: numPages, sessionTimeMs: sessionMs })
      .then(refreshStreak)
      .catch(() => {})
  }, [pdfId, pageNum, numPages, refreshStreak])

  useEffect(() => {
    const t = setTimeout(saveProgress, 1500)
    return () => clearTimeout(t)
  }, [pageNum, saveProgress])

  useEffect(() => () => saveProgress(), [saveProgress])

  // ── Text selection ──────────────────────────────────────────
  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text || text.length < 2) {
      setSelectionPos(null)
      setSelectedText('')
      return
    }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    setSelectedText(text)
    setSelectionPos({
      top: rect.top - (containerRect?.top || 0) - 52,
      left: rect.left - (containerRect?.left || 0) + rect.width / 2 - 90,
    })
    // Text selection — reveal toolbars temporarily
    if (isMobile) exitFocusMode(true)
  }, [isMobile, exitFocusMode])

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelect)
    document.addEventListener('touchend', handleTextSelect)
    return () => {
      document.removeEventListener('mouseup', handleTextSelect)
      document.removeEventListener('touchend', handleTextSelect)
    }
  }, [handleTextSelect])

  const clearSelection = () => {
    setSelectionPos(null)
    window.getSelection()?.removeAllRanges()
  }

  // ── Highlights ────────────────────────────────────────────
  const addHighlight = async (color) => {
    if (!selectedText) return
    try {
      const { data } = await http.post('/reader/highlight', { pdfId, page: pageNum, selectedText, color })
      setHighlights((h) => [...h, data])
      toast.success('Highlighted', { autoClose: 1200 })
    } catch {
      toast.error('Could not save highlight')
    }
    clearSelection()
  }

  const deleteHighlight = async (id) => {
    await http.delete(`/reader/highlight/${id}`).catch(() => {})
    setHighlights((h) => h.filter((x) => x._id !== id))
  }

  // ── Bookmarks ─────────────────────────────────────────────
  const isBookmarked = bookmarks.some((b) => b.page === pageNum)

  const toggleBookmark = async () => {
    try {
      const { data } = await http.post('/reader/bookmark', { pdfId, page: pageNum })
      if (data.removed) {
        setBookmarks((b) => b.filter((bm) => bm.page !== pageNum))
      } else {
        setBookmarks((b) => [...b, data])
      }
    } catch {
      toast.error('Could not update bookmark')
    }
  }

  const deleteBookmark = async (id) => {
    await http.delete(`/reader/bookmark/${id}`).catch(() => {})
    setBookmarks((b) => b.filter((x) => x._id !== id))
  }

  // ── Notes ─────────────────────────────────────────────────
  const addNote = async () => {
    if (!noteText.trim()) return
    try {
      const { data } = await http.post('/reader/note', {
        pdfId, page: pageNum, selectedText: noteAnchor?.text || '', note: noteText.trim(),
      })
      setNotes((n) => [...n, data])
      setNoteText('')
      setNoteAnchor(null)
      toast.success('Note saved', { autoClose: 1200 })
    } catch {
      toast.error('Could not save note')
    }
  }

  const deleteNote = async (id) => {
    await http.delete(`/reader/note/${id}`).catch(() => {})
    setNotes((n) => n.filter((x) => x._id !== id))
  }

  // ── AI actions ────────────────────────────────────────────
  const aiBottomRef = useRef(null)
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [aiMessages, aiLoading])

  const runAi = async (path, body, fallbackUserLabel) => {
    openAi()
    setAiLoading(true)
    try {
      const { data } = await http.post(`/ai/${path}`, body)
      const userMsg = { role: 'user', content: data.userMessage?.content || fallbackUserLabel }
      const aiMsg = path === 'mcq'
        ? { role: 'ai', type: 'mcq', data: data.data }
        : path === 'flashcards'
        ? { role: 'ai', type: 'flashcard', data: data.data }
        : { role: 'ai', content: data.answer }
      setAiMessages((m) => [...m, userMsg, aiMsg])
      refreshStreak()
    } catch (err) {
      const msg = err.response?.data?.message || 'AI is unavailable right now. Please try again.'
      setAiMessages((m) => [...m, { role: 'user', content: fallbackUserLabel }, { role: 'error', content: msg }])
    } finally {
      setAiLoading(false)
      clearSelection()
    }
  }

  const explainSelection = () => {
    const text = selectedText
    runAi('ask', { pdfId, page: pageNum, selectedText: text, question: 'Explain this in detail' }, `Explain: "${text.slice(0, 100)}"`)
  }

  const runSummary = () => runAi('summary', { pdfId, page: pageNum, scope: aiScope }, aiScope === 'document' ? 'Summarize the whole document' : `Summarize page ${pageNum}`)
  const runMcq = () => runAi('mcq', { pdfId, page: pageNum, scope: aiScope, count: 5 }, aiScope === 'document' ? 'Generate MCQs for the whole document' : `Generate MCQs for page ${pageNum}`)
  const runFlashcards = () => runAi('flashcards', { pdfId, page: pageNum, scope: aiScope, count: 8 }, aiScope === 'document' ? 'Generate flashcards for the whole document' : `Generate flashcards for page ${pageNum}`)

  const sendChatMessage = async () => {
    if (!aiInput.trim() || aiLoading) return
    const question = aiInput.trim()
    setAiInput('')
    await runAi('ask', { pdfId, page: pageNum, scope: aiScope, question }, question)
  }

  // ── Fullscreen + keyboard shortcuts ─────────────────────────
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') changePage((p) => p + 1, 1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') changePage((p) => p - 1, -1)
      if (e.key === 'b') toggleBookmark()
      if (e.key === 'Escape') exitFocusMode(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [numPages, pageNum]) // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = numPages ? Math.round((pageNum / numPages) * 100) : 0

  // ── PothiXP: derive XP/level/badges ──────────────────────────────────────
  const gamification = useMemo(() => computeGamification({
    pageNum,
    progressPct,
    highlights: highlights.length,
    notes: notes.length,
    bookmarks: bookmarks.length,
    aiMessages,
    streakCurrent: streak?.current || 0,
    streakLongest: streak?.longest || 0,
  }), [pageNum, progressPct, highlights.length, notes.length, bookmarks.length, aiMessages, streak])

  useEffect(() => {
    const current = new Set(gamification.earnedBadgeIds)
    if (earnedBadgesRef.current === null) {
      earnedBadgesRef.current = current
      return
    }
    const newlyEarned = gamification.badges.filter((b) => b.earned && !earnedBadgesRef.current.has(b.id))
    if (newlyEarned.length > 0) {
      setPendingBadges((prev) => {
        const prevIds = new Set(prev.map((b) => b.id))
        return [...prev, ...newlyEarned.filter((b) => !prevIds.has(b.id))]
      })
      newlyEarned.forEach((b) => {
        http.post('/stats/activity/achievement', {
          badgeId: b.id, badgeLabel: b.label, badgeIcon: b.icon, pdfId,
        }).catch(() => {})
      })
    }
    earnedBadgesRef.current = current
  }, [gamification.earnedBadgeIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Feature 6: Reading milestone tracking ─────────────────────────────────
  const seenMilestonesRef = useRef(null)

  useEffect(() => {
    const aiQuestions = aiMessages.filter((m) => m.role === 'user').length
    const milestoneStats = {
      pageNum,
      progressPct,
      highlights: highlights.length,
      notes: notes.length,
      aiQuestions,
      streakCurrent: streak?.current || 0,
    }

    const current = new Set(MILESTONES.filter((m) => m.test(milestoneStats)).map((m) => m.id))

    if (seenMilestonesRef.current === null) {
      // Baseline on first load — don't toast things already achieved
      seenMilestonesRef.current = current
      return
    }

    MILESTONES.forEach((milestone) => {
      if (current.has(milestone.id) && !seenMilestonesRef.current.has(milestone.id)) {
        seenMilestonesRef.current = new Set([...seenMilestonesRef.current, milestone.id])
        // Show compact milestone toast
        toast(<MilestoneToast milestone={milestone} />, {
          autoClose: 2500,
          className: 'milestone-toast',
          position: 'bottom-right',
          icon: false,
          style: {
            background: '#fff',
            border: '1px solid rgba(47,122,96,0.15)',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
            padding: '10px 14px',
            minWidth: '240px',
          },
        })
      }
    })
  }, [pageNum, progressPct, highlights.length, notes.length, aiMessages.length, streak?.current]) // eslint-disable-line react-hooks/exhaustive-deps

  const aiPanelProps = {
    pdf, aiScope, setAiScope, runSummary, runMcq, runFlashcards,
    aiLoading, aiMessages, aiBottomRef, aiInput, setAiInput, sendChatMessage,
    setPlanModalOpen,
  }
  const highlightsTabProps = { highlights, setPageNum: jumpToPage, deleteHighlight }
  const notesTabProps = { noteAnchor, noteText, setNoteText, addNote, pageNum, notes, setPageNum: jumpToPage, deleteNote }
  const bookmarksTabProps = { bookmarks, pageNum, isBookmarked, toggleBookmark, setPageNum: jumpToPage, deleteBookmark }
  const progressTabProps = { gamification, streak }

  const sheetTabs = [
    { id: 'ai', label: 'AI', icon: 'Sparkles' },
    { id: 'highlights', label: 'Marks', icon: 'Highlighter', count: highlights.length },
    { id: 'notes', label: 'Notes', icon: 'NotebookPen', count: notes.length },
    { id: 'bookmarks', label: 'Saved', icon: 'Bookmark', count: bookmarks.length },
    { id: 'progress', label: 'Progress', icon: 'Trophy' },
  ]

  const sidebarWidth = viewport === 'tablet' ? '25%' : '340px'
  const showFab = !isMobile && !sidebarOpen
  const fabBottomOffset = 24

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper gap-4 p-6">
        <p className="text-ink font-semibold text-lg">Failed to open PDF</p>
        <div className="bg-white border border-rose-200 rounded-xl p-4 max-w-md w-full text-xs font-mono text-rose-700 space-y-1.5">
          <p className="font-semibold text-rose-600 mb-2">Debug info</p>
          <p><span className="text-ink-soft">ebookId:</span> {pdfId || <em className="text-rose-400">missing</em>}</p>
          <p>
            <span className="text-ink-soft">pdfUrl:</span>{' '}
            {pdf?.url
              ? <span className="break-all text-ink">{pdf.url}</span>
              : <em className="text-rose-400">missing — presigned URL was not returned by API</em>}
          </p>
          <p>
            <span className="text-ink-soft">s3Key:</span>{' '}
            {pdf?.s3Key
              ? <span className="break-all text-ink">{pdf.s3Key}</span>
              : <em className="text-rose-400">missing — was s3Key saved at upload?</em>}
          </p>
          {pdf?.s3Key && pdf.s3Key.includes('/undefined/') && (
            <p className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-700 mt-2">
              ⚠ s3Key contains "/undefined/" — PDF_FOLDER env var was not set on the server at upload time.
            </p>
          )}
        </div>
        <p className="text-xs text-ink-soft">Check browser console and server logs for more details.</p>
        <button onClick={() => navigate('/library')} className="text-brand-700 text-sm font-medium hover:underline">
          ← Back to library
        </button>
      </div>
    )
  }

  // ── Toolbar animation (Feature 2) ─────────────────────────────────────────
  const toolbarVariants = {
    visible: { opacity: 1, y: 0, pointerEvents: 'auto' },
    hidden:  { opacity: 0, y: -8, pointerEvents: 'none' },
  }
  const bottomToolbarVariants = {
    visible: { opacity: 1, y: 0, pointerEvents: 'auto' },
    hidden:  { opacity: 0, y: 8, pointerEvents: 'none' },
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 overflow-hidden ${isMobile ? '' : 'flex flex-col'}`}
      style={{ background: darkMode ? '#15130F' : '#F2EDE2' }}
    >
      {/* ── Top toolbar ──────────────────────────────────────────────────
          Desktop: normal flex row, always visible, reserves its own height.
          Mobile: floats as a translucent overlay ABOVE the PDF (not a layout
          sibling) so that hiding it during focus mode gives the page back
          the FULL screen height — not just an invisible bar-shaped gap. */}
      <motion.div
        variants={toolbarVariants}
        animate={toolbarsHidden ? 'hidden' : 'visible'}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className={`flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2.5 border-b backdrop-blur-md ${
          isMobile ? 'absolute top-0 left-0 right-0 z-30' : 'shrink-0'
        } ${
          darkMode ? 'bg-[#1C1914]/90 border-white/10 text-paper-dark' : 'bg-white/90 border-ink/[0.07] text-ink'
        }`}
        style={{ willChange: 'opacity, transform', paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 6px)' : undefined }}
      >
        <BrandLink size={22} withWordmark={false} className="hidden sm:inline-flex shrink-0" />

        <button
          onClick={() => navigate('/library')}
          className="reader-touch-target flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg hover:bg-ink/[0.06] transition shrink-0"
          title="Back to library"
        >←</button>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate capitalize leading-tight">{pdf?.title || 'Loading…'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 h-1 rounded-full bg-ink/10 overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-[10px] opacity-50 shrink-0 tabular-nums">{pageNum}/{numPages || '…'}</span>
          </div>
        </div>

        <div className="hidden sm:block">
          <XpPill gamification={gamification} streakCurrent={streak?.current || 0} darkMode={darkMode} onOpen={() => openPanelTab('progress')} />
        </div>

        <div className="flex items-center gap-0 shrink-0">
          <button
            onClick={() => changePage((p) => p - 1, -1)}
            disabled={pageNum <= 1}
            className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-ink/[0.06] disabled:opacity-30 transition text-lg sm:text-base"
          >‹</button>
          <input
            type="number" value={pageNum} min={1} max={numPages || 1}
            onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= (numPages || 1)) jumpToPage(v) }}
            className={`w-10 sm:w-11 text-center text-xs font-medium rounded-lg border py-1 ${darkMode ? 'bg-white/10 border-white/15' : 'bg-paper-dim border-ink/10'}`}
          />
          <button
            onClick={() => changePage((p) => p + 1, 1)}
            disabled={pageNum >= (numPages || 1)}
            className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-ink/[0.06] disabled:opacity-30 transition text-lg sm:text-base"
          >›</button>
        </div>

        <div className="hidden md:flex items-center gap-1 shrink-0">
          <button onClick={() => setScale((s) => Math.max(0.6, +(s - 0.15).toFixed(2)))} className="w-8 h-8 rounded-lg hover:bg-ink/[0.06] transition">−</button>
          <span className="text-xs w-10 text-center opacity-70">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(4, +(s + 0.15).toFixed(2)))} className="w-8 h-8 rounded-lg hover:bg-ink/[0.06] transition">+</button>
        </div>

        {/* Mobile zoom indicator — only visible when zoomed in; tap to reset */}
        {isMobile && scale > 1.05 && (
          <button
            onClick={resetZoom}
            className={`flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-semibold transition shrink-0 ${
              darkMode ? 'bg-white/15 text-white' : 'bg-ink/[0.08] text-ink'
            }`}
            title="Reset zoom"
          >
            {Math.round(scale * 100)}% ×
          </button>
        )}

        <div className="flex items-center gap-0 sm:gap-1 shrink-0">
          <button
            onClick={toggleBookmark}
            className={`w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition ${isBookmarked ? 'text-amber-500' : 'hover:bg-ink/[0.06]'}`}
            title="Bookmark page (b)"
          >
            {isBookmarked ? '★' : '☆'}
          </button>
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-ink/[0.06] transition"
            title="Dark mode"
          >{darkMode ? '☼' : '☾'}</button>
          <button
            onClick={() => setPlanModalOpen(true)}
            className={`hidden md:flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-semibold transition shrink-0 ${pdf?.planStatus ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'hover:bg-ink/[0.06] text-ink-soft'}`}
            title="Reading goal"
          >
            {pdf?.planStatus ? <PlanBadge planStatus={pdf.planStatus} size="sm" /> : '◎ Set goal'}
          </button>
          <button onClick={toggleFullscreen} className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-ink/[0.06] transition" title="Fullscreen">{fullscreen ? '⤡' : '⤢'}</button>
        </div>
      </motion.div>

      {/* Main layout — full-bleed on mobile; the toolbars float on top of it */}
      <div className={`flex overflow-hidden ${isMobile ? 'absolute inset-0' : 'flex-1'}`}>
        {/* PDF viewer — 100% of the screen on mobile, edge-to-edge */}
        <div
          className="flex-1 overflow-y-auto flex py-0 sm:py-6 px-0 sm:px-4 relative scroll-thin reader-scroll-area"
          style={{
            background: darkMode ? '#1C1914' : '#F2EDE2',
            justifyContent: 'center',
            alignItems: isMobile ? 'flex-start' : 'center',
            // When zoomed on mobile we need horizontal scroll too.
            overflowX: isMobile && scale > 1.01 ? 'auto' : 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            // 'pan-x pan-y' lets our JS gesture handlers (onTouchStart/Move/End)
            // receive all touch events while still allowing scroll. We manage
            // pinch detection ourselves (usePdfZoom) so we don't rely on the
            // browser's viewport pinch-zoom, which is blocked in most iOS PWAs.
            touchAction: isMobile ? 'pan-x pan-y' : 'pan-y',
          }}
          onScroll={isMobile ? handleScrollStart : undefined}
          onClick={handlePdfAreaTap}
          {...(isMobile ? pdfZoomHandlers : {})}
        >
          {selectionPos && selectedText && (
            <div
              className="absolute z-40 bg-white rounded-2xl shadow-lift border border-ink/[0.07] p-2 flex gap-1.5"
              style={{ top: selectionPos.top, left: Math.max(8, selectionPos.left) }}
            >
              {Object.entries(HIGHLIGHT_COLORS).map(([key, val]) => (
                <button key={key} onClick={() => addHighlight(key)} className="w-6 h-6 rounded-full border-2 border-white shadow hover:scale-125 transition-transform" style={{ background: val.bg }} title={`Highlight ${key}`} />
              ))}
              <div className="w-px bg-ink/10 mx-0.5" />
              <button
                onClick={() => { setNoteAnchor({ text: selectedText, page: pageNum }); openPanelTab('notes'); setSelectionPos(null) }}
                className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition text-sm"
                title="Add note"
              >✎</button>
              <button onClick={explainSelection} className="w-7 h-7 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition text-sm" title="Ask AI">✦</button>
            </div>
          )}

          {pdf?.url ? (
            <div
              className={`${darkMode ? 'filter invert' : ''} ${isMobile ? 'w-full' : 'overflow-hidden shadow-lift rounded-lg'}`}
              // Mobile reader §9-10: full device width, no side margins, no
              // max-width — this wrapper carries zero constraints on mobile.
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <Document
                file={pdf.url}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                onLoadError={(err) => {
                  console.error('[Reader] react-pdf load error:', err)
                  console.error('[Reader] pdfUrl:', pdf?.url)
                  console.error('[Reader] s3Key:', pdf?.s3Key)
                  console.error('[Reader] ebookId:', pdfId)
                  toast.error('Failed to load PDF')
                  setLoadError(true)
                }}
                loading={
                  <div className="w-64 h-80 flex items-center justify-center bg-white rounded-lg">
                    <div className="w-7 h-7 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
                  </div>
                }
              >
                {isMobile ? (
                  // ── Mobile: continuous vertical scroll through every page,
                  // Kindle/Google-Books style — see ContinuousPdfList for the
                  // virtualization + current-page-detection architecture.
                  numPages ? (
                    <ContinuousPdfList
                      ref={continuousListRef}
                      numPages={numPages}
                      onCurrentPageChange={handleCurrentPageChange}
                      renderTextLayer={!isFastScrolling}
                      scale={scale}
                    />
                  ) : null
                ) : (
                  // ── Desktop / tablet: unchanged — one page mounted at a
                  // time, page-turn buttons, slide animation between pages.
                  <AnimatePresence mode="wait" custom={pageDirection} initial={false}>
                    <motion.div
                      key={pageNum}
                      custom={pageDirection}
                      variants={pageVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="reader-page-wrap"
                    >
                      <Page
                        pageNumber={pageNum}
                        scale={scale}
                        renderTextLayer
                        renderAnnotationLayer={false}
                      />
                    </motion.div>
                  </AnimatePresence>
                )}
              </Document>
            </div>
          ) : pdf && (
            <div className="w-64 h-80 flex flex-col items-center justify-center bg-white rounded-lg gap-3 border border-rose-200">
              <p className="text-rose-500 font-medium text-sm">PDF URL missing</p>
              <p className="text-xs text-ink-soft text-center px-4">
                The server did not return a viewing URL.<br />
                s3Key: <code className="font-mono text-xs">{pdf.s3Key || 'none'}</code>
              </p>
            </div>
          )}

          {/* Page-turn arrows — desktop/tablet only; the mobile reader has
              no page-turn concept, navigation is purely by scrolling. */}
          <button
            onClick={() => changePage((p) => p - 1, -1)}
            disabled={pageNum <= 1}
            className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lift items-center justify-center hover:shadow-lift disabled:opacity-0 z-20 border border-ink/[0.07] transition-opacity"
          >‹</button>
          <button
            onClick={() => changePage((p) => p + 1, 1)}
            disabled={pageNum >= (numPages || 1)}
            style={{ right: sidebarOpen ? 340 + 16 : 16 }}
            className="hidden lg:flex fixed top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white items-center justify-center hover:shadow-lift disabled:opacity-0 z-20 border border-ink/[0.07] shadow-lift transition-[opacity,right]"
          >›</button>
        </div>

        {/* Tablet / desktop inline side panel */}
        <SidePanel
          open={sidebarOpen && !isMobile}
          width={sidebarWidth}
          onToggle={() => setSidebarOpen((o) => !o)}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          darkMode={darkMode}
          aiProps={aiPanelProps}
          highlightsProps={highlightsTabProps}
          notesProps={notesTabProps}
          bookmarksProps={bookmarksTabProps}
          progressProps={progressTabProps}
        />
      </div>

      {/* Mobile: bottom sheet + mini nav — both are part of the "controls"
          surface and hide/show in lockstep with the top toolbar via
          toolbarsHidden / hideControls, never independently. */}
      {isMobile && (
        <>
          {/* Mini bottom nav — visible whenever controls are visible, so the
              user always has a way to open panels. Replaced by the sheet's
              own tab bar while a sheet/AI panel is open. */}
          <AnimatePresence>
            {!sheetOpen && !aiPanelOpen && (
              <motion.div
                variants={bottomToolbarVariants}
                animate={toolbarsHidden ? 'hidden' : 'visible'}
                initial="hidden"
                exit="hidden"
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className={`absolute bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 border-t backdrop-blur-md ${
                  darkMode ? 'bg-[#1C1914]/90 border-white/10' : 'bg-white/90 border-ink/[0.07]'
                }`}
                style={{
                  paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)',
                  paddingTop: '6px',
                  willChange: 'opacity, transform',
                }}
              >
                {sheetTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'ai') {
                        setSheetOpen(false)
                        setAiPanelOpen(true)
                      } else {
                        setSheetTab(tab.id)
                        setSheetOpen(true)
                      }
                      exitFocusMode(false)
                    }}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                      darkMode ? 'text-white/60 hover:text-white' : 'text-ink-faint hover:text-ink'
                    }`}
                  >
                    <span className="text-lg">{
                      tab.id === 'ai' ? '✦' :
                      tab.id === 'highlights' ? '🖊' :
                      tab.id === 'notes' ? '📝' :
                      tab.id === 'bookmarks' ? '🔖' :
                      '🏆'
                    }</span>
                    <span className="text-[9px] font-medium">{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`text-[9px] font-bold -mt-0.5 ${darkMode ? 'text-white/50' : 'text-brand-600'}`}>{tab.count}</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <BottomSheet
            open={sheetOpen}
            onOpenChange={(v) => {
              setSheetOpen(v)
              if (!v) exitFocusMode(true)
            }}
            tabs={sheetTabs}
            activeTab={sheetTab}
            onTabChange={setSheetTab}
            darkMode={darkMode}
            onAiOpen={() => {
              setSheetOpen(false)
              setAiPanelOpen(true)
            }}
          >
            {sheetTab === 'highlights' && <HighlightsTab {...highlightsTabProps} />}
            {sheetTab === 'notes' && <NotesTab darkMode={darkMode} {...notesTabProps} />}
            {sheetTab === 'bookmarks' && <BookmarksTab darkMode={darkMode} {...bookmarksTabProps} />}
            {sheetTab === 'progress' && <ProgressTab darkMode={darkMode} {...progressTabProps} />}
          </BottomSheet>
        </>
      )}

      {/* Mobile: dedicated AI slide-up panel */}
      {isMobile && (
        <AiSlidePanel
          open={aiPanelOpen}
          onClose={() => {
            setAiPanelOpen(false)
            exitFocusMode(true)
          }}
          darkMode={darkMode}
          {...aiPanelProps}
        />
      )}

      {/* Floating AI button — tablet/desktop only */}
      <AnimatePresence>
        {showFab && (
          <FloatingAIButton open={isMobile ? aiPanelOpen : sidebarOpen} onClick={openAi} bottomOffset={fabBottomOffset} />
        )}
      </AnimatePresence>

      {planModalOpen && pdf && (
        <PlanModal
          pdf={pdf}
          mode="edit"
          onSave={onPlanSave}
          onSkip={() => setPlanModalOpen(false)}
        />
      )}

      {/* Grouped achievement notification */}
      <AchievementCenter
        newBadges={pendingBadges}
        onDismiss={() => setPendingBadges([])}
      />
    </div>
  )
}

export default Reader
