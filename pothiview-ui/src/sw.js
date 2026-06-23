// PothiView service worker
//
// Built with `injectManifest` rather than letting workbox auto-generate
// everything, mainly because of how PDFs are served (see the comment on the
// pdf route below) — that one rule needs hand control the declarative
// `generateSW` config can't express.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { offlineFallback } from 'workbox-recipes'

// Activate a newly-installed worker immediately rather than leaving it
// "waiting" behind currently-open tabs — readers shouldn't have to close
// every tab to pick up an update.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// ── Static assets ───────────────────────────────────────────────────────
// `self.__WB_MANIFEST` is replaced at build time with the full list of
// hashed build files (JS/CSS bundles, index.html, offline.html, every icon
// and font in /public) — see globPatterns in vite.config.js.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Google Fonts ────────────────────────────────────────────────────────
// The stylesheet changes occasionally (new weights, swapped hashes), so
// prefer the network but fall back instantly to cache when offline.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
)

// The actual woff2 font files are immutable once published — cache them
// hard and skip the network entirely once we have a copy.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true }),
    ],
  })
)

// ── Previously opened PDFs ─────────────────────────────────────────────
// PDFs are fetched straight from S3 via a short-lived presigned URL
// (`/pdf/:id` returns a fresh one every time, expiring in 10 minutes) —
// so the same document gets a *different* URL on every visit, even though
// the file itself never changes. A plain URL-keyed cache would never hit.
//
// The bit that *is* stable across requests is the path (it's derived from
// the S3 object key); only the query string — signature, expiry, etc. —
// changes. So we cache on the full request but match future lookups with
// `ignoreSearch: true`, keying purely off that stable path. First open
// fetches and caches the bytes; every open after that — including offline
// — is served straight from cache.
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.toLowerCase().endsWith('.pdf'),
  new CacheFirst({
    cacheName: 'pothiview-pdfs',
    matchOptions: { ignoreSearch: true },
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 60, purgeOnQuotaError: true }),
    ],
  })
)

// ── App navigation ──────────────────────────────────────────────────────
// Real page loads (typing the URL, opening the installed app, a hard
// refresh) — try the network first so people always get the current app
// shell while online; fall back to a cached copy if the network is merely
// slow/unreliable.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pothiview-pages',
    networkTimeoutSeconds: 10,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
)

// ── Offline fallback ────────────────────────────────────────────────────
// Google's own "comprehensive fallbacks" recipe: when a document request
// fails outright (offline + no cached copy of that exact route — e.g. a
// fresh route nobody has opened on this device before), hand back the
// precached offline screen instead of a browser error page.
offlineFallback({ pageFallback: 'offline.html' })
