import { useEffect, useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { usePwaInstall } from '../hooks/usePwaInstall'
import {
  ensureFirstSeen,
  dismissInstallBanner,
  getInstallTriggerState,
} from '../lib/installTracking'
import InstallAppButton from './InstallAppButton'

const RECHECK_INTERVAL_MS = 60_000  // re-evaluate eligibility every 60 s

/**
 * InstallBanner
 *
 * Visibility rules:
 *   SHOW  — app not installed AND (engagement threshold met OR native prompt
 *            is queued) AND 24 h cooldown expired
 *   HIDE  — app installed (permanent), OR cooldown not yet expired
 *
 * When the browser fires beforeinstallprompt the banner shows immediately
 * regardless of the engagement threshold — the browser itself has already
 * decided the user is a good install candidate.
 *
 * On dismiss: records timestamp → hides now → reappears after 24 h.
 * On install: usePwaInstall writes pv_app_installed → banner gone forever.
 *
 * The banner re-evaluates every 60 s so it can reappear mid-session once
 * the 24 h window expires (edge case but correct behaviour).
 */
const InstallBanner = () => {
  const { showInstallUi, installed, canPromptInstall } = usePwaInstall()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    ensureFirstSeen()

    const check = () => {
      const { eligible } = getInstallTriggerState()
      // Also show immediately when the native install prompt is queued —
      // the browser is signalling the user is ready to install even if our
      // engagement threshold hasn't been met yet.
      const shouldShow = eligible || canPromptInstall
      setVisible(shouldShow)
    }

    check()
    const id = setInterval(check, RECHECK_INTERVAL_MS)
    return () => clearInterval(id)
  // Re-run when canPromptInstall flips so the banner appears the moment
  // beforeinstallprompt fires without waiting for the next 60 s tick.
  }, [canPromptInstall])

  // If the app gets installed mid-session, hide immediately.
  useEffect(() => {
    if (installed) setVisible(false)
  }, [installed])

  if (!showInstallUi || !visible) return null

  const onDismiss = () => {
    dismissInstallBanner()   // writes pv_install_dismissed_at = now
    setVisible(false)        // hide immediately; recheck will show it again after 24 h
  }

  return (
    <div className="relative mb-5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 text-white p-4 flex items-center gap-3.5 shadow-soft animate-fade-in">
      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
        <Sparkles size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-serif font-semibold text-[15px] leading-tight">Install PothiView</p>
        <p className="text-[12px] text-white/80 mt-0.5 leading-snug">
          Offline access · no browser bar · one tap from your home screen.
        </p>
      </div>

      {/* Single install entry-point — Android fires native dialog, iOS opens bottom sheet */}
      <InstallAppButton variant="banner" onAfterClick={onDismiss} />

      <button
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg hover:bg-white/15 transition-colors flex items-center justify-center"
        aria-label="Dismiss — show again tomorrow"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default InstallBanner
