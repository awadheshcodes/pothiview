import { motion } from 'framer-motion'

/**
 * ProgressRing — animated circular progress indicator.
 * Used for level/XP, streak credit, and per-document reading progress.
 */
const ProgressRing = ({
  pct = 0,
  size = 44,
  stroke = 4,
  color = '#2F7A60',
  trackColor = '#E8E3D8',
  children,
}) => {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={false}
          animate={{ strokeDashoffset: circ - (clamped / 100) * circ }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

export default ProgressRing
