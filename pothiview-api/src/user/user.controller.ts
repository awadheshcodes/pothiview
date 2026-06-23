import UserModel from './user.model'
import { Request, Response } from 'express'
import Exc from '../util/exc.util'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { UserInterface } from './user.interface'
import { AuthInterface, cookieOptions, verifyToken } from '../middleware/guard.middleware'

const FIFTEEN_MINUTES = 900_000
// The refresh cookie is what makes "stay logged in until I log out" work —
// every successful /refresh-token or /bootstrap call reissues it with a
// fresh 30-day window, so an active user effectively never gets logged out
// just from time passing, only from explicitly hitting Logout.
const THIRTY_DAYS = 2_592_000_000

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const DEFAULT_SETTINGS = { theme: 'light', dailyGoalPages: 20, notifications: true }

// Shape returned to the frontend for any "here's the logged-in user" response
// — signup, login, Google auth, and session check all use this. Typed `any`
// since callers pass both live Mongoose documents and decoded JWT payloads.
const toPublicUser = (user: any) => ({
    id: user._id ?? user.id,
    fullname: user.fullname,
    email: user.email,
    avatar: user.avatar || '',
    authProvider: user.authProvider || 'local',
    settings: { ...DEFAULT_SETTINGS, ...(user.settings || {}) },
    createdAt: user.createdAt || null
})

const getTokens = (user: any) => {
    const payload = {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        avatar: user.avatar || '',
        authProvider: user.authProvider || 'local',
        settings: { ...DEFAULT_SETTINGS, ...(user.settings || {}) },
        createdAt: user.createdAt || null
    }

    const accessToken = jwt.sign(payload, process.env.AUTH_SECRET as string, { expiresIn: '15m' })
    const refreshToken = jwt.sign(payload, process.env.RT_SECRET as string, { expiresIn: '30d' })

    return { accessToken, refreshToken }
}

const setCookies = (res: Response, accessToken: string, refreshToken: string) => {
    res.cookie('accessToken', accessToken, { ...cookieOptions(), maxAge: FIFTEEN_MINUTES })
    res.cookie('refreshToken', refreshToken, { ...cookieOptions(), maxAge: THIRTY_DAYS })
}

const clearCookies = (res: Response) => {
    res.cookie('accessToken', '', { ...cookieOptions(), maxAge: 0 })
    res.cookie('refreshToken', '', { ...cookieOptions(), maxAge: 0 })
}

export const signup = Exc(async (req: Request, res: Response) => {
    const { fullname, email, password } = req.body

    if (!fullname || !String(fullname).trim())
        return res.status(400).json({ message: 'Full name is required' })

    if (!email || !String(email).trim())
        return res.status(400).json({ message: 'Email is required' })

    if (!password || String(password).length < 6)
        return res.status(400).json({ message: 'Password must be at least 6 characters' })

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() })
    if (existing)
        return res.status(409).json({ message: 'An account with this email already exists' })

    const user = new UserModel({
        fullname: String(fullname).trim(),
        email: String(email).toLowerCase().trim(),
        password,
        authProvider: 'local'
    })
    await user.save()

    const { accessToken, refreshToken } = getTokens(user)
    setCookies(res, accessToken, refreshToken)

    res.status(201).json({
        message: 'Account created',
        user: toPublicUser(user)
    })
})

export const login = Exc(async (req: Request, res: Response) => {
    const { email, password } = req.body

    if (!email || !password)
        return res.status(400).json({ message: 'Email and password are required' })

    const user = await UserModel.findOne({ email: String(email).toLowerCase().trim() })
    if (!user)
        return res.status(404).json({ message: 'No account found with this email' })

    if (!user.password)
        return res.status(400).json({ message: 'This account uses Google Sign-In. Please continue with Google.' })

    const matches = await bcrypt.compare(password, user.password)
    if (!matches)
        return res.status(401).json({ message: 'Incorrect password' })

    const { accessToken, refreshToken } = getTokens(user)
    setCookies(res, accessToken, refreshToken)

    res.json({
        message: 'Logged in',
        user: toPublicUser(user)
    })
})

