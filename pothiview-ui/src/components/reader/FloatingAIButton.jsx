import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

/**
 * FloatingAIButton
 *
 * Mobile: HIDDEN — AI is now accessed via the bottom nav AI tab.
 * Tablet/Desktop: shown when the sidebar is collapsed, so the AI
 * entry point is never lost when the panel is toggled off.
 */
const FloatingAIButton = ({ open, onClick, bottomOffset = 24 }) => (
  <motion.button
    onClick={onClick}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0, opacity: 0 }}
    whileTap={{ scale: 0.9 }}
    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    style={{ bottom: bottomOffset }}
    className="fixed right-4 z-40 w-14 h-14 rounded-full bg-brand-600 text-white shadow-lift hidden md:flex items-center justify-center"
    title="Ask AI"
  >
    {!open && (
      <motion.span
        className="absolute inset-0 rounded-full bg-brand-500"
        animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    )}
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={open ? 'close' : 'open'}
        initial={{ rotate: -45, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 45, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="relative"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </motion.span>
    </AnimatePresence>
  </motion.button>
)

export default FloatingAIButton
