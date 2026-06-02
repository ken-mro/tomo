import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Work out the correct base path for GitHub Pages.
// - Project page (user.github.io/<repo>/): base must be "/<repo>/".
// - User/org page (user.github.io) or local/other hosts: relative "./" works.
// In GitHub Actions, GITHUB_REPOSITORY is "owner/repo"; we derive the repo name.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isUserSite = repoName?.endsWith('.github.io')
const base = repoName && !isUserSite ? `/${repoName}/` : './'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Ship a service worker that updates itself in the background.
      registerType: 'autoUpdate',
      // Inject the registration script automatically — no app code needed.
      injectRegister: 'auto',
      // Static assets (outside the JS bundle) to precache for offline use.
      includeAssets: ['tomo.svg', 'apple-touch-icon.png', 'sounds/*.wav'],
      manifest: {
        name: 'tomo — focus friend',
        short_name: 'tomo',
        description: 'A cute Pomodoro timer with a floating Picture-in-Picture window.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FDEAE0',
        theme_color: '#F0564B',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: './pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: './pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: './maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: './tomo.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Precache the app shell + bundled assets (incl. the alarm sounds).
        globPatterns: ['**/*.{js,css,html,svg,png,wav,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Cache the Google Fonts stylesheet so it works offline after first load.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Cache the actual font files (long-lived).
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Don't run the SW during `pnpm dev` (avoids caching surprises while coding).
      devOptions: { enabled: false },
    }),
  ],
})
