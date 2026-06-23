import express from 'express'
const ReaderRouter = express.Router()
import { UserGuard } from '../middleware/guard.middleware'
import {
    createHighlight, getHighlights, deleteHighlight,
    createNote, getNotes, getAllNotes, deleteNote,
    createBookmark, getBookmarks, deleteBookmark,
    saveProgress, getProgress,
} from './reader.controller'

// Highlights
ReaderRouter.post('/highlight', UserGuard, createHighlight)
ReaderRouter.get('/highlight/:pdfId', UserGuard, getHighlights)
ReaderRouter.delete('/highlight/:id', UserGuard, deleteHighlight)

// Notes
ReaderRouter.post('/note', UserGuard, createNote)
ReaderRouter.get('/note/:pdfId', UserGuard, getNotes)
ReaderRouter.get('/notes/all', UserGuard, getAllNotes)
ReaderRouter.delete('/note/:id', UserGuard, deleteNote)

// Bookmarks
ReaderRouter.post('/bookmark', UserGuard, createBookmark)
ReaderRouter.get('/bookmark/:pdfId', UserGuard, getBookmarks)
ReaderRouter.delete('/bookmark/:id', UserGuard, deleteBookmark)

// Reading progress
ReaderRouter.post('/progress', UserGuard, saveProgress)
ReaderRouter.get('/progress/:pdfId', UserGuard, getProgress)

export default ReaderRouter
