import { model, Schema } from 'mongoose'

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdfId: { type: Schema.Types.ObjectId, ref: 'Pdf', required: true },
    lastPage: { type: Number, default: 1 },
    totalPages: { type: Number, default: 1 },
    readingTimeMs: { type: Number, default: 0 }, // cumulative
    lastReadAt: { type: Date, default: Date.now },
}, { timestamps: true })

schema.index({ userId: 1, pdfId: 1 }, { unique: true })

const ProgressModel = model('ReadingProgress', schema)
export default ProgressModel
