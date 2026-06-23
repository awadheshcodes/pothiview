import pdfParse from 'pdf-parse'

// Per-page cap keeps any single page's contribution bounded (dense reference
// pages can otherwise be huge). Total cap bounds the whole document so a
// 1000-page PDF can't blow up the Mongo doc or the prompt we send Gemini.
export const MAX_CHARS_PER_PAGE = 8_000
export const MAX_TOTAL_CHARS = 200_000
export const MAX_AI_CONTEXT_CHARS = 30_000

export interface ExtractedPdf {
    pages: string[]   // index 0 === page 1
    numPages: number
}

// Runs once at upload time. Returns per-page plain text (capped) so later
// AI calls can look up exactly the page the reader is on. Failure here
// never blocks the upload — callers treat a null return as "AI page/whole
// document context unavailable" (still fine for scanned/image-only PDFs,
// which have no extractable text layer either way).
export const extractPdfPages = async (buffer: Buffer): Promise<ExtractedPdf | null> => {
    const pages: string[] = []
    let totalChars = 0

    try {
        const data = await pdfParse(buffer, {
            pagerender: async (pageData: any) => {
                const content = await pageData.getTextContent()
                const text = content.items.map((item: any) => item.str).join(' ').trim()

                if (totalChars >= MAX_TOTAL_CHARS) {
                    pages.push('')
                } else {
                    const capped = text.slice(0, MAX_CHARS_PER_PAGE)
                    pages.push(capped)
                    totalChars += capped.length
                }
                return text
            }
        })

        return { pages, numPages: data.numpages || pages.length || 1 }
    } catch (err: any) {
        console.error('[pdfText] extraction failed:', err.message || err)
        return null
    }
}
