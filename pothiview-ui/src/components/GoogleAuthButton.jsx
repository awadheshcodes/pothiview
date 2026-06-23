import { useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../lib/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/**
 * GoogleAuthButton
 *
 * Renders Google's own "Continue with Google" button via Google Identity
 * Services (GIS) and wires its credential response into the app's auth
 * flow. We deliberately use Google's official rendered button rather than
 * a hand-rolled lookalike — it already matches Google's branding
 * guidelines (white background, "G" logo, "Continue with Google" text)
 * and is the only style Google allows you to ship without manual review.
 *
 * Works for both login and signup: a first-time Google user gets an
 * account created automatically server-side, an existing one just logs in.
 */
const GoogleAuthButton = ({ onSuccess }) => {
  const containerRef = useRef(null)
  const { googleLogin } = useAuth()

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set — Google sign-in is disabled.')
      return
    }

    let cancelled = false
    let pollTimer = null
    let pollTimeout = null
    let resizeObserver = null

    const handleCredentialResponse = async (response) => {
      try {
        const data = await googleLogin(response.credential)
        onSuccess?.(data)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Google sign-in failed. Please try again.')
      }
    }

    const draw = () => {
      if (cancelled || !containerRef.current) return
      const width = Math.min(Math.max(containerRef.current.offsetWidth || 320, 200), 400)
      containerRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width
      })
    }

    const init = () => {
      if (cancelled || !window.google?.accounts?.id) return

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        // We render an explicit button rather than One Tap, so don't let
        // GIS auto-select a previously-used account on page load.
        auto_select: false,
        cancel_on_tap_outside: true
      })

      draw()

      // Re-render at the new width whenever the card resizes (e.g. mobile
      // rotation, or the container growing after fonts/layout settle).
      resizeObserver = new ResizeObserver(() => draw())
      if (containerRef.current) resizeObserver.observe(containerRef.current)
    }

    // The GIS <script> tag loads async — it may not be ready yet on first
    // mount, so poll briefly until `window.google` shows up.
    if (window.google?.accounts?.id) {
      init()
    } else {
      pollTimer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(pollTimer)
          init()
        }
      }, 100)
      pollTimeout = setTimeout(() => clearInterval(pollTimer), 10000)
    }

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      if (pollTimeout) clearTimeout(pollTimeout)
      if (resizeObserver) resizeObserver.disconnect()
    }
  }, [googleLogin, onSuccess])

  if (!GOOGLE_CLIENT_ID) return null

  return <div ref={containerRef} className="w-full flex justify-center [&>div]:!w-full" />
}

export default GoogleAuthButton
