import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import AiPanelContent from './AiPanelContent'
import { HighlightsTab, NotesTab, BookmarksTab } from './ReaderTabsContent'
import { ProgressTab } from './GamificationPanel'

const TABS = [
  { id: 'ai', label: 'AI', icon: 'Sparkles' },
  { id: 'highlights', label: 'Marks', icon: 'Highlighter' },
  { id: 'notes', label: 'Notes', icon: 'NotebookPen' },
  { id: 'bookmarks', label: 'Saved', icon: 'Bookmark' },
  { id: 'progress', label: 'Progress', icon: 'Trophy' },
]

/**
 * SidePanel — md+ inline sidebar (replaces the old always-on w-80 panel).
 * Width is animated between 0 and `width` so collapsing it smoothly hands
 * space back to the PDF column next to it, rather than just hiding.
 */
const SidePanel = ({
  open, width, onToggle, activeTab, onTabChange, darkMode,
  highlightsProps, notesProps, bookmarksProps, aiProps, progressProps,
}) => (
  <motion.div
    initial={false}
    animate={{ width: open ? width : 0 }}
    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    className="relative shrink-0 overflow-hidden hidden md:block"
  >
    {/* Re-open handle, sits on the seam so it's reachable even at width 0 */}
    <button
      onClick={onToggle}
      className={`absolute top-1/2 -translate-y-1/2 -left-3 z-10 w-6 h-12 rounded-l-lg border flex items-center justify-center transition ${
        darkMode ? 'bg-[#1C1914] border-white/10 text-white/50' : 'bg-white border-ink/[0.08] text-ink-faint'
      }`}
      title={open ? 'Collapse panel' : 'Expand panel'}
    >
      <Icons.ChevronRight size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>

    <div
      className={`h-full flex flex-col border-l ${darkMode ? 'bg-[#1C1914] border-white/10 text-paper-dark' : 'bg-white border-ink/[0.07] text-ink'}`}
      style={{ width }}
    >
      <div className={`flex border-b shrink-0 ${darkMode ? 'border-white/10' : 'border-ink/[0.06]'}`}>
        {TABS.map((tab) => {
          const Icon = Icons[tab.icon]
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-all border-b-2 ${
                activeTab === tab.id ? 'text-brand-600 border-brand-600' : 'opacity-50 hover:opacity-80 border-transparent'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'ai' && <AiPanelContent darkMode={darkMode} {...aiProps} />}
      {activeTab === 'highlights' && <HighlightsTab {...highlightsProps} />}
      {activeTab === 'notes' && <NotesTab darkMode={darkMode} {...notesProps} />}
      {activeTab === 'bookmarks' && <BookmarksTab darkMode={darkMode} {...bookmarksProps} />}
      {activeTab === 'progress' && <ProgressTab darkMode={darkMode} {...progressProps} />}
    </div>
  </motion.div>
)

export default SidePanel
