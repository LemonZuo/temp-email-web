# Temp Email Web

A new frontend for [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email). It talks to the
existing Worker API and needs no backend changes. It covers the mailbox, user center, admin console, redemption codes
and the Telegram Mini App.

[cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 的全新前端，直接对接现有的 Worker
接口，后端无需任何改动。覆盖邮箱、用户中心、管理后台、兑换码和 Telegram 小程序。

## Features / 功能

- **Mailbox / 邮箱**: three-pane inbox with a resizable list and a reader that blocks remote images by default; sent
  mail; compose in plain text, HTML or rich text; attachments, auto-reply, webhook and preferences.

  三栏收件箱（列表宽度可拖动，阅读区默认拦截远程图片）、发件箱、写信（纯文本 / HTML / 富文本）、附件、自动回复、Webhook
  和偏好设置。

- **User center / 用户中心**: sign in with password, OAuth2 or passkey; manage bound mailboxes, read and send mail.

  支持密码、OAuth2、通行密钥登录；管理绑定的邮箱，收信和发信。

- **Admin console / 管理后台**: statistics, addresses, all mails and unknown-recipient mails, sent mail, users and roles,
  OAuth2, webhook, Telegram, AI extraction, IP blacklist, redemption codes, database and maintenance.

  统计、地址管理、所有邮件和无收件人邮件、发件记录、用户与角色、OAuth2、Webhook、Telegram、AI 提取、IP 黑名单、兑换码、
  数据库与维护。

- **Also / 其他**: redemption code page, Telegram Mini App, Chinese and English, light and dark themes, mobile layout.

  兑换码页面、Telegram 小程序、中英文切换、明暗主题、移动端适配。

**Stack / 技术栈:** Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · react-router · zustand ·
TanStack Query

## Upstream baseline / 上游基线

Rewritten from upstream commit
[`a40a6b0`](https://github.com/dreamhunter2333/cloudflare_temp_email/commit/a40a6b0dd8edaacd69c8d8ac71e0d3796650fff9)
(backend v1.15.0). Synced upstream commits and how to sync are tracked in [docs/UPSTREAM.md](./docs/UPSTREAM.md).

基于上游提交 [`a40a6b0`](https://github.com/dreamhunter2333/cloudflare_temp_email/commit/a40a6b0dd8edaacd69c8d8ac71e0d3796650fff9)
（后端 v1.15.0）重写。已同步的上游提交和同步方法见 [docs/UPSTREAM.md](./docs/UPSTREAM.md)。

## Development / 本地开发

Requires Node 22 (`.node-version`) and pnpm 11 (`packageManager` in `package.json`; run `corepack enable` to use it).

需要 Node 22（见 `.node-version`）和 pnpm 11（见 `package.json` 的 `packageManager`，执行 `corepack enable` 后自动使用该版本）。

```bash
pnpm install
# Proxy backend paths (/api/, /open_api/, /user_api/, /admin/ ...) to a running worker
# 把后端路径代理到一个运行中的 Worker
DEV_PROXY_TARGET=http://127.0.0.1:8787 pnpm dev
```

Alternatively, set `VITE_API_BASE` to a worker URL and call it directly; the worker allows CORS.

也可以把 `VITE_API_BASE` 设为 Worker 地址直接请求，后端已开放 CORS。

A local worker can be started from the backend repository's e2e setup:

本地 Worker 可以用后端仓库的 e2e 环境启动：

```bash
cd ../cloudflare_temp_email/e2e
docker compose -p tmweb up -d --build worker mailpit
curl -X POST http://localhost:8787/admin/db_initialize
curl -X POST http://localhost:8787/admin/db_migration
```

Checks / 检查: `npx tsc -p tsconfig.app.json --noEmit` and / 和 `pnpm lint`.

## Build and configuration / 构建与配置

```bash
pnpm build            # outputs dist/ / 输出到 dist/
pnpm build:telegram   # Telegram Mini App build / Telegram 小程序构建
```

| Build-time env / 构建变量 | Runtime key / 运行时键（`#app-config`） | Meaning / 含义 |
|---|---|---|
| `VITE_API_BASE` | `API_BASE` | Backend Worker URL; empty means same origin<br>后端 Worker 地址，留空表示同源 |
| `VITE_DEFAULT_LANG` | `DEFAULT_LANG` | `zh` or `en`; takes priority over the browser language until the user picks one<br>`zh` 或 `en`，用户手动切换前优先于浏览器语言 |
| `VITE_IS_TELEGRAM` | `IS_TELEGRAM` | Telegram Mini App mode (set by `build:telegram`)<br>Telegram 小程序模式（`build:telegram` 会自动设置） |

Runtime keys let one build point at different workers: edit the tag in `dist/index.html`, e.g.
`<script id="app-config" type="application/json">{"API_BASE":"https://mail-api.example.com"}</script>`.
Everything else (site title, domains, announcement, feature switches ...) comes from the backend's
`/open_api/settings`, as with the old frontend.

运行时键可以让同一份构建指向不同的后端：修改 `dist/index.html` 里的这个标签即可，例如上面的写法。其他配置（站点标题、
邮箱域名、公告、功能开关等）都和旧前端一样，来自后端的 `/open_api/settings`。

## Deployment / 部署

The site is deployed as a Cloudflare Worker with static assets (`wrangler.jsonc`). Choose **one** of the two methods;
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) has the full steps, post-deployment checklist, migration notes and
troubleshooting.

站点以 Cloudflare Worker 静态资源的形式部署（`wrangler.jsonc`）。以下两种方式**二选一**，完整步骤、部署后检查、迁移注意事项和常见问题见
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)。

| Method / 方式 | Deploys when / 何时部署 | Configure in / 配置位置 |
|---|---|---|
| A. GitHub Actions (current / 当前) | A `v*` tag is pushed, or a manual run<br>推送 `v*` 标签或手动运行 | GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable `VITE_API_BASE` |
| B. Cloudflare Workers Builds | Every push to `main`<br>每次推送到 `main` | Worker → *Settings* → *Build*; build variable `VITE_API_BASE` |

Release with method A / 用方式 A 发布：

```bash
npm version 0.2.0 --no-git-tag-version
git commit -am "chore: release v0.2.0"
git tag v0.2.0
git push origin main v0.2.0
```

Deploying from a local machine / 本地直接部署: `VITE_API_BASE=https://mail-api.example.com pnpm run deploy`.

## Routes / 路由

| Path / 路径 | Module / 模块 |
|---|---|
| `/` | Mailbox / 邮箱（`/sent`, `/compose`, `/settings`, `/auto-reply`, `/webhook`, `/attachments`, `/preferences`, `/about`） |
| `/user/*` | User center / 用户中心（`/user/oauth2/callback` is the OAuth2 redirect URL / 是 OAuth2 回调地址） |
| `/console/*` | Admin console / 管理后台（`/admin` redirects here / 会跳转到这里） |
| `/redeem` | Redemption codes / 兑换码 |
| `/telegram_mail` | Telegram Mini App mail view / Telegram 小程序邮件页 |

Frontend routes never start with a backend prefix (`/api/`, `/open_api/`, `/user_api/`, `/admin/`, `/telegram/`,
`/external/`, `/redeem_api/`), because proxies and the backend forward those paths to the API. That is why the admin
console lives at `/console` rather than `/admin/...`.

前端路由不能以后端前缀开头（`/api/`、`/open_api/`、`/user_api/`、`/admin/`、`/telegram/`、`/external/`、`/redeem_api/`），
因为代理和后端会把这些路径转发给接口。所以管理后台放在 `/console`，而不是 `/admin/...`。

## Compatibility with the old frontend / 与旧前端的兼容

- Same browser storage keys (`jwt`, `userJwt`, `adminAuth`, `auth`, `LocalAddressCache`, session `addressPassword`):
  deployed on the old frontend's domain, users stay signed in.

  沿用相同的浏览器存储键名（`jwt`、`userJwt`、`adminAuth`、`auth`、`LocalAddressCache`、会话中的 `addressPassword`），
  部署在旧前端的域名上时用户无需重新登录。

- `?jwt=` auto-login links, `?mail_id=` links (built from the backend's `FRONTEND_URL`), and legacy `/zh/...`, `/en/...`
  URLs keep working.

  `?jwt=` 自动登录链接、`?mail_id=` 链接（由后端的 `FRONTEND_URL` 生成）以及旧的 `/zh/...`、`/en/...` 地址继续可用。

## Documentation / 文档

| File / 文件 | Content / 内容 |
|---|---|
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Deployment / 部署 |
| [docs/UPSTREAM.md](./docs/UPSTREAM.md) | Upstream baseline and sync log / 上游基线与同步记录 |
| [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) | How pages are built / 页面开发约定 |
| [PLAN.md](./PLAN.md) | Task plan and change log / 任务计划与变更记录 |
