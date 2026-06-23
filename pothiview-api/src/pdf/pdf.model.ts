import { model, Schema } from 'mongoose'

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    originalName: { type: String, required: true },

    s3Key: { type: String, required: true },     // private — PDF bytes, fetched via signed URL
    thumbnailUrl: { type: String, default: null }, // public-read cover image, direct URL

    fileSize: { type: Number, required: true },    // bytes
    totalPages: { type: Number, default: 1 },

    pages: { type: [String], default: [] },        // per-page extracted text, capped — used by AI features
    textExtracted: { type: Boolean, default: false },

    // Denormalized so the library grid can show progress without a join.
    lastPage: { type: Number, default: 1 },
    lastOpenedAt: { type: Date, default: Date.now },

    // ── PothiPlan ──────────────────────────────────────────────────
    // All null until the reader sets a target ("finish by" goal). Status
    // (on track / ahead / behind) is derived at read-time from these plus
    // lastPage — never stored, since it changes every day even if nothing
    // else does.
    planTargetDate: { type: Date, default: null },
    planPagesPerDay: { type: Number, default: null },
    planStartedAt: { type: Date, default: null },
    planStartPage: { type: Number, default: null }, // lastPage at the moment the plan was created
}, { timestamps: true })

schema.index({ userId: 1, createdAt: -1 })

const PdfModel = model('Pdf', schema)
export default PdfModel
