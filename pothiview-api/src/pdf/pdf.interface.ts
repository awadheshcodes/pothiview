import mongoose from "mongoose"

export interface PdfInterface {
    _id: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    title: string
    originalName: string
    s3Key: string
    thumbnailUrl?: string | null
    fileSize: number
    totalPages: number
    pages: string[]
    textExtracted: boolean
    lastPage: number
    lastOpenedAt: Date
    planTargetDate?: Date | null
    planPagesPerDay?: number | null
    planStartedAt?: Date | null
    planStartPage?: number | null
}
