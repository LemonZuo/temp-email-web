import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Dev only: proxy backend paths to a running worker so API_BASE can stay empty
  const proxyTarget = env.DEV_PROXY_TARGET
  const proxyPaths = ['/api', '/open_api', '/user_api', '/admin', '/telegram', '/redeem_api', '/external', '/health_check']
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    define: {
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version),
    },
    server: proxyTarget
      ? {
          proxy: Object.fromEntries(
            proxyPaths.map((p) => [p, { target: proxyTarget, changeOrigin: true }]),
          ),
        }
      : undefined,
  }
})
