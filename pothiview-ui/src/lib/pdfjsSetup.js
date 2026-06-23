import { pdfjs } from 'react-pdf'

// CDN-hosted worker, pinned to the exact version react-pdf's bundled pdfjs-dist
// reports — avoids the classic "API version doesn't match Worker version" error
// that happens when the worker is fetched from a mismatched build.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export { pdfjs }

// Renders page 1 of a freshly-picked PDF File to a JPEG Blob, used as the
// library cover thumbnail. Returns null on any failure — callers should
// treat that as "no thumbnail" and move on, never block the upload on it.
export const renderFirstPageThumbnail = async (file) => {
  try {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: buffer }).promise
    const page = await pdf.getPage(1)

    const targetWidth = 360
    const viewport = page.getViewport({ scale: 1 })
    const scale = targetWidth / viewport.width
    const scaledViewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height
    const ctx = canvas.getContext('2d')

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob
  } catch (err) {
    console.warn('[thumbnail] generation failed:', err)
    return null
  }
}
