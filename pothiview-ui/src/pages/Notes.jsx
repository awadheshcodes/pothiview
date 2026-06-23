import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Search, X } from 'lucide-react'
import http from '../lib/http'

const Notes = () => {
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    http.get('/reader/notes/all')
      .then(({ data }) => setNotes(data))
      .catch(() => toast.error('Could not load your notes'))
      .finally(() => setLoading(false))
  }, [])

  const onDelete = async (id) => {
    try {
      await http.delete(`/reader/note/${id}`)
      setNotes((list) => list.filter((n) => n._id !== id))
    } catch {
      toast.error('Could not delete note')
    }
  }

  // Global, instant note search — searches the note body, the highlighted
  // source text it's anchored to, and the parent PDF's title, all
  // client-side since the full list is already in memory.
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) =>
      n.note?.toLowerCase().includes(q) ||
      n.selectedText?.toLowerCase().includes(q) ||
      n.pdfId?.title?.toLowerCase().includes(q)
    )
  }, [notes, search])

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink mb-1">Your notes</h1>
      <p className="text-sm text-ink-soft mb-5">
        {search.trim()
          ? `${filteredNotes.length} of ${notes.length} note${notes.length !== 1 ? 's' : ''}`
          : `${notes.length} note${notes.length !== 1 ? 's' : ''} across your library`}
      </p>

      {!loading && notes.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your notes…"
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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-ink/[0.05] animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center text-center py-24 px-6 border border-dashed border-ink/15 rounded-2xl">
          <p className="font-serif text-xl font-semibold text-ink mb-1.5">No notes yet</p>
          <p className="text-sm text-ink-soft max-w-sm">Open a PDF and jot a note while you read — it'll show up here.</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-6 border border-dashed border-ink/15 rounded-2xl">
          <p className="text-sm text-ink-soft">No notes match "{search}"</p>
          <button onClick={() => setSearch('')} className="text-sm text-brand-700 font-medium hover:underline mt-2">
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {filteredNotes.map((n) => (
            <div key={n._id} className="bg-white border border-ink/[0.07] rounded-xl p-4 group">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => navigate(`/reader/${n.pdfId?._id}?page=${n.page}`)}
                  className="text-left flex-1"
                >
                  <p className="text-sm text-ink leading-relaxed">{n.note}</p>
                  {n.selectedText && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-2 inline-block italic">"{n.selectedText.slice(0, 120)}{n.selectedText.length > 120 ? '…' : ''}"</p>
                  )}
                  <p className="text-[11px] text-ink-faint mt-2">
                    {n.pdfId?.title ? <span className="capitalize">{n.pdfId.title}</span> : 'Untitled'} · page {n.page}
                  </p>
                </button>
                <button
                  onClick={() => onDelete(n._id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-500 transition text-xs shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notes
