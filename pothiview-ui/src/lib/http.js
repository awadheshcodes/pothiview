import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_SERVER,
  withCredentials: true,
})

// Endpoints where a 401 is an expected, handled outcome (checking session
// on load, a failed login attempt) rather than "the session just died".
const SILENT_401_PATHS = ['/user/bootstrap', '/user/session', '/user/login', '/user/signup', '/user/google', '/user/refresh-token']

// Concurrent requests that all 401 at once (e.g. a page that fires several
// API calls right as the access token expires) should trigger exactly one
// refresh call, not one each — every caller awaits the same in-flight
// promise instead of racing the cookie refresh.
let refreshInFlight = null
const refreshAccessToken = () => {
  if (!refreshInFlight) {
    refreshInFlight = http.get('/user/refresh-token').finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err?.config || {}
    const url = config.url || ''
    const isSilent = SILENT_401_PATHS.some((p) => url.includes(p))

    // A 401 mid-session almost always just means the 15-minute access
    // token expired while the refresh cookie (up to 30 days) is still
    // good — e.g. the tab sat backgrounded long enough for the proactive
    // refresh interval to get throttled. Try one silent refresh and
    // replay the original request before treating this as a real logout.
    if (err?.response?.status === 401 && !isSilent && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true
      try {
        await refreshAccessToken()
        return http(config)
      } catch {
        // Refresh token is gone/expired too — genuinely logged out, fall
        // through to the redirect below.
      }
    }

    if (err?.response?.status === 401 && !isSilent && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default http
