import express from 'express'
import multer from 'multer'
const PdfRouter = express.Router()

import { UserGuard } from '../middleware/guard.middleware'
import { uploadPdf, listPdfs, getPdf, renamePdf, deletePdf, setPlan, clearPlan } from './pdf.controller'

// Memory storage (not multer-s3) — we need the raw buffer twice: once for
// the S3 upload, once for pdf-parse text extraction. 60MB covers the vast
// majority of scanned textbooks/notes without risking memory pressure.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 60 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'file' && file.mimetype !== 'application/pdf')
            return cb(new Error('Only PDF files are supported'))
        if (file.fieldname === 'thumbnail' && !file.mimetype.startsWith('image/'))
            return cb(new Error('Thumbnail must be an image'))
        cb(null, true)
    }
})

const uploadFields = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
])

PdfRouter.get('/', UserGuard, listPdfs)
PdfRouter.post('/', UserGuard, uploadFields, uploadPdf)
PdfRouter.get('/:id', UserGuard, getPdf)
PdfRouter.patch('/:id', UserGuard, renamePdf)
PdfRouter.delete('/:id', UserGuard, deletePdf)

// PothiPlan
PdfRouter.post('/:id/plan', UserGuard, setPlan)
PdfRouter.delete('/:id/plan', UserGuard, clearPlan)

export default PdfRouter
