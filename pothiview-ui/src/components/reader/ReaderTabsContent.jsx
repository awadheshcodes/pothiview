export const HIGHLIGHT_COLORS = {
  yellow: { bg: '#FDE68A', text: '#78350F' },
  green: { bg: '#BBF7D0', text: '#14532D' },
  blue: { bg: '#BFDBFE', text: '#1E3A5F' },
  pink: { bg: '#FBCFE8', text: '#831843' },
}

export const HighlightsTab = ({ highlights, setPageNum, deleteHighlight }) => (
  <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-thin">
    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-2">{highlights.length} highlight{highlights.length !== 1 ? 's' : ''}</p>
    {highlights.length === 0 ? (
      <div className="flex flex-col items-center py-12 gap-2 text-center opacity-50">
        <p className="text-xs">Select text and tap a color to highlight</p>
      </div>
    ) : (
      highlights.map((h) => (
        <div
          key={h._id}
          className="rounded-xl p-3 border transition group cursor-pointer hover:shadow-soft"
          style={{ background: HIGHLIGHT_COLORS[h.color]?.bg + '40', borderColor: HIGHLIGHT_COLORS[h.color]?.bg }}
          onClick={() => setPageNum(h.page)}
        >
          <div className="flex justify-between items-start gap-2">
            <p className="text-xs leading-relaxed line-clamp-3 flex-1">"{h.selectedText}"</p>
            <button onClick={(e) => { e.stopPropagation(); deleteHighlight(h._id) }} className="opacity-0 group-hover:opacity-100 transition text-ink-faint hover:text-rose-500 shrink-0">✕</button>
          </div>
          <p className="text-[10px] opacity-50 mt-1">Page {h.page}</p>
        </div>
      ))
    )}
  </div>
)

export const NotesTab = ({ darkMode, noteAnchor, noteText, setNoteText, addNote, pageNum, notes, setPageNum, deleteNote }) => (
  <div className="flex flex-col flex-1 min-h-0">
    <div className={`p-3 border-b shrink-0 ${darkMode ? 'border-white/10' : 'border-ink/[0.06]'}`}>
      {noteAnchor && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-2 text-[10px] text-amber-700 line-clamp-2">"{noteAnchor.text}"</div>
      )}
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Write a note for this page…"
        rows={3}
        className={`w-full resize-none rounded-xl border px-3 py-2 text-xs outline-none transition placeholder-ink-faint ${darkMode ? 'bg-white/5 border-white/10' : 'bg-paper-dim border-ink/10 focus:border-brand-500'}`}
      />
      <button onClick={addNote} disabled={!noteText.trim()} className="mt-2 w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition disabled:opacity-40">
        Save note to page {pageNum}
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-thin">
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-1">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
      {notes.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-center opacity-50"><p className="text-xs">No notes yet</p></div>
      ) : (
        notes.map((n) => (
          <div key={n._id} className={`rounded-xl p-3 border transition group cursor-pointer hover:shadow-soft ${darkMode ? 'bg-white/5 border-white/10' : 'bg-amber-50 border-amber-100'}`} onClick={() => setPageNum(n.page)}>
            <div className="flex justify-between items-start">
              <p className="text-xs leading-relaxed flex-1">{n.note}</p>
              <button onClick={(e) => { e.stopPropagation(); deleteNote(n._id) }} className="opacity-0 group-hover:opacity-100 transition text-ink-faint hover:text-rose-500 shrink-0 ml-2">✕</button>
            </div>
            {n.selectedText && <p className="text-[10px] text-amber-700 italic mt-1 line-clamp-1">"{n.selectedText}"</p>}
            <p className="text-[10px] opacity-50 mt-1">Page {n.page}</p>
          </div>
        ))
      )}
    </div>
  </div>
)

export const BookmarksTab = ({ darkMode, bookmarks, pageNum, isBookmarked, toggleBookmark, setPageNum, deleteBookmark }) => (
  <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-thin">
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50">{bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}</p>
      <button onClick={toggleBookmark} className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition ${isBookmarked ? 'bg-amber-50 text-amber-600' : 'bg-paper-dim text-ink-soft hover:text-amber-600'}`}>
        {isBookmarked ? '★ Remove' : '☆ Bookmark'} p.{pageNum}
      </button>
    </div>
    {bookmarks.length === 0 ? (
      <div className="flex flex-col items-center py-12 gap-2 text-center opacity-50"><p className="text-xs">No bookmarks yet</p></div>
    ) : (
      [...bookmarks].sort((a, b) => a.page - b.page).map((bm) => (
        <div
          key={bm._id}
          className={`rounded-xl p-3 border cursor-pointer transition group hover:shadow-soft flex items-center justify-between ${pageNum === bm.page ? 'bg-brand-50 border-brand-200' : darkMode ? 'bg-white/5 border-white/10' : 'bg-paper-dim border-ink/[0.06]'}`}
          onClick={() => setPageNum(bm.page)}
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-500">★</span>
            <p className="text-xs font-medium">Page {bm.page}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); deleteBookmark(bm._id) }} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-500 transition">✕</button>
        </div>
      ))
    )}
  </div>
)
