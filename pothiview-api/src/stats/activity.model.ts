import { model, Schema } from 'mongoose'

// A lightweight, append-only event log that powers the "Recent Activity"
// feed on the Reading Stats page. Intentionally coarse (a handful of
// types) rather than a full audit log — the only consumer is "show me
// the last N things I did", not analytics or compliance.
const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['highlight', 'note', 'bookmark', 'pages_read', 'achievement'],
        required: true
    },
    pdfId: { type: Schema.Types.ObjectId, ref: 'Pdf', default: null },
    // Free-form per-type payload — e.g. { pages: 3 } for pages_read,
    // { badgeLabel, badgeIcon } for achievement, { page, color } for
    // highlight, etc. Schemaless since the feed only ever reads it back
    // to build a sentence, never queries into it.
    meta: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })

// Most-recent-first is the only access pattern this is ever read with.
schema.index({ userId: 1, createdAt: -1 })

const ActivityModel = model('Activity', schema)
export default ActivityModel
