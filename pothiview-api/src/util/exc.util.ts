import { NextFunction, Request, Response } from 'express'

// Wraps async route handlers so unhandled promise rejections are forwarded
// to Express's global error handler (defined at the bottom of index.ts)
// instead of crashing the process or hanging the request.
const Exc = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
}

export default Exc
