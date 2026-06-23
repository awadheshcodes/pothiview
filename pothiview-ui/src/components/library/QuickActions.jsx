import { UploadCloud, Sparkles, NotebookPen } from 'lucide-react'

/**
 * QuickActions
 *
 * `onAskAi` is left to the caller because "ask PothiAI" needs a document
 * to be useful — if there's a recently-opened PDF it should jump straight
 * into that reader's AI panel (?panel=ai), otherwise it should nudge the
 * person to upload one first.
 */
const QuickActions = ({ onUpload, onAskAi, onNotes }) => {
  const actions = [
    { label: 'Upload PDF', icon: UploadCloud, onClick: onUpload, accent: 'bg-brand-600 hover:bg-brand-700 text-white' },
    { label: 'Ask PothiAI', icon: Sparkles, onClick: onAskAi, accent: 'bg-white hover:bg-paper-dim text-ink border border-ink/[0.08]' },
    { label: 'Notes', icon: NotebookPen, onClick: onNotes, accent: 'bg-white hover:bg-paper-dim text-ink border border-ink/[0.08]' },
  ]

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">Quick Actions</p>
      <div className="grid grid-cols-3 gap-3">
        {actions.map(({ label, icon: Icon, onClick, accent }) => (
          <button
            key={label}
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-4 text-sm font-medium transition-colors shadow-soft ${accent}`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions
