import { model, Schema } from 'mongoose'

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdfId: { type: Schema.Types.ObjectId, ref: 'Pdf', required: true },
    page: { type: Number, required: true },
    selectedText: { type: String, required: true, trim: true, maxlength: 5000 },
    color: { type: String, enum: ['yellow', 'green', 'blue', 'pink'], default: 'yellow' },
}, { timestamps: true })

schema.index({ userId: 1, pdfId: 1 })

const HighlightModel = model('Highlight', schema)
export default HighlightModel
