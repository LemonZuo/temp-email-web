# Temp Email Web

[中文](./README.md)

A new frontend for [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email). It talks to the
existing backend API and needs no backend changes.

- **Mailbox**: three-pane inbox, sent mail, compose (plain text / HTML / rich text), attachments, auto-reply, webhook
- **User center**: sign in with password, OAuth2 or passkey; manage bound mailboxes
- **Admin console** (`/console`): statistics, addresses, mails, users and roles, settings, database maintenance
- **Also**: redemption codes, Telegram Mini App, Chinese and English, light and dark themes, mobile layout

Stack: Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · react-router · zustand · TanStack Query

## Development

Requires Node 22 and pnpm 11 (run `corepack enable`).

```bash
pnpm install
DEV_PROXY_TARGET=http://127.0.0.1:8787 pnpm dev   # proxy API requests to a local backend
```

Without a local backend, start one from the upstream repository's e2e setup:

```bash
cd ../cloudflare_temp_email/e2e
docker compose -p tmweb up -d --build worker mailpit
curl -X POST http://localhost:8787/admin/db_initialize
curl -X POST http://localhost:8787/admin/db_migration
```

Checks before committing: `npx tsc -p tsconfig.app.json --noEmit` and `pnpm lint`.

## Build and configuration

```bash
pnpm build            # outputs dist/
pnpm build:telegram   # Telegram Mini App build
```

| Build variable | Meaning |
|---|---|
| `VITE_API_BASE` | Backend Worker URL; empty means same origin as the frontend |
| `VITE_DEFAULT_LANG` | Default language, `zh` or `en` |

Site title, mail domains, announcement, feature switches and so on come from the backend's `/open_api/settings`, as
with the old frontend.

## Deployment

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](./docs/DEPLOYMENT.en.md)

Deployed as a Cloudflare Worker with static assets, in one of two ways (see the [deployment guide](./docs/DEPLOYMENT.en.md)):

- **GitHub Actions** (current setup): a fork deploys after its weekly sync; manual runs and tag releases also work
- **Cloudflare connected repository**: every push to `main` builds and goes live

## Documentation

- [Deployment](./docs/DEPLOYMENT.en.md)
- [Upstream baseline and sync log](./docs/UPSTREAM.md): rewritten from upstream `a40a6b0` (backend v1.15.0)
- [Development conventions](./docs/CONVENTIONS.md)
- [Plan and change log](./PLAN.md) (Chinese)
