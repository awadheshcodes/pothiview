import { useCallback, useEffect, useState } from 'react'
import { markAppInstalled, isAppInstalledInStorage } from '../lib/installTracking'

const isIosDevice = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

/**
 * usePwaInstall — unified PWA install state.
 *
 * Android/Chrome:
 *   Captures `beforeinstallprompt` and exposes `install()` to fire the native
 *   dialog immediately. On `appinstalled` (or after `install()` resolves
 *   'accepted') we write the permanent flag via markAppInstalled() so the
 *   banner never reappears.
 *
 * iOS Safari:
 *   No programmatic API. `platform === 'ios'` lets callers show the manual
 *   Add-to-Home-Screen bottom sheet. Install state is never "confirmed" by
 *   the browser, so the banner keeps appearing (on the 24 h cycle) until
 *   the user actually installs and opens the app in standalone mode.
 *
 * Returns:
 *   install()         — fire native prompt (Android) · resolves 'accepted' | 'dismissed' | 'unavailable'
 *   installed         — true once permanently installed (hides all install UI)
 *   canPromptInstall  — true while a deferred prompt is queued
 *   platform          — 'ios' | 'other'
 *   showInstallUi     — convenience: !installed && (canPromptInstall || ios)
 */
export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  // Installed = running standalone RIGHT NOW, or flag was written in a
  // previous session (e.g. user added to home screen and relaunched).
  const [installed, setInstalled] = useState(
    () => isStandalone() || isAppInstalledInStorage()
  )

  useEffect(() => {
    if (installed) return

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault()
      console.log('[PWA] beforeinstallprompt fired — prompt stored, Install button will render')
      setDeferredPrompt(e)
    }

    const onAppInstalled = () => {
      console.log('[PWA] appinstalled event fired — marking app as installed')
      // Browser confirmed installation — mark permanently so the banner
      // never reappears across sessions.
      markAppInstalled()
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [installed])

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('[PWA] install() called but no deferredPrompt available — returning unavailable')
      return 'unavailable'
    }
    console.log('[PWA] Calling deferredPrompt.prompt() — native install popup opening')
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWA] userChoice resolved with outcome: "${outcome}"`)
    // Prompt can only be used once — drop it regardless of outcome.
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      markAppInstalled()
      setInstalled(true)
    }
    return outcome   // 'accepted' | 'dismissed'
  }, [deferredPrompt])

  const platform = isIosDevice() ? 'ios' : 'other'
  const canPromptInstall = Boolean(deferredPrompt)
  const showInstallUi = !installed && (canPromptInstall || platform === 'ios')

  return { install, installed, canPromptInstall, platform, showInstallUi }
}
