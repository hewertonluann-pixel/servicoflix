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
    // Define base URL para produção
    base: mode === 'production' ? '/' : '/',
    // Configuração para SPA routing
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Garante que todos os caminhos sejam relativos
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    // Preview (para testar build local)
    preview: {
      port: 3000,
    },
  }
})
