import { Response } from 'express'
import Exc from '../util/exc.util'
import geminiModel from '../util/gemini.util'
import { MAX_AI_CONTEXT_CHARS } from '../util/pdfText.util'
import { AuthInterface } from '../middleware/guard.middleware'
import PdfModel from '../pdf/pdf.model'
import AiMessageModel from './ai.model'
import { recordAiUsage } from '../streak/streak.service'

type Scope = 'selection' | 'page' | 'document'

interface Context {
    text: string
    label: string   // e.g. "page 4", "the whole document", "the selected passage"
}

// Resolves what text to feed Gemini. A text selection always wins (it's the
// most specific signal the reader gave us); otherwise we fall back to the
// requested scope using text captured server-side at upload time.
const resolveContext = (pdf: any, page: number | undefined, scope: Scope | undefined, selectedText?: string): Context => {
    if (selectedText && selectedText.trim())
        return { text: selectedText.trim().slice(0, MAX_AI_CONTEXT_CHARS), label: 'the selected passage' }

    if (scope === 'document') {
        const text = (pdf.pages || []).join('\n\n').slice(0, MAX_AI_CONTEXT_CHARS)
        return { text, label: 'the whole document' }
    }

    const text = (pdf.pages?.[((page || 1) - 1)] || '').slice(0, MAX_AI_CONTEXT_CHARS)
    return { text, label: `page ${page || 1}` }
}

const loadOwnedPdf = async (pdfId: string, userId: string) =>
    PdfModel.findOne({ _id: pdfId, userId }).select('title pages')

const NO_TEXT_MESSAGE = "Couldn't find readable text there — this may be a scanned page with no text layer. Try selecting visible text manually, or pick a different page."

const systemPreamble = (bookTitle: string) =>
    `You are PothiView's reading assistant, helping a student understand "${bookTitle}". Be clear, accurate and concise. Use markdown formatting where it helps readability.`

// ─── HISTORY ────────────────────────────────────────────────────────────

export const getHistory = Exc(async (req: AuthInterface, res: Response) => {
    const messages = await AiMessageModel
        .find({ userId: req.user.id, pdfId: req.params.pdfId })
        .sort({ createdAt: 1 })
        .lean()
    res.json(messages)
})

// ─── ASK (sidebar chat) ─────────────────────────────────────────────────

export const askQuestion = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId, page, selectedText, question, scope } = req.body
    if (!pdfId)
        return res.status(400).json({ message: 'pdfId is required' })

    const pdf = await loadOwnedPdf(pdfId, req.user.id)
    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    const ctx = resolveContext(pdf, page, scope, selectedText)
    const userLabel = question?.trim()
        || (selectedText ? `Explain: "${selectedText.trim().slice(0, 150)}"` : `Explain ${ctx.label}`)

    const prompt = `${systemPreamble(pdf.title)}

${ctx.text ? `Context from ${ctx.label}:\n"""${ctx.text}"""\n` : ''}
Student's question: ${question?.trim() || 'Explain this in detail.'}`

    let answer: string
    try {
        const result = await geminiModel.generateContent(prompt)
        answer = result.response.text().trim()
    } catch (err: any) {
        console.error('[AI] ask failed:', err.message || err)
        return res.status(503).json({ message: 'AI is temporarily unavailable. Please try again.' })
    }
    await recordAiUsage(req.user.id)

    const [userMsg, aiMsg] = await AiMessageModel.create([
        { userId: req.user.id, pdfId, role: 'user', kind: 'chat', content: userLabel, page },
        { userId: req.user.id, pdfId, role: 'assistant', kind: 'chat', content: answer, page }
    ])

    res.json({ answer, userMessage: userMsg, aiMessage: aiMsg })
})

// ─── SUMMARY GENERATOR ──────────────────────────────────────────────────

