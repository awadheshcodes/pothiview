import rateLimit from 'express-rate-limit'

export const AiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many AI requests. Please wait a moment and try again.' }
})
