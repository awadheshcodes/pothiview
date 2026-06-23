import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'

/**
 * Rendered as the `content` of a react-toastify toast() call — the
 * toast container handles the slide-in/out, this component handles the
 * little pop/spin flourish on the badge icon itself.
 */
const AchievementToast = ({ badge }) => {
  const Icon = Icons[badge.icon] || Icons.Award

  return (
    <div className="flex items-center gap-3 py-0.5">
      <motion.div
        initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-brand-600 flex items-center justify-center shrink-0 shadow-soft"
      >
        <Icon size={18} className="text-white" strokeWidth={2.25} />
      </motion.div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Achievement Unlocked</p>
        <p className="text-sm font-semibold text-ink leading-snug truncate">{badge.label}</p>
      </div>
    </div>
  )
}

export default AchievementToast
