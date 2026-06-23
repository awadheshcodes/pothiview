// ── Install promotion tracking ───────────────────────────────────────────────
//
// Keys:
//   pv_first_seen_at          ms timestamp — when the user first opened the app
//   pv_pdfs_opened_count      integer — how many PDFs they've opened
//   pv_install_dismissed_at   ms timestamp — when they last dismissed the banner
//                             (absent = never dismissed)
//   pv_app_installed          '1' — written on appinstalled event / after
//                             a successful install() call; permanent flag
//
// Dismissal is now TEMPORARY (24 h) not permanent. The banner reappears
// after DISMISS_COOLDOWN_MS regardless of how many times it was dismissed,
// and keeps reappearing until pv_app_installed is set.

const FIRST_SEEN_KEY      = 'pv_first_seen_at'
const PDFS_OPENED_KEY     = 'pv_pdfs_opened_count'
const DISMISSED_AT_KEY    = 'pv_install_dismissed_at'   // replaces old _dismissed boolean
const APP_INSTALLED_KEY   = 'pv_app_installed'

// Legacy key written by the old code — clear it so old permanent-dismissals
// don't block the banner forever after the user updates.
const LEGACY_DISMISSED_KEY = 'pv_install_banner_dismissed'

const FIVE_MINUTES_MS    = 5 * 60 * 1000
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000  // 24 hours

const safeGet = (key) => {
  try { return window.localStorage.getItem(key) } catch { return null }
}
const safeSet = (key, value) => {
  try { window.localStorage.setItem(key, value) } catch {}
}
const safeRemove = (key) => {
  try { window.localStorage.removeItem(key) } catch {}
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

// Called once per app boot.
export const ensureFirstSeen = () => {
  // Migrate: clear the old permanent-dismissed flag so it can't suppress
  // the banner indefinitely after this update ships.
  if (safeGet(LEGACY_DISMISSED_KEY)) {
    safeRemove(LEGACY_DISMISSED_KEY)
    // Convert the permanent dismissal into a temporary one dated 24 h ago
    // minus 1 min — it will show again on the very next page load.
    // (We don't want to hammer users who just dismissed yesterday, so give
    // them the full 24 h cooldown from now instead.)
    if (!safeGet(DISMISSED_AT_KEY)) {
      safeSet(DISMISSED_AT_KEY, String(Date.now() - DISMISS_COOLDOWN_MS + 60_000))
    }
  }
  if (!safeGet(FIRST_SEEN_KEY)) safeSet(FIRST_SEEN_KEY, String(Date.now()))
}

// Called whenever the Reader mounts for any PDF.
export const recordPdfOpened = () => {
  const current = parseInt(safeGet(PDFS_OPENED_KEY), 10) || 0
  safeSet(PDFS_OPENED_KEY, String(current + 1))
}

// ── Dismissal (temporary, 24 h) ────────────────────────────────────────────

export const dismissInstallBanner = () => {
  safeSet(DISMISSED_AT_KEY, String(Date.now()))
}

// ── Permanent install flag ─────────────────────────────────────────────────
// Call this when the appinstalled event fires or after install() resolves
// with 'accepted'. After this the banner is gone forever.

export const markAppInstalled = () => {
  safeSet(APP_INSTALLED_KEY, '1')
}

export const isAppInstalledInStorage = () => safeGet(APP_INSTALLED_KEY) === '1'

// ── Eligibility check ──────────────────────────────────────────────────────

export const getInstallTriggerState = () => {
  // Permanently installed — never show again.
  if (isAppInstalledInStorage()) {
    return { eligible: false, installed: true, dismissedUntil: null }
  }

  const firstSeenAt  = parseInt(safeGet(FIRST_SEEN_KEY), 10) || Date.now()
  const pdfsOpened   = parseInt(safeGet(PDFS_OPENED_KEY), 10) || 0
  const dismissedAt  = parseInt(safeGet(DISMISSED_AT_KEY), 10) || 0
  const elapsedMs    = Date.now() - firstSeenAt

  // Basic engagement threshold: 2 PDFs opened OR 5 min of usage.
  const engagementMet = pdfsOpened >= 2 || elapsedMs >= FIVE_MINUTES_MS

  // Cooldown: if dismissed, hide for 24 h then reappear.
  const cooldownExpired = dismissedAt === 0 || (Date.now() - dismissedAt) >= DISMISS_COOLDOWN_MS
  const dismissedUntil  = dismissedAt > 0 ? dismissedAt + DISMISS_COOLDOWN_MS : null

  return {
    eligible: engagementMet && cooldownExpired,
    installed: false,
    dismissedUntil,          // ms timestamp when banner reappears (null if never dismissed)
    msUntilTimeEligible: Math.max(0, FIVE_MINUTES_MS - elapsedMs),
  }
}
