import { useState } from 'react'
import http from '../lib/http'

// Days-to-date helper: returns a Date at end-of-day N days from now.
const daysFromNow = (n) => {
  const d = new Date(Date.now() + n * 86_400_000)
  d.setHours(23, 59, 59, 999)
  return d
}

const fmt = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const PRESETS = [
  { label: '7 Days', mode: '7', date: daysFromNow(7) },
  { label: '15 Days', mode: '15', date: daysFromNow(15) },
  { label: '30 Days', mode: '30', date: daysFromNow(30) },
]

/**
 * PlanModal
 *
 * Props:
 *   pdf        – the full pdf object (needs totalPages + lastPage)
 *   onSave(updatedPdf) – called with the server response after plan is set
 *   onSkip()   – called when the user dismisses without setting a plan
 *   mode       – 'post-upload' (shows a friendly "set a goal" header) or 'edit'
 */
const PlanModal = ({ pdf, onSave, onSkip, mode = 'post-upload' }) => {
  const [selected, setSelected] = useState(null) // '7' | '15' | '30' | 'custom'
  const [customDate, setCustomDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const pagesLeft = Math.max(1, (pdf?.totalPages || 1) - (pdf?.lastPage || 1) + 1)

  // Preview the pages-per-day figure for whichever option is hovered/selected.
  const previewPpd = (mode, customDateStr) => {
    let targetMs
    if (mode === 'custom') {
      if (!customDateStr) return null
      targetMs = new Date(customDateStr).getTime() + 86_400_000 - 1 // end of that day
    } else {
      const preset = PRESETS.find((p) => p.mode === mode)
      if (!preset) return null
      targetMs = preset.date.getTime()
    }
    const daysTotal = Math.max(1, Math.ceil((targetMs - Date.now()) / 86_400_000))
    return Math.max(1, Math.ceil(pagesLeft / daysTotal))
  }

  const ppd = previewPpd(selected, customDate)

  const handleSave = async () => {
    if (!selected) { setError('Please pick a target.'); return }
    if (selected === 'custom' && !customDate) { setError('Please choose a date.'); return }
    setSaving(true)
    setError('')
    try {
      const body = { mode: selected, ...(selected === 'custom' ? { targetDate: customDate } : {}) }
      const { data } = await http.post(`/pdf/${pdf._id}/plan`, body)
      onSave(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save plan. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lift border border-ink/[0.06] overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="bg-brand-600 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-200 mb-1">
            {mode === 'post-upload' ? 'PothiPlan' : 'Update reading goal'}
          </p>
          <h2 className="font-serif text-xl font-semibold text-white leading-snug">
            {mode === 'post-upload'
              ? 'When do you want to finish?'
              : `Reading goal for "${pdf?.title}"`}
          </h2>
          <p className="text-sm text-brand-200 mt-1.5">
            {pdf?.totalPages} pages · {pagesLeft} remaining
          </p>
        </div>

        {/* Options */}
        <div className="p-5 space-y-2.5">
          {PRESETS.map((p) => {
            const active = selected === p.mode
            const ppd = previewPpd(p.mode, '')
            return (
              <button
                key={p.mode}
                onClick={() => { setSelected(p.mode); setCustomDate('') }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left
                  ${active
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink/[0.08] bg-paper-dim hover:border-brand-300'}`}
              >
                <div>
                  <p className={`font-semibold text-sm ${active ? 'text-brand-700' : 'text-ink'}`}>{p.label}</p>
                  <p className="text-xs text-ink-faint mt-0.5">Finish by {fmt(p.date)}</p>
                </div>
                {ppd && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${active ? 'bg-brand-100 text-brand-700' : 'bg-ink/[0.05] text-ink-soft'}`}>
                    ~{ppd} pg/day
                  </span>
                )}
              </button>
            )
          })}

          {/* Custom date */}
          <button
            onClick={() => setSelected('custom')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left
              ${selected === 'custom'
                ? 'border-brand-500 bg-brand-50'
                : 'border-ink/[0.08] bg-paper-dim hover:border-brand-300'}`}
          >
            <div className="flex-1">
              <p className={`font-semibold text-sm ${selected === 'custom' ? 'text-brand-700' : 'text-ink'}`}>
                Custom date
              </p>
              {selected === 'custom' ? (
                <input
                  type="date"
                  min={today}
                  value={customDate}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="mt-1.5 text-xs border border-brand-200 rounded-lg px-2 py-1 text-ink outline-none focus:border-brand-500 bg-white"
                />
              ) : (
                <p className="text-xs text-ink-faint mt-0.5">Choose any date</p>
              )}
            </div>
            {selected === 'custom' && ppd && (
              <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-brand-100 text-brand-700 ml-3 shrink-0">
                ~{ppd} pg/day
              </span>
            )}
          </button>

          {error && <p className="text-xs text-rose-500 px-1">{error}</p>}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-xl border border-ink/10 text-sm font-medium text-ink-soft hover:bg-paper-dim transition"
          >
            {mode === 'post-upload' ? 'Skip for now' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selected}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-medium transition"
          >
            {saving ? 'Saving…' : 'Set goal'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlanModal
