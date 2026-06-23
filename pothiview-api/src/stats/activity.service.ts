import ActivityModel from './activity.model'

// Fire-and-forget logging — call sites intentionally don't `await` this
// inline with their main response, and always `.catch(() => {})` it, so a
// logging hiccup (or a transient Mongo blip) never breaks the highlight /
// note / bookmark / progress save it's attached to. The Activity feed is a
// nice-to-have; the primary action it accompanies is not.
export const recordActivity = (
    userId: string,
    type: 'highlight' | 'note' | 'bookmark' | 'pages_read' | 'achievement',
    pdfId: string | null,
    meta: Record<string, any> = {}
) => ActivityModel.create({ userId, type, pdfId: pdfId || null, meta })
