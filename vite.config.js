import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['bluebooks-icon.jpeg', 'favicon.svg'],
      manifest: {
        name: 'Blue Books',
        short_name: 'Blue Books',
        description: 'Sua comunidade de leitura',
        theme_color: '#2054bc',
        background_color: '#0f1629',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'bluebooks-icon.jpeg',
            sizes: '192x192',
            type: 'image/jpeg',
          },
          {
            src: 'bluebooks-icon.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
          },
          {
            src: 'bluebooks-icon.jpeg',
            sizes: '1024x1024',
            type: 'image/jpeg',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
