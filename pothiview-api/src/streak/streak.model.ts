import { model, Schema } from 'mongoose'

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    // YYYY-MM-DD (UTC) of the last day that was credited towards the streak.
    // Used to tell "continued today", "continues an unbroken streak from
    // yesterday", and "streak lapsed" apart.
    lastActiveDate: { type: String, default: null },
}, { timestamps: true })

const StreakModel = model('Streak', schema)
export default StreakModel
