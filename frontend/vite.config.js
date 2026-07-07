import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logo.png', 'favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'HRL Construction Manager',
        short_name: 'HRL',
        description: 'HRL Construction Management App',
        theme_color: '#3D35BE',
        background_color: '#F6F5FF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // New unique cacheId on every build — forces old caches to be deleted
        cacheId: `hrl-app-v${Date.now()}`,
        cleanupOutdatedCaches: true,
        // Activate new SW immediately without waiting for old tabs to close
        skipWaiting: true,
        clientsClaim: true,
        // Cache all Vite-hashed static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        // Never cache GraphQL API calls
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/graphql/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // disable in dev to avoid confusion
      }
    })
  ],
})
