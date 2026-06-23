import { useEffect, useState } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import { usePwaInstall } from '../hooks/usePwaInstall'

// ── iOS bottom-sheet install guide ──────────────────────────────────────────
const IosInstallSheet = ({ onClose }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-ink/[0.12] mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-serif text-lg font-semibold text-ink">Add to Home Screen</p>
            <p className="text-sm text-ink-soft mt-0.5">Install PothiView as an app on your iPhone</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-ink/[0.06] flex items-center justify-center ml-3 shrink-0">
            <X size={15} className="text-ink-soft" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <Step n={1} icon={<ShareIcon />} label="Tap the Share button" sub="At the bottom of your browser" />
          <Step n={2} icon={<PlusBoxIcon />} label='Tap "Add to Home Screen"' sub="Scroll down in the share sheet" />
          <Step n={3} icon={<CheckIcon />} label="Tap Add" sub="PothiView appears on your home screen" />
        </div>

        <p className="text-center text-[11px] text-ink-faint mt-6">
          Works in Safari · No App Store required
        </p>
      </motion.div>
    </motion.div>
  </AnimatePresence>
)

const Step = ({ n, icon, label, sub }) => (
  <div className="flex items-center gap-4">
    <div className="w-9 h-9 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </div>
    <span className="w-5 h-5 rounded-full bg-ink/[0.06] text-[11px] font-bold text-ink-soft flex items-center justify-center shrink-0">{n}</span>
  </div>
)

// Inline SVG icons that match iOS share/add UI precisely
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-brand-600">
    <path d="M12 4v12m0-12L8 8m4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)
const PlusBoxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-brand-600">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-brand-600">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
    <path d="m8.5 12 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ── InstallAppButton ─────────────────────────────────────────────────────────
/**
 * Single source-of-truth install button.
 *
 * Android/Chrome: immediately fires the native beforeinstallprompt dialog.
 * iOS:            opens the bottom-sheet guide instead (no toast fallback).
 *
 * variant="navbar"   — pill in the top nav (desktop, hidden on mobile)
 * variant="menu"     — row inside the profile dropdown
 * variant="settings" — full-width row in Settings page
 * variant="banner"   — primary CTA inside InstallBanner
 */
const InstallAppButton = ({ variant = 'navbar', onAfterClick }) => {
  const { install, platform, canPromptInstall, showInstallUi } = usePwaInstall()
  const [iosSheetOpen, setIosSheetOpen] = useState(false)

  useEffect(() => {
    if (showInstallUi) {
      console.log(`[PWA] Install button rendered — variant="${variant}" platform="${platform}" canPromptInstall=${canPromptInstall}`)
    }
  }, [showInstallUi, variant, platform, canPromptInstall])

  if (!showInstallUi) return null

  const handleClick = async () => {
    if (platform === 'ios') {
      console.log('[PWA] iOS detected — opening Add to Home Screen instructions sheet')
      setIosSheetOpen(true)
    } else if (canPromptInstall) {
      const outcome = await install()
      if (outcome === 'accepted') toast.success('PothiView installed! 🎉')
    } else {
      console.log('[PWA] Install button clicked but no prompt available (canPromptInstall=false)')
    }
    // Don't call onAfterClick on iOS — sheet stays open
    if (platform !== 'ios') onAfterClick?.()
  }

  const label = platform === 'ios' ? 'Add to Home Screen' : 'Install App'

  return (
    <>
      {iosSheetOpen && <IosInstallSheet onClose={() => { setIosSheetOpen(false); onAfterClick?.() }} />}

      {variant === 'menu' && (
        <button onClick={handleClick} className="w-full text-left px-3.5 py-2 text-sm text-ink-soft hover:bg-paper-dim hover:text-ink transition-colors flex items-center gap-2">
          <Download size={15} className="shrink-0" />
          {label}
        </button>
      )}

      {variant === 'settings' && (
        <button onClick={handleClick} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-ink/[0.08] hover:border-brand-300 hover:bg-brand-50/40 transition-colors text-left">
          <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <Download size={16} className="text-brand-600" />
            {label}
          </span>
          <span className="text-xs text-brand-700 font-medium">Install →</span>
        </button>
      )}

      {variant === 'banner' && (
        <button onClick={handleClick} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-brand-700 text-sm font-semibold hover:bg-brand-50 transition-colors shrink-0">
          <Download size={14} />
          {platform === 'ios' ? 'How to install' : 'Install PothiView'}
        </button>
      )}

      {variant === 'navbar' && (
        <button onClick={handleClick} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors">
          <Download size={14} />
          {label}
        </button>
      )}
    </>
  )
}

export default InstallAppButton
