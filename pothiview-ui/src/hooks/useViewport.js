import { useEffect, useState } from 'react'

// Matches Tailwind's md (768px) / lg (1024px) breakpoints so JS-driven
// layout decisions (which DOM structure to render — overlay bottom sheet
// vs. inline flex sidebar) stay in sync with the CSS breakpoints used
// everywhere else in the app.
const MD = 768
const LG = 1024

const classify = (width) => {
  if (width >= LG) return 'desktop'
  if (width >= MD) return 'tablet'
  return 'mobile'
}

/**
 * useViewport
 *
 * Returns 'mobile' | 'tablet' | 'desktop' and re-renders on resize
 * (debounced via rAF) and on orientation change. Mobile/tablet need
 * fundamentally different DOM (overlay sheet vs. inline sidebar), not
 * just different classes, so the reader picks its shell in JS rather
 * than trying to morph one DOM tree across breakpoints with pure CSS.
 */
const useViewport = () => {
  const [viewport, setViewport] = useState(() =>
    typeof window === 'undefined' ? 'desktop' : classify(window.innerWidth)
  )

  useEffect(() => {
    let frame = null
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setViewport(classify(window.innerWidth)))
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return viewport
}

export default useViewport
