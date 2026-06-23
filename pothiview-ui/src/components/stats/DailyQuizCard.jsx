import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, RotateCcw } from 'lucide-react'
import { toast } from 'react-toastify'
import http from '../../lib/http'
import { MCQView } from '../reader/StudyWidgets'

const todayStr = () => new Date().toISOString().slice(0, 10)
const CACHE_KEY = 'pv_daily_quiz'

const readCache = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    return raw && raw.date === todayStr() ? raw : null
  } catch { return null }
}
const writeCache = (payload) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, date: todayStr() })) } catch { /* ignore */ }
}

/**
 * DailyQuizCard
 *
 * One quiz a day, generated from whatever the person most recently read
 * (`pdf` — the same "Continue Reading" candidate used on the Library
 * dashboard). Reuses the existing /ai/mcq endpoint and MCQView component
 * the in-reader study tools already use, so the questions and the UI for
 * answering them are both proven, just repurposed here. Cached in
 * localStorage for the day so revisiting this page doesn't re-spend an
 * AI call or reshuffle the questions mid-attempt.
 */
const DailyQuizCard = ({ pdf }) => {
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(() => readCache())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cached = readCache()
    if (cached) setQuiz(cached)
  }, [pdf?._id])

  const generate = async () => {
    if (!pdf) return
    setLoading(true)
    try {
      const { data } = await http.post('/ai/mcq', { pdfId: pdf._id, page: pdf.lastPage, scope: 'page', count: 4 })
      const payload = { pdfId: pdf._id, pdfTitle: pdf.title, page: pdf.lastPage, data: data.data }
      writeCache(payload)
      setQuiz({ ...payload, date: todayStr() })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate today\'s quiz')
    } finally {
      setLoading(false)
    }
  }

  if (!pdf) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-ink/15 p-5 text-center">
        <Brain className="mx-auto text-ink/20 mb-2" size={26} />
        <p className="text-sm text-ink-soft">Open a PDF to unlock your daily quiz.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
          <Brain size={13} className="text-brand-600" /> Daily Quiz
        </p>
        {quiz && (
          <button onClick={generate} disabled={loading} className="text-[11px] font-medium text-brand-700 hover:underline flex items-center gap-1 disabled:opacity-50">
            <RotateCcw size={11} /> New set
          </button>
        )}
      </div>

      {!quiz ? (
        <div className="text-center py-4">
          <p className="text-sm text-ink-soft mb-3">4 quick questions from <span className="font-medium text-ink capitalize">{pdf.title}</span>, page {pdf.lastPage}.</p>
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {loading ? 'Building your quiz…' : 'Start today\'s quiz'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-ink-faint mb-3">From <span className="capitalize">{quiz.pdfTitle}</span>, page {quiz.page}</p>
          <MCQView data={quiz.data} />
          <button
            onClick={() => navigate(`/reader/${quiz.pdfId}?page=${quiz.page}`)}
            className="mt-3 text-xs text-brand-700 font-medium hover:underline"
          >
            Open this page in the reader →
          </button>
        </>
      )}
    </div>
  )
}

export default DailyQuizCard
