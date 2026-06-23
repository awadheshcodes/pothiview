import { Response } from 'express'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uniqueId } from 'uuid'

import Exc from '../util/exc.util'
import s3 from '../util/s3.util'
import { extractPdfPages } from '../util/pdfText.util'
import { computePlanStatus, buildPlanFields } from '../util/planStatus.util'
import { AuthInterface } from '../middleware/guard.middleware'
import PdfModel from './pdf.model'
import HighlightModel from '../reader/highlight.model'
import NoteModel from '../reader/note.model'
import BookmarkModel from '../reader/bookmark.model'
import ProgressModel from '../reader/progress.model'
import AiMessageModel from '../ai/ai.model'

const bucket = () => {
    const b = process.env.BUCKET
    if (!b) throw new Error('BUCKET env variable is not set')
    return b
}

const pdfFolder = () => {
    const f = process.env.PDF_FOLDER
    if (!f) throw new Error('PDF_FOLDER env variable is not set — S3 key would contain "/undefined/"')
    return f
}

const thumbFolder = () => {
    const f = process.env.THUMB_FOLDER
    if (!f) throw new Error('THUMB_FOLDER env variable is not set')
    return f
}

const publicUrl = (key: string) =>
    `https://${bucket()}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

// Attaches a freshly-computed `planStatus` (or null) to a lean/plain pdf
// object. Status is never stored — it's derived from plan fields + today's
// date every time, so "On Track" automatically becomes "Behind" overnight
// without any background job.
const withPlanStatus = (pdf: any) => ({ ...pdf, planStatus: computePlanStatus(pdf) })

// ─── UPLOAD ──────────────────────────────────────────────────────────────
// Files arrive in memory (see pdf.routes.ts) so the same buffer can be used
// both for the S3 PutObject call and for pdf-parse text extraction, without
// downloading the file back from S3 a second time.
export const uploadPdf = Exc(async (req: AuthInterface, res: Response) => {
    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined
    const pdfFile = files?.file?.[0]
    const thumbFile = files?.thumbnail?.[0]

    if (!pdfFile)
        return res.status(400).json({ message: 'No PDF file uploaded' })

    if (pdfFile.mimetype !== 'application/pdf')
        return res.status(400).json({ message: 'Only PDF files are supported' })

    const extracted = await extractPdfPages(pdfFile.buffer)

    const pdfKey = `${pdfFolder()}/${req.user.id}/${uniqueId()}.pdf`
    // No ACL set — modern S3 buckets (Object Ownership: Bucket owner
    // enforced) reject ACLs outright. Default bucket privacy + a presigned
    // GET URL (see getPdf below) is the correct way to serve this file.
    await s3.send(new PutObjectCommand({
        Bucket: bucket(),
        Key: pdfKey,
        Body: pdfFile.buffer,
        ContentType: 'application/pdf'
    }))

    let thumbnailUrl: string | null = null
    if (thumbFile && thumbFile.mimetype.startsWith('image/')) {
        const thumbKey = `${thumbFolder()}/${req.user.id}/${uniqueId()}.jpg`
        // Public read here comes from a bucket policy scoped to the
        // THUMB_FOLDER prefix (see README) — not an object ACL.
        await s3.send(new PutObjectCommand({
            Bucket: bucket(),
            Key: thumbKey,
            Body: thumbFile.buffer,
            ContentType: thumbFile.mimetype
        }))
        thumbnailUrl = publicUrl(thumbKey)
    }

    const titleFromName = pdfFile.originalname.replace(/\.pdf$/i, '').trim() || 'Untitled'

    const doc = await PdfModel.create({
        userId: req.user.id,
        title: (req.body.title && String(req.body.title).trim()) || titleFromName,
        originalName: pdfFile.originalname,
        s3Key: pdfKey,
        thumbnailUrl,
        fileSize: pdfFile.size,
        totalPages: extracted?.numPages || 1,
        pages: extracted?.pages || [],
        textExtracted: !!extracted
    })

    res.status(201).json(withPlanStatus(doc.toObject()))
})

// ─── LIST (library) ────────────────────────────────────────────────────────
export const listPdfs = Exc(async (req: AuthInterface, res: Response) => {
    const pdfs = await PdfModel.find({ userId: req.user.id })
        .select('-pages')
        .sort({ lastOpenedAt: -1 })
        .lean()
    res.json(pdfs.map(withPlanStatus))
})

// ─── FETCH ONE + signed viewing URL ────────────────────────────────────────
export const getPdf = Exc(async (req: AuthInterface, res: Response) => {
    const pdf = await PdfModel.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { lastOpenedAt: new Date() },
        { new: true }
    ).select('-pages')

    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    const Bucket = bucket()
    const Key = pdf.s3Key

    // ── DEBUG ────────────────────────────────────────────────────────────
    console.log('Bucket:', Bucket)
    console.log('Key:', Key)
    console.log('Region:', process.env.AWS_REGION)

    // ── Confirm the object actually exists (and that these credentials can
    // see it) before bothering to sign a URL for it. HeadObject is checked
    // under the exact same Bucket/Key/credentials as the GetObject call
    // below, so whatever it reports is exactly what the signed URL will hit.
    try {
        await s3.send(new HeadObjectCommand({ Bucket, Key }))
    } catch (err: any) {
        const status = err?.$metadata?.httpStatusCode
        console.error('[S3] HeadObject failed:', { Bucket, Key, status, name: err?.name, message: err?.message })

        if (status === 404) {
            return res.status(404).json({
                message: 'File is missing from storage',
                detail: `No object exists at s3://${Bucket}/${Key}. The upload likely never completed, or this record points to a stale/incorrect key.`,
                bucket: Bucket,
                s3Key: Key
            })
        }

        if (status === 403) {
            return res.status(502).json({
                message: 'Storage permission error',
                detail: `S3 returned 403 Access Denied for s3://${Bucket}/${Key}. Check that the IAM user/role for S3_ACCESS_KEY has s3:GetObject (and ideally s3:ListBucket, so missing objects 404 instead of masquerading as 403) on this bucket, and that no bucket policy explicitly denies it.`,
                bucket: Bucket,
                s3Key: Key
            })
        }

        return res.status(502).json({
            message: 'Could not verify file in storage',
            detail: err?.message || 'Unknown S3 error — check AWS_REGION matches the bucket\'s actual region.',
            bucket: Bucket,
            s3Key: Key
        })
    }

    const cmd = new GetObjectCommand({ Bucket, Key })
    // 10 minutes — enough for pdf.js to load the whole document.
    const url = await getSignedUrl(s3, cmd, { expiresIn: 600 })

    console.log('Signed URL:', url)

    res.json(withPlanStatus({ ...pdf.toObject(), url }))
})