export const generateSummary = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId, page, scope, selectedText } = req.body
    if (!pdfId)
        return res.status(400).json({ message: 'pdfId is required' })

    const pdf = await loadOwnedPdf(pdfId, req.user.id)
    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    const ctx = resolveContext(pdf, page, scope, selectedText)
    if (!ctx.text)
        return res.status(422).json({ message: NO_TEXT_MESSAGE })

    const userLabel = scope === 'document' ? 'Summarize the whole document' : `Summarize ${ctx.label}`

    const prompt = `${systemPreamble(pdf.title)}

Summarize ${ctx.label} below for a student revising this material.
"""${ctx.text}"""

Structure your response in markdown with these sections:
## Summary
3-4 sentences capturing the main idea.
## Key Concepts
A bullet list of the important terms or ideas.
## Study Tip
One actionable tip for remembering this content.`

    let answer: string
    try {
        const result = await geminiModel.generateContent(prompt)
        answer = result.response.text().trim()
    } catch (err: any) {
        console.error('[AI] summary failed:', err.message || err)
        return res.status(503).json({ message: 'AI is temporarily unavailable. Please try again.' })
    }
    await recordAiUsage(req.user.id)

    const [userMsg, aiMsg] = await AiMessageModel.create([
        { userId: req.user.id, pdfId, role: 'user', kind: 'summary', content: userLabel, page },
        { userId: req.user.id, pdfId, role: 'assistant', kind: 'summary', content: answer, page }
    ])

    res.json({ answer, userMessage: userMsg, aiMessage: aiMsg })
})

// ─── MCQ GENERATOR ──────────────────────────────────────────────────────

export const generateMcq = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId, page, scope, selectedText, count } = req.body
    if (!pdfId)
        return res.status(400).json({ message: 'pdfId is required' })

    const pdf = await loadOwnedPdf(pdfId, req.user.id)
    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    const ctx = resolveContext(pdf, page, scope, selectedText)
    if (!ctx.text)
        return res.status(422).json({ message: NO_TEXT_MESSAGE })

    const num = Math.min(Math.max(parseInt(count) || 5, 3), 10)
    const userLabel = scope === 'document' ? `Generate ${num} MCQs for the whole document` : `Generate ${num} MCQs for ${ctx.label}`

    const prompt = `Based on ${ctx.label} of "${pdf.title}" below, write exactly ${num} multiple choice questions that test understanding of the material.
"""${ctx.text}"""

Return ONLY valid JSON, no markdown fences, no extra text, in this exact shape:
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."}]}`

    let parsed: any
    try {
        const result = await geminiModel.generateContent(prompt)
        const raw = result.response.text().trim().replace(/```json|```/g, '').trim()
        parsed = JSON.parse(raw)
    } catch (err: any) {
        console.error('[AI] mcq failed:', err.message || err)
        return res.status(503).json({ message: 'Failed to generate MCQs. Please try again.' })
    }
    await recordAiUsage(req.user.id)

    const [userMsg, aiMsg] = await AiMessageModel.create([
        { userId: req.user.id, pdfId, role: 'user', kind: 'mcq', content: userLabel, page },
        { userId: req.user.id, pdfId, role: 'assistant', kind: 'mcq', data: parsed, page }
    ])

    res.json({ data: parsed, userMessage: userMsg, aiMessage: aiMsg })
})

// ─── FLASHCARD GENERATOR ──────────────────────────────────────────────────

export const generateFlashcards = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId, page, scope, selectedText, count } = req.body
    if (!pdfId)
        return res.status(400).json({ message: 'pdfId is required' })

    const pdf = await loadOwnedPdf(pdfId, req.user.id)
    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    const ctx = resolveContext(pdf, page, scope, selectedText)
    if (!ctx.text)
        return res.status(422).json({ message: NO_TEXT_MESSAGE })

    const num = Math.min(Math.max(parseInt(count) || 8, 3), 15)
    const userLabel = scope === 'document' ? `Generate ${num} flashcards for the whole document` : `Generate ${num} flashcards for ${ctx.label}`

    const prompt = `Based on ${ctx.label} of "${pdf.title}" below, write exactly ${num} flashcards (term/question on the front, definition/answer on the back) for spaced-repetition revision.
"""${ctx.text}"""

Return ONLY valid JSON, no markdown fences, no extra text, in this exact shape:
{"flashcards":[{"front":"...","back":"...","category":"concept|definition|formula|example"}]}`

    let parsed: any
    try {
        const result = await geminiModel.generateContent(prompt)
        const raw = result.response.text().trim().replace(/```json|```/g, '').trim()
        parsed = JSON.parse(raw)
    } catch (err: any) {
        console.error('[AI] flashcards failed:', err.message || err)
        return res.status(503).json({ message: 'Failed to generate flashcards. Please try again.' })
    }
    await recordAiUsage(req.user.id)

    const [userMsg, aiMsg] = await AiMessageModel.create([
        { userId: req.user.id, pdfId, role: 'user', kind: 'flashcards', content: userLabel, page },
        { userId: req.user.id, pdfId, role: 'assistant', kind: 'flashcards', data: parsed, page }
    ])

    res.json({ data: parsed, userMessage: userMsg, aiMessage: aiMsg })
})
