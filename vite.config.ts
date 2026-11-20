import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Dev only: proxy backend paths to a running worker so API_BASE can stay empty
  const proxyTarget = env.DEV_PROXY_TARGET
  // Same prefixes as functions/_middleware.js (trailing slash), so `/admin` and `/console/*` stay SPA routes.
  const proxyPattern = '^/(api|open_api|user_api|admin|telegram|external|redeem_api)/|^/health_check$'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    define: {
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version),
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/, priority: 30 },
              {
                name: 'ui',
                test: /node_modules[\\/](radix-ui|@radix-ui|@floating-ui|cmdk|lucide-react|sonner|class-variance-authority|tailwind-merge|clsx)[\\/]/,
                priority: 20,
              },
              { name: 'data', test: /node_modules[\\/](@tanstack|zustand)[\\/]/, priority: 20 },
            ],
          },
        },
      },
    },
    server: proxyTarget
      ? {
          proxy: { [proxyPattern]: { target: proxyTarget, changeOrigin: true } },
        }
      : undefined,
  }
})
