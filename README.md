# Temp Email Web

A new frontend for [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email), built against the existing Worker API.

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · react-router · zustand · TanStack Query

> Work in progress — see [PLAN.md](./PLAN.md) for the task plan and status.

## Development

```bash
pnpm install
# Point the dev server at a running worker (proxies /api, /open_api, /user_api, /admin ...)
DEV_PROXY_TARGET=http://127.0.0.1:8787 pnpm dev
```

Or set `VITE_API_BASE` to the worker URL to call it directly (CORS must allow it).

## Build

```bash
pnpm build   # outputs dist/
```

The API base can also be injected at deploy time without rebuilding, via the
`<script id="app-config" type="application/json">{"API_BASE":"https://..."}</script>` tag in `index.html`.
