import { model, Schema } from 'mongoose'

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdfId: { type: Schema.Types.ObjectId, ref: 'Pdf', required: true },

    role: { type: String, enum: ['user', 'assistant'], required: true },
    kind: { type: String, enum: ['chat', 'summary', 'mcq', 'flashcards'], default: 'chat' },

    content: { type: String, default: '' },        // plain-text answer (chat/summary)
    data: { type: Schema.Types.Mixed, default: null }, // structured payload (mcq/flashcards)

    page: { type: Number },
}, { timestamps: true })

// Sidebar history is always loaded as "this user, this pdf, oldest first".
schema.index({ userId: 1, pdfId: 1, createdAt: 1 })

const AiMessageModel = model('AiMessage', schema)
export default AiMessageModel
