import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import http from './http'

const AuthContext = createContext(null)

// Access tokens last 15 minutes server-side — refresh a little before that
// so an active reader never gets logged out mid-session. Configurable via
// env so it can be tuned without a code change; falls back to 12 minutes.
const REFRESH_INTERVAL = Number(import.meta.env.VITE_REFRESH_INTERVAL) || 12 * 60 * 1000

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  // Runs once on every app boot — first paint, hard refresh, browser
  // restart, or a back/forward navigation that remounts the app. Hits
  // /user/bootstrap rather than /user/session directly: bootstrap falls
  // back to the long-lived refresh cookie if the 15-minute access token
  // has already expired, so a genuinely still-logged-in person is never
  // shown as logged out just because some time passed since their last
  // request.
  const loadSession = useCallback(async () => {
    try {
      const { data } = await http.get('/user/bootstrap')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (!user) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      http.get('/user/refresh-token').catch(() => {})
    }, REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [user])

  const login = async (email, password) => {
    const { data } = await http.post('/user/login', { email, password })
    setUser(data.user)
    return data
  }

  const signup = async (fullname, email, password) => {
    const { data } = await http.post('/user/signup', { fullname, email, password })
    setUser(data.user)
    return data
  }

  // `credential` is the Google ID token (JWT) handed back by Google
  // Identity Services after the person picks an account.
  const googleLogin = async (credential) => {
    const { data } = await http.post('/user/google', { credential })
    setUser(data.user)
    return data
  }

  const logout = async () => {
    await http.get('/user/logout').catch(() => {})
    setUser(null)
    window.location.href = '/login'
  }

  // Settings page — theme / daily goal / notifications. Partial updates:
  // only pass the fields that changed.
  const updateSettings = async (patch) => {
    const { data } = await http.patch('/user/settings', patch)
    setUser(data)
    return data
  }

  // Profile page — full name only, for now.
  const updateProfile = async (fullname) => {
    const { data } = await http.patch('/user/profile', { fullname })
    setUser(data)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout, updateSettings, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
