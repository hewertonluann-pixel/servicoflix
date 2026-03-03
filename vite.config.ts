import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: mode === 'production' ? '/' : '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
      // Aumenta limite de warning de chunk size
      chunkSizeWarningLimit: 1000,
      // Garante sourcemap apenas em dev
      sourcemap: mode === 'development',
    },
    // Configurações do esbuild
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      // Remove console.log em produção
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    preview: {
      port: 3000,
    },
  }
})
