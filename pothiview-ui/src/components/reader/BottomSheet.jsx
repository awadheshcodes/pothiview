import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'

// Three snap heights as % of viewport height
const SNAP = {
  closed: 64,   // px — just the tab strip, always peeking
  half: 60,     // dvh — comfortable reading + content
  full: 95,     // dvh — full screen panel
}

/**
 * BottomSheet — 3-state mobile panel (closed → half → full).
 *
 * Closed (64px): only drag handle + tab strip visible.
 * Half (60dvh):  good for browsing highlights/notes while remembering context.
 * Full (95dvh):  deep dive into notes, progress, long AI conversation.
 *
 * Tabs: AI · Marks · Notes · Saved · Progress
 * AI tab fires onAiOpen and keeps sheet closed (AI has its own panel).
 */
const BottomSheet = ({ open, onOpenChange, tabs, activeTab, onTabChange, darkMode, onAiOpen, children }) => {
  // snapState: 'closed' | 'half' | 'full'
  const [snapState, setSnapState] = useState('closed')

  const dark = darkMode

  const currentHeight = snapState === 'full'
    ? `${SNAP.full}dvh`
    : snapState === 'half'
    ? `${SNAP.half}dvh`
    : `${SNAP.closed}px`

  // Sync open prop → snapState
  // When parent calls onOpenChange(false), we close.
  // When parent calls onOpenChange(true), we go to half if currently closed.
  const handleOpenChange = (val) => {
    if (!val) {
      setSnapState('closed')
      onOpenChange(false)
    } else {
      if (snapState === 'closed') setSnapState('half')
      onOpenChange(true)
    }
  }

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info
    // Flick up fast → go to next state up
    if (velocity.y < -400) {
      if (snapState === 'closed') { setSnapState('half'); onOpenChange(true) }
      else if (snapState === 'half') { setSnapState('full') }
      return
    }
    // Flick down fast → close down one step
    if (velocity.y > 400) {
      if (snapState === 'full') { setSnapState('half') }
      else { setSnapState('closed'); onOpenChange(false) }
      return
    }
    // Slow drag — use offset threshold
    if (offset.y < -60) {
      if (snapState === 'closed') { setSnapState('half'); onOpenChange(true) }
      else if (snapState === 'half') { setSnapState('full') }
    } else if (offset.y > 60) {
      if (snapState === 'full') { setSnapState('half') }
      else { setSnapState('closed'); onOpenChange(false) }
    }
  }

  const selectTab = (id) => {
    if (id === 'ai') {
      setSnapState('closed')
      onOpenChange(false)
      onAiOpen?.()
      return
    }
    if (snapState !== 'closed' && activeTab === id) {
      // Tapping active tab → collapse
      setSnapState('closed')
      onOpenChange(false)
      return
    }
    onTabChange(id)
    setSnapState('half')
    onOpenChange(true)
  }

  const isOpen = snapState !== 'closed'

  return (
    <>
      {/* Backdrop — only when half or full */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { setSnapState('closed'); onOpenChange(false) }}
            className="fixed inset-0 z-30 md:hidden"
            style={{ background: snapState === 'full' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.2)' }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden rounded-t-2xl border-t flex flex-col overflow-hidden ${
          dark
            ? 'bg-[#1C1914] border-white/10 text-paper-dark'
            : 'bg-white border-ink/[0.08] text-ink'
        }`}
        style={{
          // Subtle shadow only when open
          boxShadow: isOpen ? '0 -8px 32px -8px rgba(34,30,24,0.18)' : '0 -1px 0 rgba(34,30,24,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        animate={{ height: currentHeight }}
        transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.8 }}
      >
        {/* Drag handle — only drag zone, not the whole header */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          className="w-full flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        >
          <div className={`w-10 h-1 rounded-full transition-colors ${
            isOpen
              ? dark ? 'bg-white/30' : 'bg-ink/20'
              : dark ? 'bg-white/15' : 'bg-ink/10'
          }`} />
        </motion.div>

        {/* Tab strip — always visible, 44px minimum touch height */}
        <div className="flex items-center px-2 pb-1.5 shrink-0">
          {tabs.map((tab) => {
            const Icon = Icons[tab.icon]
            const isAi = tab.id === 'ai'
            const active = isOpen && !isAi && activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                // Minimum 44px touch target per Apple HIG
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-all active:scale-95 ${
                  isAi
                    ? 'text-brand-600'
                    : active
                    ? 'text-brand-600'
                    : dark ? 'text-white/45' : 'text-ink-faint'
                }`}
              >
                {isAi ? (
                  <div className="relative flex items-center justify-center w-8 h-8">
                    <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
                      <Icon size={15} className="text-white" strokeWidth={2.2} />
                    </div>
                    {/* Ambient pulse — subtle */}
                    <motion.span
                      className="absolute inset-0 rounded-full bg-brand-500 pointer-events-none"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.35, 0, 0.35] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                ) : (
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={`transition-transform ${active ? 'scale-110' : ''}`}
                  />
                )}
                <span className={`text-[10px] leading-none ${
                  isAi ? 'font-bold text-brand-600' : active ? 'font-semibold' : 'font-medium'
                }`}>
                  {tab.label}
                </span>

                {/* Count badge */}
                {tab.count != null && tab.count > 0 && !isAi && (
                  <span className="absolute top-1 right-[14%] min-w-[15px] h-[15px] px-0.5 rounded-full text-[8px] font-bold flex items-center justify-center bg-brand-600 text-white">
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}

                {/* Active underline dot */}
                {active && (
                  <motion.div
                    layoutId="sheet-tab-dot"
                    className="absolute bottom-0.5 w-1 h-1 rounded-full bg-brand-600"
                  />
                )}
              </button>
            )
          })}

          {/* Expand/collapse chevron — rightmost */}
          <button
            onClick={() => {
              if (snapState === 'full') setSnapState('half')
              else if (snapState === 'half') setSnapState('full')
              else { setSnapState('half'); onOpenChange(true) }
            }}
            className={`w-9 h-11 flex items-center justify-center rounded-xl transition-colors shrink-0 ${
              dark ? 'text-white/30 hover:text-white/50' : 'text-ink-faint hover:text-ink-soft'
            }`}
          >
            <Icons.ChevronUp
              size={15}
              className={`transition-transform duration-300 ${snapState === 'full' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Sheet content — renders only when open */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {isOpen && children}
        </div>
      </motion.div>
    </>
  )
}

export default BottomSheet
