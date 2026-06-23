import { model, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

const schema = new Schema({
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        trim: true,
        // Not required for Google-only accounts (authProvider: 'google'),
        // since they never set a password. Local signup still enforces a
        // password value via the controller's own validation.
        required: function (this: any) {
            return this.authProvider !== 'google'
        }
    },
    // Google's stable per-account identifier ("sub" claim). `sparse` keeps
    // the unique index from colliding on `null` across local-only users.
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    avatar: {
        type: String,
        trim: true,
        default: ''
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    // ── Settings page preferences ──────────────────────────────────────
    // theme: default reader appearance (Reader still lets you flip it
    // per-session — this is just the default it opens with).
    // dailyGoalPages: generic "pages today" target shown on the Library
    // dashboard, independent of any per-book PothiPlan.
    // notifications: in-app reminder preference (streak/goal nudges).
    settings: {
        theme: { type: String, enum: ['light', 'dark'], default: 'light' },
        dailyGoalPages: { type: Number, default: 20, min: 1, max: 500 },
        notifications: { type: Boolean, default: true }
    }
}, { timestamps: true })

// Only hash the password when it's actually being modified — prevents
// double-hashing a password that's already hashed on subsequent saves.
// Google-only accounts have no password at all, so skip hashing entirely.
schema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next()
    this.password = await bcrypt.hash(this.password.toString(), 12)
    next()
})

const UserModel = model('User', schema)
export default UserModel
