import { useState } from 'react'
import { toast } from 'react-toastify'
import { Pencil, Check, X, Mail, Calendar, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const formatJoined = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const Profile = () => {
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.fullname || '')
  const [saving, setSaving] = useState(false)

  const initial = user?.fullname?.trim()?.[0]?.toUpperCase() || '?'

  const onSave = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    setSaving(true)
    try {
      await updateProfile(name.trim())
      toast.success('Profile updated')
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  const onCancel = () => {
    setName(user?.fullname || '')
    setEditing(false)
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-2xl font-semibold text-ink mb-1">Profile</h1>
      <p className="text-sm text-ink-soft mb-7">Your account details.</p>

      <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-soft p-6">
        <div className="flex items-center gap-4 mb-6">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border border-ink/[0.08]" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white font-serif font-semibold text-2xl flex items-center justify-center shrink-0">
              {initial}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSave()}
                  className="flex-1 min-w-0 rounded-lg border border-brand-300 px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand-100"
                />
                <button onClick={onSave} disabled={saving} className="w-7 h-7 rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
                  <Check size={14} />
                </button>
                <button onClick={onCancel} className="w-7 h-7 rounded-lg bg-paper-dim text-ink-soft flex items-center justify-center shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-serif text-lg font-semibold text-ink truncate capitalize">{user?.fullname}</p>
                <button onClick={() => setEditing(true)} className="text-ink-faint hover:text-brand-600 transition-colors shrink-0" title="Edit name">
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <p className="text-xs text-ink-faint mt-1 capitalize">
              {user?.authProvider === 'google' ? 'Signed in with Google' : 'PothiView account'}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-ink/[0.06] pt-5">
          <div className="flex items-center gap-3 text-sm">
            <Mail size={15} className="text-ink-faint shrink-0" />
            <span className="text-ink-soft">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={15} className="text-ink-faint shrink-0" />
            <span className="text-ink-soft">Member since {formatJoined(user?.createdAt)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <ShieldCheck size={15} className="text-ink-faint shrink-0" />
            <span className="text-ink-soft">{user?.authProvider === 'google' ? 'Google Sign-In' : 'Email & password'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
