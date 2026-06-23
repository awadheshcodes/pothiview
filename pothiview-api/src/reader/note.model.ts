import { model, Schema } from 'mongoose'

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdfId: { type: Schema.Types.ObjectId, ref: 'Pdf', required: true },
    page: { type: Number, required: true },
    selectedText: { type: String, trim: true, maxlength: 5000, default: '' },
    note: { type: String, required: true, trim: true, maxlength: 10000 },
}, { timestamps: true })

schema.index({ userId: 1, pdfId: 1 })

const NoteModel = model('Note', schema)
export default NoteModel
