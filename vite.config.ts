import path from "path"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      // O service worker do Firebase Messaging será registrado separadamente
      // então deixamos o workbox apenas para cache de assets estáticos
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/functions/],
        // Não intercepta requests do Firebase
        runtimeCaching: [],
      },
      manifest: {
        name: 'ServiçoFlix',
        short_name: 'ServiçoFlix',
        description: 'Encontre profissionais de confiança na sua região',
        theme_color: '#10b981',
        background_color: '#0a0f0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        categories: ['business', 'lifestyle'],
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Buscar Serviços',
            short_name: 'Buscar',
            url: '/buscar',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Meu Painel',
            short_name: 'Painel',
            url: '/dashboard',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }]
          }
        ],
        screenshots: []
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
  },
})
