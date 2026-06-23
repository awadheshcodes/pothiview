import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Page } from 'react-pdf'

// ── ContinuousPdfList ───────────────────────────────────────────────────────
//
// Renders every page of the document in a single vertical scroll, the way
// Kindle / Google Books / ReadEra read on mobile — as opposed to the desktop
// reader, which still mounts one page at a time and flips between them.
//
// ZOOM SUPPORT (added):
//   The component accepts a `scale` prop (default 1). When scale > 1 the
//   entire list wrapper is CSS-transformed (`transform: scaleX/Y`) and the
//   wrapper width is expanded to fill the scaled content, so the native
//   scroll container can scroll both horizontally and vertically inside the
//   zoomed surface. This mirrors how ReadEra / Adobe Reader Mobile handle
//   zoom in continuous-scroll mode.
//
//   Each individual PageSlot still renders at `containerWidth` (= device
//   width), then the parent scale transform magnifies it. This avoids
//   re-rendering all mounted canvases on every gesture tick — only the
//   CSS transform changes during a pinch, the canvas pixels stay the same.
//
// ── Windowed rendering ──────────────────────────────────────────────────────
//   Only pages within ~1.5 screens of the viewport are live; the rest are
//   placeholder divs of the correct height. See registerObservers below.
//
// ── Current-page detection ──────────────────────────────────────────────────
//   A shared IntersectionObserver reports whichever page has the most
//   visible area, debounced via rAF.

const PageSlot = ({
  pageNumber,
  containerWidth,
  estimatedAspect,
  registerObservers,
  onMeasured,
  renderTextLayer,
}) => {
  const elRef = useRef(null)
  const [shouldRender, setShouldRender] = useState(false)
  const [measuredHeight, setMeasuredHeight] = useState(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const unregister = registerObservers(el, pageNumber, setShouldRender)
    return unregister
  }, [pageNumber, registerObservers])

  // Orientation change / resize: drop the measured height so the aspect-ratio
  // estimate is used until the page re-renders at the new width.
  const prevWidthRef = useRef(containerWidth)
  useEffect(() => {
    if (prevWidthRef.current !== containerWidth) {
      prevWidthRef.current = containerWidth
      setMeasuredHeight(null)
    }
  }, [containerWidth])

  const placeholderHeight = measuredHeight || Math.round(containerWidth * estimatedAspect)

  return (
    <div
      ref={elRef}
      data-page-number={pageNumber}
      className="continuous-pdf-page w-full"
      style={{ minHeight: shouldRender ? undefined : placeholderHeight }}
    >
      {shouldRender ? (
        <Page
          pageNumber={pageNumber}
          width={containerWidth}
          renderTextLayer={renderTextLayer}
          renderAnnotationLayer={false}
          onRenderSuccess={(page) => {
            if (page?.height) {
              setMeasuredHeight(page.height)
              onMeasured?.(pageNumber, page.height)
            }
          }}
          loading={
            <div
              className="w-full flex items-center justify-center bg-white"
              style={{ height: placeholderHeight }}
            >
              <div className="w-6 h-6 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
            </div>
          }
        />
      ) : (
        <div className="w-full bg-white" style={{ height: placeholderHeight }} />
      )}
    </div>
  )
}

/**
 * @param {object} props
 * @param {number} props.numPages
 * @param {(page: number) => void} props.onCurrentPageChange
 * @param {boolean} props.renderTextLayer — disabled during fast scroll
 * @param {number}  props.scale — zoom level (1 = 100 %). Applied as a CSS
 *   transform on the list wrapper so that all mounted pages zoom together
 *   without re-rendering their canvases on every gesture tick.
 * @param {React.Ref} ref — exposes { scrollToPage(n) }
 */
const ContinuousPdfList = forwardRef(({
  numPages,
  onCurrentPageChange,
  renderTextLayer = true,
  scale = 1,
}, ref) => {
  const containerRef = useRef(null)
  const observerRef = useRef(null)
  const setShouldRenderFnsRef = useRef(new Map())
  const visibilityRef = useRef(new Map())
  const rafRef = useRef(null)
  const pageHeightsRef = useRef(new Map())

  // Device width — pages always render at native device width; the scale
  // transform magnifies the already-rendered canvas without a re-render.
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 390
  )
  useEffect(() => {
    let frame = null
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setContainerWidth(window.innerWidth))
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // ── Render-window IntersectionObserver ──────────────────────────────────
  const registerObservers = useCallback((el, pageNumber, setShouldRender) => {
    setShouldRenderFnsRef.current.set(pageNumber, setShouldRender)

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const page = Number(entry.target.dataset.pageNumber)
            const fn = setShouldRenderFnsRef.current.get(page)
            if (fn) fn(entry.isIntersecting)
            visibilityRef.current.set(page, entry.isIntersecting ? entry.intersectionRatio : 0)
          })
          scheduleCurrentPageUpdate()
        },
        {
          root: null,
          rootMargin: '150% 0px 150% 0px',
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      )
    }
    observerRef.current.observe(el)

    return () => {
      observerRef.current?.unobserve(el)
      setShouldRenderFnsRef.current.delete(pageNumber)
      visibilityRef.current.delete(pageNumber)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleCurrentPageUpdate = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      let best = null
      let bestRatio = 0
      visibilityRef.current.forEach((ratio, page) => {
        if (ratio > bestRatio) {
          bestRatio = ratio
          best = page
        }
      })
      if (best != null) onCurrentPageChange?.(best)
    })
  }, [onCurrentPageChange])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    observerRef.current?.disconnect()
  }, [])

  const handleMeasured = useCallback((pageNumber, height) => {
    pageHeightsRef.current.set(pageNumber, height)
  }, [])

  useImperativeHandle(ref, () => ({
    scrollToPage: (target) => {
      const el = containerRef.current?.querySelector(`[data-page-number="${target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'start', behavior: 'auto' })
      }
    },
    getContainer: () => containerRef.current,
  }), [])

  // ── Zoom transform ────────────────────────────────────────────────────────
  // When scale > 1 we expand the wrapper's width to `scale * 100vw` so
  // the scrolling ancestor can scroll both axes inside the zoomed content.
  // transform-origin is set to 'top left' so the top-left corner stays
  // anchored (mirrors Google Drive / ReadEra behaviour).
  const isZoomed = scale > 1.01
  const wrapperStyle = isZoomed
    ? {
        transformOrigin: 'top left',
        transform: `scale(${scale})`,
        // Reserve the full scaled width so the scroll container gets a
        // scrollable area that matches the transformed content.
        width: `${Math.round(containerWidth * scale)}px`,
        // Height expands naturally from the stacked pages × scale.
        // overflow-x: visible lets the scaled content bleed into the
        // horizontal scroll track of the ancestor.
        overflowX: 'visible',
        willChange: 'transform',
      }
    : {}

  return (
    <div
      ref={containerRef}
      className="continuous-pdf-list-root"
      style={wrapperStyle}
    >
      {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((pageNumber) => (
        <PageSlot
          key={pageNumber}
          pageNumber={pageNumber}
          containerWidth={containerWidth}
          estimatedAspect={1.414}
          registerObservers={registerObservers}
          onMeasured={handleMeasured}
          renderTextLayer={renderTextLayer}
        />
      ))}
    </div>
  )
})

ContinuousPdfList.displayName = 'ContinuousPdfList'

export default ContinuousPdfList
