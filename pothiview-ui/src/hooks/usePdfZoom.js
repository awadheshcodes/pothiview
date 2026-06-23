/**
 * usePdfZoom — Pinch-to-zoom + double-tap zoom for the mobile PDF reader.
 *
 * Why a custom hook instead of relying on browser viewport zoom:
 *  - `viewport zoom` (CSS transform on the whole page) is blocked in most
 *    PWA/standalone contexts on iOS Safari when viewport meta lacks
 *    user-scalable=yes. Even when allowed it resets on scroll and causes
 *    layout shifts on content outside the PDF.
 *  - Instead we track a `scale` value in React state and apply it as a
 *    CSS `transform: scale(scale)` on the PDF canvas wrapper. This keeps
 *    zoom in-state, persistent across scrolls, and compatible with the
 *    text-layer (which scales with the canvas).
 *
 * Usage:
 *   const { scale, zoomHandlers } = usePdfZoom({ min: 1, max: 4, doubleTapScale: 2 })
 *   <div {...zoomHandlers} style={{ transformOrigin: 'top center', transform: `scale(${scale})` }}>
 *
 * The hook returns:
 *   scale         — current zoom level (1 = 100 %)
 *   setScale      — direct setter (for toolbar +/- buttons)
 *   resetZoom     — fn() → scale back to 1
 *   zoomHandlers  — { onTouchStart, onTouchMove, onTouchEnd } — spread onto wrapper
 */

import { useState, useRef, useCallback } from 'react'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export default function usePdfZoom({
  min = 1,
  max = 4,
  doubleTapScale = 2.2,
  doubleTapMs = 280,
} = {}) {
  const [scale, setScaleState] = useState(1)

  // Internal refs — we avoid putting these in state so gesture tracking
  // doesn't trigger re-renders on every pointermove.
  const lastTapRef = useRef(0)       // timestamp of previous tap (double-tap detection)
  const lastTapPosRef = useRef(null) // {x,y} of previous tap
  const pinchStartDistRef = useRef(null)  // distance between fingers at pinch start
  const pinchStartScaleRef = useRef(1)    // scale at pinch start

  const setScale = useCallback((updater) => {
    setScaleState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return clamp(+next.toFixed(3), min, max)
    })
  }, [min, max])

  const resetZoom = useCallback(() => setScaleState(1), [])

  // ── Touch handlers ────────────────────────────────────────────────────────

  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStartDistRef.current = Math.hypot(dx, dy)
      pinchStartScaleRef.current = scale
      // Prevent browser scroll/zoom interfering
      e.preventDefault?.()
    } else if (e.touches.length === 1) {
      // Potential double-tap
      const now = Date.now()
      const { clientX: x, clientY: y } = e.touches[0]
      const dt = now - lastTapRef.current
      const prev = lastTapPosRef.current

      if (dt < doubleTapMs && prev) {
        // Check the two taps were in roughly the same spot (within 30px)
        const dist = Math.hypot(x - prev.x, y - prev.y)
        if (dist < 30) {
          // Double-tap detected: toggle between 1× and doubleTapScale
          setScaleState((s) => {
            const target = s > 1.05 ? 1 : doubleTapScale
            return clamp(target, min, max)
          })
          lastTapRef.current = 0
          lastTapPosRef.current = null
          // Prevent the toolbar-toggle tap handler from also firing
          e.preventDefault?.()
          return
        }
      }

      lastTapRef.current = now
      lastTapPosRef.current = { x, y }
    }
  }, [scale, doubleTapScale, doubleTapMs, min, max])

  const onTouchMove = useCallback((e) => {
    if (e.touches.length !== 2 || pinchStartDistRef.current == null) return

    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const ratio = dist / pinchStartDistRef.current
    const newScale = clamp(pinchStartScaleRef.current * ratio, min, max)

    setScaleState(+newScale.toFixed(3))
    // Prevent scroll during pinch
    e.preventDefault?.()
  }, [min, max])

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null
    }
  }, [])

  return {
    scale,
    setScale,
    resetZoom,
    zoomHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
