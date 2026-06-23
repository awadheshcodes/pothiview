import express from 'express'
import rateLimit from 'express-rate-limit'
const UserRouter = express.Router()

import { signup, login, logout, session, refresh, googleAuth, bootstrap, updateSettings, updateProfile } from './user.controller'
import { UserGuard, RefreshTokenGuard } from '../middleware/guard.middleware'

// Brute-force protection on the credential-checking endpoints.
const AuthRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes.' }
})

UserRouter.post('/signup', AuthRateLimiter, signup)
UserRouter.post('/login', AuthRateLimiter, login)
UserRouter.post('/google', AuthRateLimiter, googleAuth)
UserRouter.get('/session', UserGuard, session)
UserRouter.get('/bootstrap', bootstrap)
UserRouter.get('/logout', logout)
UserRouter.get('/refresh-token', RefreshTokenGuard, refresh)
UserRouter.patch('/settings', UserGuard, updateSettings)
UserRouter.patch('/profile', UserGuard, updateProfile)

export default UserRouter
