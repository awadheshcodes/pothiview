import { BookOpen, ArrowRight } from 'lucide-react'
import PlanBadge from '../PlanBadge'

const PdfGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-ink-faint">
    <path d="M6 2.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 20V4A1.5 1.5 0 0 1 5.5 2.5H6Z" stroke="currentColor" strokeWidth="1.4" />
    <path d="M14 2.5V6a1 1 0 0 0 1 1h3.5" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

/**
 * ContinueReadingCard
 *
 * The Library dashboard's first section — one-tap resume on whatever was
 * opened most recently. `pdfs` is already sorted by lastOpenedAt desc
 * (see GET /pdf), so the most recent document is simply pdfs[0].
 */
const ContinueReadingCard = ({ pdf, onOpen }) => {
  if (!pdf) return null

  const progress = pdf.totalPages > 1 ? Math.round((pdf.lastPage / pdf.totalPages) * 100) : 0
  const pagesLeft = Math.max(0, (pdf.totalPages || 0) - (pdf.lastPage || 0))

  return (
    <button
      onClick={() => onOpen(pdf)}
      className="w-full text-left bg-white rounded-2xl border border-ink/[0.07] shadow-soft hover:shadow-lift transition-shadow p-4 sm:p-5 flex items-center gap-4 sm:gap-5 mb-3 sm:mb-4"
    >
      <div className="w-16 h-20 sm:w-20 sm:h-26 rounded-xl bg-paper-dim border border-ink/[0.08] overflow-hidden flex items-center justify-center shrink-0">
        {pdf.thumbnailUrl ? (
          <img src={pdf.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <PdfGlyph />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 mb-1 flex items-center gap-1.5">
          <BookOpen size={12} /> Continue Reading
        </p>
        <p className="font-serif text-lg sm:text-xl font-semibold text-ink leading-snug capitalize line-clamp-1">{pdf.title}</p>
        {pdf.planStatus && (
          <div className="mt-1"><PlanBadge planStatus={pdf.planStatus} size="sm" /></div>
        )}
        <p className="text-xs text-ink-soft mt-1.5">
          Page {pdf.lastPage} of {pdf.totalPages} {pagesLeft > 0 ? `· ${pagesLeft} pages left` : '· finished'}
        </p>
        <div className="mt-2.5 h-1.5 rounded-full bg-ink/[0.08] overflow-hidden max-w-xs">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl shrink-0 transition-colors">
        Resume <ArrowRight size={15} />
      </div>
      <ArrowRight size={18} className="sm:hidden text-brand-600 shrink-0" />
    </button>
  )
}

export default ContinueReadingCard
