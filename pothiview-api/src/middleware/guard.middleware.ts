import { NextFunction, Request, Response } from "express"
import Exc from "../util/exc.util"
import jwt from 'jsonwebtoken'

export interface AuthInterface extends Request {
    user: any
}

const isProd = () => process.env.NODE_ENV !== "dev"

// No `domain` attribute: the browser scopes the cookie to whichever host
// actually set it (the API). That's exactly what we want for a separate
// frontend-domain + API-domain deployment — no extra env var needed, and
// no risk of misconfiguring it with a full URL instead of a bare hostname.
const cookieOptions = () => ({
    secure: isProd(),
    httpOnly: true,
    sameSite: (isProd() ? 'none' : 'lax') as 'none' | 'lax'
})

const expireSession = (res: Response) => {
    res.cookie('accessToken', '', { ...cookieOptions(), maxAge: 0 })
    res.cookie('refreshToken', '', { ...cookieOptions(), maxAge: 0 })
    res.status(401).json({ message: 'Unauthorized' })
}

// Safely verify a JWT — returns payload or null (does not throw)
const verifyToken = (token: string, secret: string): any | null => {
    try {
        return jwt.verify(token, secret)
    } catch {
        return null
    }
}

// Protects any route that requires a logged-in user.
export const UserGuard = Exc(async (req: AuthInterface, res: Response, next: NextFunction) => {
    const { accessToken } = req.cookies
    if (!accessToken) return expireSession(res)

    const payload = verifyToken(accessToken, process.env.AUTH_SECRET as string)
    if (!payload) return expireSession(res)

    req.user = payload
    next()
})

// Used only by the refresh-token endpoint, which reads the longer-lived
// refresh cookie instead of the access cookie.
export const RefreshTokenGuard = Exc(async (req: AuthInterface, res: Response, next: NextFunction) => {
    const { refreshToken } = req.cookies
    if (!refreshToken) return expireSession(res)

    const payload = verifyToken(refreshToken, process.env.RT_SECRET as string)
    if (!payload) return expireSession(res)

    req.user = payload
    next()
})

export { cookieOptions, isProd, verifyToken }
