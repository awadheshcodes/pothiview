import { model, Schema } from 'mongoose'

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdfId: { type: Schema.Types.ObjectId, ref: 'Pdf', required: true },
    page: { type: Number, required: true },
    label: { type: String, trim: true, maxlength: 200, default: '' },
}, { timestamps: true })

schema.index({ userId: 1, pdfId: 1 })

const BookmarkModel = model('Bookmark', schema)
export default BookmarkModel
