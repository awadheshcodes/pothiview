import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Sun, Moon, Target, Bell, User, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import InstallAppButton from '../components/InstallAppButton'

const Row = ({ label, description, children }) => (
  <div className="flex items-center justify-between gap-4 py-4">
    <div className="min-w-0">
      <p className="text-sm font-medium text-ink">{label}</p>
      {description && <p className="text-xs text-ink-faint mt-0.5">{description}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
)

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-brand-600' : 'bg-ink/15'}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
  </button>
)

const Settings = () => {
  const { user, updateSettings, logout } = useAuth()
  const [goalDraft, setGoalDraft] = useState(user?.settings?.dailyGoalPages ?? 20)
  const [savingGoal, setSavingGoal] = useState(false)

  const theme = user?.settings?.theme || 'light'
  const notifications = user?.settings?.notifications ?? true

  const onThemeChange = async (next) => {
    if (next === theme) return
    try {
      await updateSettings({ theme: next })
    } catch {
      toast.error('Could not update theme')
    }
  }

  const onNotificationsChange = async (next) => {
    try {
      await updateSettings({ notifications: next })
      toast.success(next ? 'Reminders turned on' : 'Reminders turned off', { autoClose: 1800 })
    } catch {
      toast.error('Could not update notifications')
    }
  }

  const onGoalBlur = async () => {
    const n = Math.max(1, Math.min(500, parseInt(goalDraft, 10) || 20))
    setGoalDraft(n)
    if (n === user?.settings?.dailyGoalPages) return
    setSavingGoal(true)
    try {
      await updateSettings({ dailyGoalPages: n })
      toast.success('Daily goal updated', { autoClose: 1800 })
    } catch {
      toast.error('Could not update reading goal')
    } finally {
      setSavingGoal(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-2xl font-semibold text-ink mb-1">Settings</h1>
      <p className="text-sm text-ink-soft mb-7">Tune how PothiView looks and nudges you.</p>

      <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft px-5 divide-y divide-ink/[0.06] mb-5">
        <Row label="Theme" description="Default appearance when you open the reader">
          <div className="flex rounded-xl border border-ink/[0.1] overflow-hidden">
            <button
              onClick={() => onThemeChange('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${theme === 'light' ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-paper-dim'}`}
            >
              <Sun size={13} /> Light
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-paper-dim'}`}
            >
              <Moon size={13} /> Dark
            </button>
          </div>
        </Row>

        <Row label="Reading goal" description="Pages/day target shown on your Library dashboard">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-ink-faint" />
            <input
              type="number"
              min={1}
              max={500}
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onBlur={onGoalBlur}
              disabled={savingGoal}
              className="w-16 rounded-lg border border-ink/[0.12] px-2 py-1.5 text-sm text-center text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
            />
            <span className="text-xs text-ink-faint">pages/day</span>
          </div>
        </Row>

        <Row label="Notifications" description="In-app reminders for your streak and daily goal">
          <Toggle checked={notifications} onChange={onNotificationsChange} />
        </Row>
      </div>

      <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft px-5 divide-y divide-ink/[0.06] mb-5">
        <Link to="/profile" className="flex items-center justify-between gap-4 py-4 group">
          <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <User size={15} className="text-ink-faint" /> Account
          </span>
          <span className="flex items-center gap-1 text-xs text-ink-faint group-hover:text-brand-600 transition-colors">
            {user?.fullname} <ChevronRight size={14} />
          </span>
        </Link>
      </div>

      <div className="mb-5">
        <InstallAppButton variant="settings" />
      </div>

      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-medium transition-colors"
      >
        <LogOut size={15} /> Log out
      </button>
    </div>
  )
}

export default Settings