export const googleAuth = Exc(async (req: Request, res: Response) => {
    const { credential } = req.body

    if (!credential)
        return res.status(400).json({ message: 'Missing Google credential' })

    if (!process.env.GOOGLE_CLIENT_ID)
        return res.status(500).json({ message: 'Google Sign-In is not configured' })

    let payload
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        })
        payload = ticket.getPayload()
    } catch {
        return res.status(401).json({ message: 'Invalid or expired Google credential' })
    }

    if (!payload || !payload.email)
        return res.status(401).json({ message: 'Invalid Google credential' })

    if (!payload.email_verified)
        return res.status(401).json({ message: 'Google account email is not verified' })

    const googleId = payload.sub
    const email = payload.email.toLowerCase().trim()
    const fullname = payload.name || email.split('@')[0]
    const avatar = payload.picture || ''

    // 1) Already linked by googleId → straight login.
    let user = await UserModel.findOne({ googleId })

    if (!user) {
        // 2) No googleId match, but an account with this email already
        //    exists (e.g. they originally signed up with a password) →
        //    link the Google identity onto that same account.
        user = await UserModel.findOne({ email })

        if (user) {
            user.googleId = googleId
            user.avatar = user.avatar || avatar
            await user.save()
        } else {
            // 3) First time we've seen this person at all → create a new
            //    Google-only account. No password is set.
            user = new UserModel({
                fullname,
                email,
                googleId,
                avatar,
                authProvider: 'google'
            })
            await user.save()
        }
    }

    const { accessToken, refreshToken } = getTokens(user)
    setCookies(res, accessToken, refreshToken)

    res.json({
        message: 'Logged in with Google',
        user: toPublicUser(user)
    })
})

export const session = Exc(async (req: AuthInterface, res: Response) => {
    res.json(toPublicUser(req.user))
})

// Called once when the app boots (page load / refresh / browser restart /
// back-navigation into the SPA). This is the actual fix for "refreshing
// looks like a logout": the access token is intentionally short-lived
// (15 min) for security, so on its own `/session` will 401 the moment it
// expires. `/bootstrap` tries the access token first, and — only if that's
// missing or expired — falls back to the much longer-lived refresh token
// before giving up. A real logged-out visitor still gets a clean 401.
export const bootstrap = Exc(async (req: Request, res: Response) => {
    const { accessToken, refreshToken } = req.cookies

    if (accessToken) {
        const payload = verifyToken(accessToken, process.env.AUTH_SECRET as string)
        if (payload) return res.json(toPublicUser(payload))
    }

    if (refreshToken) {
        const payload = verifyToken(refreshToken, process.env.RT_SECRET as string)
        if (payload) {
            const user = await UserModel.findById(payload.id)
            if (user) {
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = getTokens(user)
                setCookies(res, newAccessToken, newRefreshToken)
                return res.json(toPublicUser(user))
            }
        }
    }

    clearCookies(res)
    res.status(401).json({ message: 'Not authenticated' })
})

export const logout = Exc(async (req: Request, res: Response) => {
    clearCookies(res)
    res.json({ message: 'Logged out' })
})

// Settings page: theme / daily reading goal / notification preference.
// Re-issues tokens (same pattern as /refresh-token) so the change is
// reflected immediately — bootstrap reads straight from the access-token
// payload, so without this the new value wouldn't show until the next
// natural token refresh.
export const updateSettings = Exc(async (req: AuthInterface, res: Response) => {
    const { theme, dailyGoalPages, notifications } = req.body

    if (theme !== undefined && !['light', 'dark'].includes(theme))
        return res.status(400).json({ message: 'theme must be "light" or "dark"' })

    if (dailyGoalPages !== undefined) {
        const n = Number(dailyGoalPages)
        if (!Number.isFinite(n) || n < 1 || n > 500)
            return res.status(400).json({ message: 'dailyGoalPages must be between 1 and 500' })
    }

    const user = await UserModel.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.settings = {
        theme: theme !== undefined ? theme : (user.settings?.theme || 'light'),
        dailyGoalPages: dailyGoalPages !== undefined ? Number(dailyGoalPages) : (user.settings?.dailyGoalPages ?? 20),
        notifications: notifications !== undefined ? Boolean(notifications) : (user.settings?.notifications ?? true)
    }
    await user.save()

    const { accessToken, refreshToken } = getTokens(user)
    setCookies(res, accessToken, refreshToken)

    res.json(toPublicUser(user))
})

// Profile page: full name only for now — email is the account identifier
// and avatar is either Google-provided or left blank, neither editable here.
export const updateProfile = Exc(async (req: AuthInterface, res: Response) => {
    const { fullname } = req.body
    if (!fullname || !String(fullname).trim())
        return res.status(400).json({ message: 'Full name is required' })

    const user = await UserModel.findByIdAndUpdate(
        req.user.id,
        { fullname: String(fullname).trim() },
        { new: true }
    )
    if (!user) return res.status(404).json({ message: 'User not found' })

    const { accessToken, refreshToken } = getTokens(user)
    setCookies(res, accessToken, refreshToken)

    res.json(toPublicUser(user))
})

export const refresh = Exc(async (req: AuthInterface, res: Response) => {
    const user = await UserModel.findById(req.user.id)
    if (!user) {
        clearCookies(res)
        return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }

    const { accessToken, refreshToken } = getTokens(user)
    setCookies(res, accessToken, refreshToken)

    res.json({ message: 'Session refreshed' })
})
