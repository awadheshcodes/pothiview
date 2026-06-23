import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import { AnimatePresence } from 'framer-motion'
import { useRegisterSW } from 'virtual:pwa-register/react'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Library from './pages/Library'
import Notes from './pages/Notes'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import ReadingStats from './pages/ReadingStats'
import NotFound from './pages/NotFound'

// react-pdf + react-markdown pull in a sizeable chunk (pdf.js) — only load
// it once someone actually opens a document.
const Reader = lazy(() => import('./pages/Reader'))

const ReaderFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper">
    <div className="w-7 h-7 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
  </div>
)

// Registers the service worker and surfaces its two lifecycle moments as
// the same toast style the rest of the app already uses.
const PwaStatus = () => {
  useRegisterSW({
    onOfflineReady() {
      toast.info("PothiView is ready to work offline — previously opened PDFs will stay available.", { autoClose: 5000 })
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'activated') {
            toast.success('PothiView updated to the latest version', { autoClose: 4000 })
          }
        })
      })
    },
  })
  return null
}

// AnimatePresence needs access to the current location to detect route
// changes — this inner component sits inside BrowserRouter so it can
// call useLocation().
const AnimatedRoutes = () => {
  const location = useLocation()

  // Only animate between the auth pages (login ↔ signup). All other
  // pages skip the entrance animation to avoid jarring transitions
  // when the user is already inside the app.
  const isAuthPage = ['/login', '/signup'].includes(location.pathname)

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={isAuthPage ? location.pathname : 'app'}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/reader/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<ReaderFallback />}>
                <Reader />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/library" element={<Library />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/stats" element={<ReadingStats />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PwaStatus />
        <AnimatedRoutes />
        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar theme="light" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
