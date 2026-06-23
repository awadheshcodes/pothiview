import { model, Schema } from 'mongoose'

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (UTC)
    pagesRead: { type: Number, default: 0 }, // pages advanced today, summed across all PDFs
    aiUsed: { type: Boolean, default: false },
    streakCredited: { type: Boolean, default: false }, // true once today already counted towards the streak
}, { timestamps: true })

schema.index({ userId: 1, date: 1 }, { unique: true })

const DailyActivityModel = model('DailyActivity', schema)
export default DailyActivityModel
