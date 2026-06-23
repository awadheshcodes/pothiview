import mongoose from "mongoose"

export interface UserInterface {
    _id: mongoose.Types.ObjectId
    fullname: string
    email: string
    password?: string
    googleId?: string
    avatar?: string
    authProvider?: 'local' | 'google'
    settings?: {
        theme?: 'light' | 'dark'
        dailyGoalPages?: number
        notifications?: boolean
    }
    createdAt?: Date
}