// ─── RENAME ─────────────────────────────────────────────────────────────
export const renamePdf = Exc(async (req: AuthInterface, res: Response) => {
    const { title } = req.body
    if (!title || !String(title).trim())
        return res.status(400).json({ message: 'Title is required' })

    const pdf = await PdfModel.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { title: String(title).trim() },
        { new: true }
    ).select('-pages')

    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    res.json(pdf)
})

// ─── POTHIPLAN: set / clear a reading goal ─────────────────────────────
const PRESET_DAYS: Record<string, number> = { '7': 7, '15': 15, '30': 30 }

export const setPlan = Exc(async (req: AuthInterface, res: Response) => {
    const { mode, targetDate: customDateStr } = req.body

    const pdf = await PdfModel.findOne({ _id: req.params.id, userId: req.user.id }).select('-pages')
    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    let targetDate: Date
    if (mode === 'custom') {
        if (!customDateStr)
            return res.status(400).json({ message: 'targetDate is required for a custom goal' })
        targetDate = new Date(customDateStr)
        if (isNaN(targetDate.getTime()))
            return res.status(400).json({ message: 'Invalid target date' })
        // End-of-day so "today" is still a valid (if tight) custom target.
        targetDate.setHours(23, 59, 59, 999)
        if (targetDate.getTime() < Date.now())
            return res.status(400).json({ message: 'Target date must be in the future' })
    } else if (PRESET_DAYS[mode]) {
        targetDate = new Date(Date.now() + PRESET_DAYS[mode] * 86_400_000)
    } else {
        return res.status(400).json({ message: 'mode must be "7", "15", "30", or "custom"' })
    }

    const planFields = buildPlanFields(pdf.totalPages, pdf.lastPage, targetDate)
    Object.assign(pdf, planFields)
    await pdf.save()

    res.json(withPlanStatus(pdf.toObject()))
})

export const clearPlan = Exc(async (req: AuthInterface, res: Response) => {
    const pdf = await PdfModel.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { planTargetDate: null, planPagesPerDay: null, planStartedAt: null, planStartPage: null },
        { new: true }
    ).select('-pages')

    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    res.json(withPlanStatus(pdf.toObject()))
})

// ─── DELETE ─────────────────────────────────────────────────────────────
// Cascades to every piece of reader data tied to this PDF so nothing
// orphaned is left behind for the user (or in S3).
export const deletePdf = Exc(async (req: AuthInterface, res: Response) => {
    const pdf = await PdfModel.findOne({ _id: req.params.id, userId: req.user.id })
    if (!pdf)
        return res.status(404).json({ message: 'PDF not found' })

    await s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key: pdf.s3Key }))

    await Promise.all([
        HighlightModel.deleteMany({ pdfId: pdf._id, userId: req.user.id }),
        NoteModel.deleteMany({ pdfId: pdf._id, userId: req.user.id }),
        BookmarkModel.deleteMany({ pdfId: pdf._id, userId: req.user.id }),
        ProgressModel.deleteMany({ pdfId: pdf._id, userId: req.user.id }),
        AiMessageModel.deleteMany({ pdfId: pdf._id, userId: req.user.id }),
        pdf.deleteOne()
    ])

    res.json({ message: 'PDF deleted' })
})
