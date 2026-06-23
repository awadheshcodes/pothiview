const DAY_MS = 86_400_000

export type PlanStatusLabel = 'ahead' | 'on_track' | 'behind' | 'completed'

export interface PlanStatus {
    targetDate: Date
    pagesPerDay: number
    todayGoal: number          // same as pagesPerDay — the daily target, surfaced under a clearer name for the UI
    daysRemaining: number       // 0 once the target date has passed
    pagesRemaining: number
    expectedPage: number        // where the reader "should" be today to stay on schedule
    status: PlanStatusLabel
}

// A PDF only has a plan if all four fields were set together by setPlan —
// treat any missing piece as "no plan" rather than guessing.
export const hasPlan = (pdf: { planTargetDate?: Date | null; planPagesPerDay?: number | null; planStartedAt?: Date | null; planStartPage?: number | null }) =>
    !!(pdf.planTargetDate && pdf.planPagesPerDay && pdf.planStartedAt && pdf.planStartPage != null)

// Returns null when no plan is set. Pure function of stored fields + "now",
// so status is always fresh even though nothing is re-saved between reads.
export const computePlanStatus = (pdf: {
    totalPages: number
    lastPage: number
    planTargetDate?: Date | null
    planPagesPerDay?: number | null
    planStartedAt?: Date | null
    planStartPage?: number | null
}): PlanStatus | null => {
    if (!hasPlan(pdf)) return null

    const targetDate = pdf.planTargetDate as Date
    const pagesPerDay = pdf.planPagesPerDay as number
    const startedAt = pdf.planStartedAt as Date
    const startPage = pdf.planStartPage as number

    const now = Date.now()
    const startOfStartDay = new Date(startedAt).setHours(0, 0, 0, 0)
    const startOfToday = new Date().setHours(0, 0, 0, 0)

    // Day 1 is the day the plan was created — so "today's goal" exists
    // from the moment the reader sets the plan, not the day after.
    const daysElapsed = Math.max(1, Math.floor((startOfToday - startOfStartDay) / DAY_MS) + 1)

    const expectedPage = Math.min(pdf.totalPages, startPage - 1 + pagesPerDay * daysElapsed)
    const actualPage = pdf.lastPage

    const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - now) / DAY_MS))
    const pagesRemaining = Math.max(0, pdf.totalPages - actualPage)

    let status: PlanStatusLabel
    if (actualPage >= pdf.totalPages) {
        status = 'completed'
    } else if (actualPage > expectedPage) {
        status = 'ahead'
    } else if (actualPage === expectedPage) {
        status = 'on_track'
    } else {
        status = 'behind'
    }

    return {
        targetDate,
        pagesPerDay,
        todayGoal: pagesPerDay,
        daysRemaining,
        pagesRemaining,
        expectedPage,
        status,
    }
}

// Shared by setPlan (7/15/30/custom) — turns a chosen target date into a
// stored plan. Always restarts the pace calculation from the reader's
// current position, not page 1, so setting a goal partway through a book
// still produces a sane daily target.
export const buildPlanFields = (totalPages: number, currentPage: number, targetDate: Date) => {
    const now = new Date()
    const daysTotal = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / DAY_MS))
    const pagesLeft = Math.max(1, totalPages - currentPage + 1)
    const pagesPerDay = Math.max(1, Math.ceil(pagesLeft / daysTotal))

    return {
        planTargetDate: targetDate,
        planPagesPerDay: pagesPerDay,
        planStartedAt: now,
        planStartPage: currentPage,
    }
}
