import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { User, BarChart3, Settings as SettingsIcon, LogOut } from 'lucide-react'
import BrandLink from './BrandLink'
import InstallAppButton from './InstallAppButton'
import InstallBanner from './InstallBanner'
import { useAuth } from '../lib/AuthContext'

const navLink = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:text-ink hover:bg-paper-dim'
  }`

const menuItem = 'w-full text-left px-3.5 py-2 text-sm text-ink-soft hover:bg-paper-dim hover:text-ink transition-colors flex items-center gap-2'

const Layout = () => {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const initial = user?.fullname?.trim()?.[0]?.toUpperCase() || '?'
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-ink/[0.07]">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-2">
          <BrandLink size={26} />

          <nav className="flex items-center gap-1">
            <NavLink to="/library" className={navLink}>Library</NavLink>
            <NavLink to="/notes" className={navLink}>Notes</NavLink>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <InstallAppButton variant="navbar" />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-brand-600 text-paper font-semibold text-sm flex items-center justify-center hover:bg-brand-700 transition-colors overflow-hidden shrink-0"
              >
                {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : initial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lift border border-ink/[0.06] py-1.5 animate-fade-in z-40">
                  <div className="px-3.5 py-2 border-b border-ink/[0.06]">
                    <p className="text-sm font-medium text-ink truncate capitalize">{user?.fullname}</p>
                    <p className="text-xs text-ink-faint truncate">{user?.email}</p>
                  </div>
                  <Link to="/profile" onClick={closeMenu} className={menuItem}>
                    <User size={15} className="shrink-0" /> Profile
                  </Link>
                  <Link to="/stats" onClick={closeMenu} className={menuItem}>
                    <BarChart3 size={15} className="shrink-0" /> Reading Stats
                  </Link>
                  <InstallAppButton variant="menu" onAfterClick={closeMenu} />
                  <Link to="/settings" onClick={closeMenu} className={menuItem}>
                    <SettingsIcon size={15} className="shrink-0" /> Settings
                  </Link>
                  <div className="border-t border-ink/[0.06] mt-1 pt-1">
                    <button onClick={logout} className={menuItem}>
                      <LogOut size={15} className="shrink-0" /> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
        <InstallBanner />
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
