import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, ChevronDown } from 'lucide-react'
import AiPanelContent from './AiPanelContent'

/**
 * AiSlidePanel — mobile-only AI panel.
 *
 * Improvements over previous version:
 * - Blur backdrop (backdrop-blur) for premium feel
 * - Tighter spring (less bounce, faster settle)
 * - Drag handle to dismiss
 * - Header subtle gradient to signal AI context
 */
const AiSlidePanel = ({ open, onClose, darkMode, ...aiProps }) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Blur backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 z-40 md:hidden"
          style={{ backdropFilter: 'blur(4px)', background: 'rgba(21,19,15,0.35)' }}
        />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 340, damping: 36, mass: 0.9 }}
          className={`fixed left-0 right-0 bottom-0 z-50 md:hidden rounded-t-3xl border-t flex flex-col overflow-hidden ${
            darkMode
              ? 'bg-[#1C1914] border-white/10 text-paper-dark'
              : 'bg-white border-ink/[0.08] text-ink'
          }`}
          style={{
            height: '88dvh',
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: '0 -12px 40px -8px rgba(21,19,15,0.22)',
          }}
        >
          {/* Drag-down handle strip */}
          <div className="w-full flex justify-center pt-2.5 pb-1 shrink-0">
            <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-white/20' : 'bg-ink/15'}`} />
          </div>

          {/* Header */}
          <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b shrink-0 ${
            darkMode ? 'border-white/10' : 'border-ink/[0.06]'
          }`}>
            {/* AI icon with glow */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white">
                <Sparkles size={15} />
              </div>
              <motion.span
                className="absolute inset-0 rounded-xl bg-brand-500 pointer-events-none"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <p className="font-semibold text-sm flex-1 tracking-tight">PothiAI</p>
            <button
              onClick={onClose}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-ink/[0.06] text-ink-faint'
              }`}
              title="Close AI"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <AiPanelContent darkMode={darkMode} {...aiProps} />
        </motion.div>
      </>
    )}
  </AnimatePresence>
)

export default AiSlidePanel
