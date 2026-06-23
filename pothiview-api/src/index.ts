import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'

mongoose.connect(process.env.DB as string)
    .then(() => console.log('MongoDB connected ✓'))
    .catch((err) => console.error('MongoDB connection failed:', err))

import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
const app = express()

const PORT = process.env.PORT || 8080

const allowedOrigins = [
    'http://localhost:5173',
    process.env.CLIENT_ORIGIN as string
].filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no Origin header (mobile apps, curl, Postman).
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('CORS blocked'))
        }
    },
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

import UserRouter from './user/user.routes'
app.use('/user', UserRouter)

import PdfRouter from './pdf/pdf.routes'
app.use('/pdf', PdfRouter)

import ReaderRouter from './reader/reader.routes'
app.use('/reader', ReaderRouter)

import AiRouter from './ai/ai.routes'
app.use('/ai', AiRouter)

import StreakRouter from './streak/streak.routes'
app.use('/streak', StreakRouter)

import StatsRouter from './stats/stats.routes'
app.use('/stats', StatsRouter)

app.get('/health', (req, res) => res.json({ ok: true }))

// Global error handler — catches anything forwarded via next(err), including
// errors raised inside Exc-wrapped async handlers and multer file rejections.
app.use((
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.error('[ERROR]', err.message || err)

    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e: any) => e.message)
        res.status(400).json({ message: messages[0] || 'Validation failed' })
        return
    }

    if (err.name === 'CastError') {
        res.status(400).json({ message: 'Invalid ID format' })
        return
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        res.status(401).json({ message: 'Unauthorized' })
        return
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field'
        res.status(409).json({ message: `${field} already exists` })
        return
    }

    // Multer errors (file too large, wrong field, etc.)
    if (err.name === 'MulterError') {
        res.status(400).json({ message: err.message })
        return
    }

    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'dev'
            ? err.message
            : 'Something went wrong. Please try again.'
    })
})

app.listen(PORT, () => console.log(`PothiView API running on port ${PORT} ✓`))
