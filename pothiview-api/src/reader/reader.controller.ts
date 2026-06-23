import { Response } from 'express'
import Exc from '../util/exc.util'
import { AuthInterface } from '../middleware/guard.middleware'
import HighlightModel from './highlight.model'
import NoteModel from './note.model'
import BookmarkModel from './bookmark.model'
import ProgressModel from './progress.model'
import PdfModel from '../pdf/pdf.model'
import { recordPagesRead } from '../streak/streak.service'
import { recordActivity } from '../stats/activity.service'

// ─── HIGHLIGHTS ─────────────────────────────────────────────────────────

export const createHighlight = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId, page, selectedText, color } = req.body
    if (!pdfId || !page || !selectedText)
        return res.status(400).json({ message: 'pdfId, page and selectedText are required' })

    const highlight = await HighlightModel.create({
        userId: req.user.id,
        pdfId,
        page,
        selectedText: selectedText.trim(),
        color: color || 'yellow',
    })
    recordActivity(req.user.id, 'highlight', pdfId, { page, color: highlight.color }).catch(() => {})
    res.status(201).json(highlight)
})

export const getHighlights = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId } = req.params
    const highlights = await HighlightModel.find({ userId: req.user.id, pdfId }).sort({ page: 1, createdAt: 1 }).lean()
    res.json(highlights)
})

export const deleteHighlight = Exc(async (req: AuthInterface, res: Response) => {
    await HighlightModel.deleteOne({ _id: req.params.id, userId: req.user.id })
    res.json({ success: true })
})

// ─── NOTES ──────────────────────────────────────────────────────────────

export const createNote = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId, page, selectedText, note } = req.body
    if (!pdfId || !page || !note)
        return res.status(400).json({ message: 'pdfId, page and note are required' })

    const doc = await NoteModel.create({
        userId: req.user.id,
        pdfId,
        page,
        selectedText: selectedText?.trim() || '',
        note: note.trim(),
    })
    recordActivity(req.user.id, 'note', pdfId, { page }).catch(() => {})
    res.status(201).json(doc)
})

export const getNotes = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId } = req.params
    const notes = await NoteModel.find({ userId: req.user.id, pdfId }).sort({ page: 1, createdAt: 1 }).lean()
    res.json(notes)
})

export const getAllNotes = Exc(async (req: AuthInterface, res: Response) => {
    const notes = await NoteModel.find({ userId: req.user.id })
        .populate('pdfId', 'title thumbnailUrl')
        .sort({ createdAt: -1 })
        .lean()
    res.json(notes)
})

export const deleteNote = Exc(async (req: AuthInterface, res: Response) => {
    await NoteModel.deleteOne({ _id: req.params.id, userId: req.user.id })
    res.json({ success: true })
})

// ─── BOOKMARKS ──────────────────────────────────────────────────────────

export const createBookmark = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId, page, label } = req.body
    if (!pdfId || !page)
        return res.status(400).json({ message: 'pdfId and page are required' })

    const existing = await BookmarkModel.findOne({ userId: req.user.id, pdfId, page })
    if (existing) {
        await existing.deleteOne()
        return res.json({ removed: true })
    }

    const bookmark = await BookmarkModel.create({ userId: req.user.id, pdfId, page, label: label || '' })
    recordActivity(req.user.id, 'bookmark', pdfId, { page }).catch(() => {})
    res.status(201).json(bookmark)
})

export const getBookmarks = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId } = req.params
    const bookmarks = await BookmarkModel.find({ userId: req.user.id, pdfId }).sort({ page: 1 }).lean()
    res.json(bookmarks)
})

export const deleteBookmark = Exc(async (req: AuthInterface, res: Response) => {
    await BookmarkModel.deleteOne({ _id: req.params.id, userId: req.user.id })
    res.json({ success: true })
})

// ─── READING PROGRESS ───────────────────────────────────────────────────

export const saveProgress = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId, lastPage, totalPages, sessionTimeMs } = req.body
    if (!pdfId || !lastPage)
        return res.status(400).json({ message: 'pdfId and lastPage are required' })

    const pdf = await PdfModel.findOne({ _id: pdfId, userId: req.user.id }).select('lastPage')
    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    // Only the forward movement counts towards PothiStreak — re-saving the
    // same page (a heartbeat) or scrolling back to re-read contributes 0.
    const pagesAdvanced = Math.max(0, lastPage - pdf.lastPage)

    const [progress] = await Promise.all([
        ProgressModel.findOneAndUpdate(
            { userId: req.user.id, pdfId },
            {
                lastPage,
                totalPages: totalPages || 1,
                lastReadAt: new Date(),
                $inc: { readingTimeMs: sessionTimeMs || 0 }
            },
            { upsert: true, new: true }
        ),
        // Denormalized onto the Pdf doc so the library grid can show
        // progress without an extra query per card.
        PdfModel.updateOne(
            { _id: pdfId, userId: req.user.id },
            { lastPage, lastOpenedAt: new Date() }
        )
    ])

    await recordPagesRead(req.user.id, pagesAdvanced)

    // Activity feed entry — only on genuine forward progress, same
    // threshold as the streak credit, so a heartbeat re-save or scrolling
    // back doesn't spam "Read 0 pages" into the feed.
    if (pagesAdvanced > 0) {
        recordActivity(req.user.id, 'pages_read', pdfId, { pages: pagesAdvanced, lastPage }).catch(() => {})
    }

    res.json(progress)
})

export const getProgress = Exc(async (req: AuthInterface, res: Response) => {
    const { pdfId } = req.params
    const progress = await ProgressModel.findOne({ userId: req.user.id, pdfId }).lean()
    res.json(progress || { lastPage: 1, totalPages: 1, readingTimeMs: 0 })
})
