# Temp Email Web

A new frontend for [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email), built against the
existing Worker API (no backend changes). It covers the mailbox, user center, admin console, redemption codes and the
Telegram Mini App.

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · react-router · zustand · TanStack Query

See [PLAN.md](./PLAN.md) for the task plan and status, and [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) for how pages
are built.

## Development

```bash
pnpm install
# Point the dev server at a running worker (proxies /api/, /open_api/, /user_api/, /admin/ ...)
DEV_PROXY_TARGET=http://127.0.0.1:8787 pnpm dev
```

Or set `VITE_API_BASE` to the worker URL to call it directly (the worker allows CORS).

A local worker can be started from the backend repo's e2e setup:

```bash
cd ../cloudflare_temp_email/e2e
docker compose -p tmweb up -d --build worker mailpit
curl -X POST http://localhost:8787/admin/db_initialize
curl -X POST http://localhost:8787/admin/db_migration
```

Checks: `npx tsc -p tsconfig.app.json --noEmit` and `pnpm lint`.

## Build

```bash
pnpm build            # outputs dist/
pnpm build:telegram   # Telegram Mini App build (loads telegram-web-app.js first)
```

### Configuration

| Build-time env | Runtime key (`#app-config`) | Meaning |
|----------------|-----------------------------|---------|
| `VITE_API_BASE` | `API_BASE` | Worker URL. Empty = same origin (Pages middleware / Worker assets) |
| `VITE_DEFAULT_LANG` | `DEFAULT_LANG` | Default language (`zh` / `en`), used before the browser language until the user picks one |
| `VITE_IS_TELEGRAM` | `IS_TELEGRAM` | Telegram Mini App mode |

Runtime values let one build point at different workers: edit the tag in `dist/index.html`, e.g.
`<script id="app-config" type="application/json">{"API_BASE":"https://mail-api.example.com"}</script>`.

Everything else (site title, domains, announcement, feature switches ...) comes from the worker's
`/open_api/settings`, exactly like the old frontend.

## Deployment

The frontend is a static SPA in `dist/`. Pick one of the following.

### A. Cloudflare Pages + same-origin API (recommended)

`pages/` contains a Pages project whose middleware forwards backend paths to the worker through a service binding,
the same setup as the old `cloudflare_temp_email/pages`. Set `service` in `pages/wrangler.toml` to your worker's
name, then:

```bash
pnpm build
cd pages && npx wrangler pages deploy --branch production
```

Pages serves `index.html` for unknown paths, so client-side routes work on reload.

### B. Served by the worker (assets)

In the worker's `wrangler.toml`:

```toml
[assets]
directory = "../../temp-email-web/dist/"   # path to this repo's dist
binding = "ASSETS"
run_worker_first = true
```

The worker returns `index.html` for every non-API path without a file extension.

### C. Separate origin

Deploy `dist/` to any static host with an SPA fallback (all unknown paths → `index.html`) and set `API_BASE`
(build-time or runtime) to the worker URL.

### Routes

| Path | Module |
|------|--------|
| `/` | Mailbox (inbox, `/sent`, `/compose`, `/settings`, `/auto-reply`, `/webhook`, `/attachments`, `/preferences`, `/about`) |
| `/user/*` | User center (`/user/oauth2/callback` is kept for OAuth2 providers) |
| `/console/*` | Admin console — `/admin` redirects here |
| `/redeem` | Redemption codes |
| `/telegram_mail` | Telegram Mini App mail view |

Frontend routes never start with a backend prefix (`/api/`, `/open_api/`, `/user_api/`, `/admin/`, `/telegram/`,
`/external/`, `/redeem_api/`). The middleware and the worker forward those to the API, so the admin console cannot
live under `/admin/...`.

### Compatibility with the old frontend

- Same browser storage keys (`jwt`, `userJwt`, `adminAuth`, `auth`, `LocalAddressCache`, session `addressPassword`):
  switching frontends keeps users signed in.
- `?jwt=` auto-login links, `?mail_id=` links (used by `FRONTEND_URL` in notifications), and legacy `/zh/...`,
  `/en/...` URLs keep working.
