import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import BrandLink from '../components/BrandLink'
import GoogleAuthButton from '../components/GoogleAuthButton'
import { useAuth } from '../lib/AuthContext'

/* ── Animation variants ─────────────────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.22, ease: [0.55, 0, 1, 0.45] },
  },
}

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.45, ease: 'easeInOut' },
  },
  rest: { x: 0 },
}

const errorVariants = {
  hidden: { opacity: 0, y: -6, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: { duration: 0.22, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -4,
    height: 0,
    transition: { duration: 0.18 },
  },
}

const successVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
}

/* ── Spinner ─────────────────────────────────────────────────────────── */
const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)

/* ── Checkmark SVG ───────────────────────────────────────────────────── */
const CheckIcon = () => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 text-white"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: 1 }}
    transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
  >
    <motion.polyline points="20 6 9 17 4 12" />
  </motion.svg>
)

/* ── Password strength bar ───────────────────────────────────────────── */
const getStrength = (pw) => {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-teal-400', 'bg-emerald-500']

const PasswordStrength = ({ password }) => {
  const str = getStrength(password)
  if (!password) return null
  return (
    <motion.div
      className="mt-2 space-y-1"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= str ? strengthColor[str] : 'bg-ink/[0.08]'
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            style={{ transformOrigin: 'left' }}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${str <= 1 ? 'text-red-500' : str === 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
        {strengthLabel[str]}
      </p>
    </motion.div>
  )
}

/* ── Main Component ─────────────────────────────────────────────────── */
const Signup = () => {
  const { user, loading: authLoading, signup } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ fullname: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const onChange = (e) => {
    setErrorMsg('')
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  const triggerShake = (msg) => {
    setErrorMsg(msg)
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) {
      triggerShake('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      await signup(form.fullname, form.email, form.password)
      // Show success state for 600ms before redirecting
      setSuccess(true)
      setTimeout(() => navigate('/library'), 700)
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong'
      triggerShake(msg)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return <div className="min-h-screen bg-paper" />
  if (user) return <Navigate to="/library" replace />

  return (
    <motion.div
      className="min-h-screen bg-paper flex items-center justify-center px-4"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <BrandLink size={32} />
        </motion.div>

        {/* Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-soft border border-ink/[0.06] p-7 relative overflow-hidden"
          variants={shakeVariants}
          animate={shake ? 'shake' : 'rest'}
        >
          {/* Success overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white rounded-2xl gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center"
                  variants={successVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <CheckIcon />
                </motion.div>
                <motion.p
                  className="text-sm font-medium text-ink"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                >
                  Account created!
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <h1 className="font-serif text-2xl font-semibold text-ink text-center mb-1">
            Create your account
          </h1>
          <p className="text-sm text-ink-soft text-center mb-6">
            Free to start. Bring your own PDFs.
          </p>

          <GoogleAuthButton onSuccess={() => {
            setSuccess(true)
            setTimeout(() => navigate('/library'), 700)
          }} />

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-ink/[0.08]" />
            <span className="text-xs font-medium text-ink-faint uppercase tracking-wide">or</span>
            <div className="h-px flex-1 bg-ink/[0.08]" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Full name</label>
              <input
                name="fullname"
                value={form.fullname}
                onChange={onChange}
                placeholder="Jordan Lee"
                autoComplete="name"
                className="rounded-xl border border-ink/[0.12] px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none
                           focus:border-brand-500 focus:ring-2 focus:ring-brand-100
                           transition-all duration-200"
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="you@example.com"
                autoComplete="email"
                className="rounded-xl border border-ink/[0.12] px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none
                           focus:border-brand-500 focus:ring-2 focus:ring-brand-100
                           transition-all duration-200"
                required
              />
            </div>

            {/* Password + strength */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="rounded-xl border border-ink/[0.12] px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none
                           focus:border-brand-500 focus:ring-2 focus:ring-brand-100
                           transition-all duration-200"
                required
              />
              <AnimatePresence>
                {form.password && <PasswordStrength password={form.password} />}
              </AnimatePresence>
            </div>

            {/* Inline error */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.p
                  key={errorMsg}
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-xs text-red-600 font-medium -mt-1 overflow-hidden"
                >
                  {errorMsg}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || success}
              className="mt-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium text-sm
                         disabled:opacity-60 flex items-center justify-center gap-2
                         transition-colors duration-150"
              whileHover={!loading && !success ? { backgroundColor: 'var(--color-brand-700, #1e5c41)' } : {}}
              whileTap={!loading && !success ? { scale: 0.98 } : {}}
              transition={{ duration: 0.12 }}
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Creating account…</span>
                </>
              ) : (
                'Create account'
              )}
            </motion.button>
          </form>
        </motion.div>

        <motion.p
          className="text-center text-sm text-ink-soft mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          Already have an account?{' '}
          <Link to="/login" className="text-brand-700 font-medium hover:underline transition-colors">
            Sign in
          </Link>
        </motion.p>
      </div>
    </motion.div>
  )
}

export default Signup
