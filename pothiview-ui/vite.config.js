import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We ship a hand-written service worker (src/sw.js) instead of letting
      // workbox generate one, because the default "cache everything that
      // matches a URL" model doesn't fit how PDFs are served here: each PDF
      // is fetched from S3 via a presigned URL whose query string (signature
      // + expiry) is different every single time, even for the same file.
      // The custom worker matches PDF cache entries on the stable pathname
      // only, ignoring that ever-changing query string — see src/sw.js.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // Build output that should be available offline: app shell JS/CSS,
        // the HTML pages (index + offline), and every icon/font asset.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        // pdf.js + the rest of the reader chunk can be a few MB once bundled;
        // the workbox default (2MB) is too tight for that single chunk.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },

      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Lets the service worker run under `vite dev` too, so install/offline
      // behaviour can be verified without doing a full production build.
      // Safe to flip to `false` if it ever gets in the way of normal dev work.
      devOptions: {
        enabled: true,
        type: 'module',
      },

      manifest: {
        name: 'PothiView',
        short_name: 'Pothi',
        description: "Upload a PDF, highlight what matters, and ask an AI sidebar to explain, summarize, quiz, or make flashcards from exactly what you're reading.",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#7BA05B',
        background_color: '#F2EDE2',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
