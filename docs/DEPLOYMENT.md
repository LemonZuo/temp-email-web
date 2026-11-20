# Deployment / 部署

This frontend is a static single-page app. `pnpm build` writes it to `dist/`, and [`wrangler.jsonc`](../wrangler.jsonc)
deploys `dist/` as a Cloudflare Worker named `temp-email-web` that only serves static assets, with a single-page-app
fallback so deep links such as `/console/accounts` still work after a reload. The browser calls the
[cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) backend Worker directly
(cross-origin); the backend already allows CORS from any origin, so nothing has to change there.

本前端是纯静态的单页应用。`pnpm build` 输出到 `dist/`，[`wrangler.jsonc`](../wrangler.jsonc) 把 `dist/` 部署成名为
`temp-email-web` 的 Cloudflare Worker：只托管静态文件，并开启单页应用回退，`/console/accounts` 这类深层链接刷新后也能打开。
浏览器跨域直接请求 cloudflare_temp_email 后端 Worker；后端本身已对所有来源开放 CORS，这方面不需要改后端。

There are two ways to build and deploy it. **Use only one of them**: if both are active, every push deploys through
Cloudflare and every tag deploys a second time through GitHub.

构建和部署有两种方式，**只能二选一**：两种都开着的话，每次推送都会由 Cloudflare 部署一次，打标签时 GitHub 又会再部署一次。

| | A. GitHub Actions | B. Cloudflare Workers Builds |
|---|---|---|
| Trigger / 触发 | Pushing a `v*` tag, or a manual run<br>推送 `v*` 标签，或手动运行 | Every push to the production branch<br>每次推送到生产分支 |
| Builds on / 构建位置 | GitHub-hosted runner<br>GitHub 的 runner | Cloudflare build environment<br>Cloudflare 构建环境 |
| Settings / 配置位置 | GitHub repository secrets and variables<br>GitHub 仓库的 Secrets 和 Variables | Worker → *Settings* → *Build* |
| Cloudflare version label / Cloudflare 版本标记 | The git tag, e.g. `v0.2.0`<br>git 标签 | The commit<br>提交 |
| Best for / 适用场景 | Releasing deliberate versions<br>按版本发布 | Shipping every push<br>推送即上线 |

Method A is the current setup; its workflow is [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

当前采用的是方式 A，对应的 workflow 是 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)。

## Before you start / 准备工作

- **Backend / 后端**: a deployed cloudflare_temp_email Worker and its public URL, e.g. `https://mail-api.example.com`.
  This frontend targets backend v1.15.0 (see [UPSTREAM.md](./UPSTREAM.md)). Check that it responds:

  已部署的 cloudflare_temp_email 后端 Worker 及其公网地址，例如 `https://mail-api.example.com`。本前端按后端 v1.15.0
  编写（见 [UPSTREAM.md](./UPSTREAM.md)）。先确认后端能正常响应：

  ```bash
  curl https://mail-api.example.com/open_api/settings   # returns JSON / 返回 JSON
  ```

- **Accounts / 账号**: a Cloudflare account, and a GitHub repository with this code (your own copy or a fork).

  一个 Cloudflare 账号，以及存放本仓库代码的 GitHub 仓库（自己的仓库或 fork）。

- **Domain (optional) / 域名（可选）**: a domain managed by Cloudflare for the frontend, e.g. `mail.example.com`.
  Without one, the site is available at `https://temp-email-web.<your-subdomain>.workers.dev`.

  一个托管在 Cloudflare 上的域名给前端用，例如 `mail.example.com`。不配的话，访问地址是
  `https://temp-email-web.<你的子域>.workers.dev`。

## Build-time variables / 构建变量

| Variable / 变量 | Required / 必填 | Meaning / 含义 |
|---|---|---|
| `VITE_API_BASE` | Yes / 是 | Backend Worker URL without a trailing slash, e.g. `https://mail-api.example.com`<br>后端 Worker 地址，结尾不带斜杠 |
| `VITE_DEFAULT_LANG` | No / 否 | `zh` or `en`. Takes priority over the browser language until the user picks one<br>`zh` 或 `en`。用户手动切换语言前优先于浏览器语言 |

Vite writes these values into the JavaScript bundle at build time. They are **not** Worker runtime variables: setting
them under the Worker's *Settings* → *Variables and Secrets* has no effect, and any change needs a new build.

Vite 在构建时把这些值写进 JS 文件。它们**不是** Worker 的运行时变量：填在 Worker 的 *Settings* → *Variables and Secrets*
里不会生效，改了之后必须重新构建。

## A. GitHub Actions (release on tags) / GitHub Actions 打标签发布

### A1. Cloudflare credentials / 准备 Cloudflare 凭据

1. **API token / API 令牌**: Cloudflare dashboard → *My Profile* → *API Tokens* → *Create Token*, use the template
   **Edit Cloudflare Workers** and limit it to your account.

   Cloudflare 控制台 → *My Profile*（个人资料）→ *API Tokens* → *Create Token*，选择模板 **Edit Cloudflare Workers**，
   账户范围限定为你自己的账户。

2. **Account ID / 账户 ID**: shown in the account details on the *Workers & Pages* overview page. It is also the hex
   string right after `dash.cloudflare.com/` in the dashboard URL.

   在 *Workers & Pages* 概览页的账户信息里可以看到；控制台网址中 `dash.cloudflare.com/` 后面那串十六进制也是。

### A2. GitHub repository settings / 配置 GitHub 仓库

GitHub → repository → *Settings* → *Secrets and variables* → *Actions*:

GitHub 仓库 → *Settings* → *Secrets and variables* → *Actions*：

| Tab / 标签页 | Name / 名称 | Value / 值 |
|---|---|---|
| Secrets | `CLOUDFLARE_API_TOKEN` | Token from A1<br>A1 创建的令牌 |
| Secrets | `CLOUDFLARE_ACCOUNT_ID` | Account ID from A1<br>A1 查到的账户 ID |
| Variables | `VITE_API_BASE` | Backend URL, e.g. `https://mail-api.example.com`<br>后端地址 |

`VITE_API_BASE` goes under **Variables**, not Secrets. If any of the three is missing, the workflow stops at the
*Check configuration* step and lists what is missing. The workflow does not pass `VITE_DEFAULT_LANG`; to use it, add it
to the `env` of the *Build* step in `deploy.yml`.

`VITE_API_BASE` 放在 **Variables**，不是 Secrets。三项缺任何一项，workflow 会在 *Check configuration* 步骤报错并列出缺少的项。
workflow 目前不传 `VITE_DEFAULT_LANG`，需要的话在 `deploy.yml` 里 *Build* 步骤的 `env` 中加上。

### A3. Make sure Workers Builds is off / 确认已断开关联仓库构建

If the `temp-email-web` Worker was ever connected to the repository (method B), disconnect it: Worker → *Settings* →
*Build* → *Disconnect*. Otherwise every push to `main` still deploys. If the Worker does not exist yet, the first release
creates it.

如果 `temp-email-web` 这个 Worker 曾经用方式 B 关联过仓库，先断开：Worker → *Settings* → *Build* → *Disconnect*。
否则每次推送到 `main` 仍然会部署。Worker 还不存在的话，首次发布时会自动创建。

### A4. Release / 发布

Bump `version` in `package.json` first, because the */about* page shows it as the frontend version. Then tag and push:

先改 `package.json` 里的 `version`，`/about` 页面显示的前端版本就是它。然后打标签并推送：

```bash
npm version 0.2.0 --no-git-tag-version   # only edits package.json / 只改 package.json
git commit -am "chore: release v0.2.0"
git tag v0.2.0
git push origin main v0.2.0
```

Pushing the tag starts the *Deploy* workflow (repository → *Actions*). It installs dependencies with the pinned pnpm
and Node versions (`packageManager` in `package.json`, `.node-version`), runs `pnpm run build` with `VITE_API_BASE`, and
then runs `wrangler deploy --tag v0.2.0`. The new version under Worker → *Deployments* is labelled with the tag and the
short commit hash. A run triggered while another is in progress waits for it instead of cancelling it.

推送标签会触发 *Deploy* workflow（在仓库 → *Actions* 查看）。它按锁定的 pnpm 和 Node 版本安装依赖（`package.json` 的
`packageManager` 和 `.node-version`），带上 `VITE_API_BASE` 执行 `pnpm run build`，最后执行 `wrangler deploy --tag v0.2.0`。
Worker → *Deployments* 里的新版本会标上标签名和短提交号。部署进行中再次触发时，新的运行会等当前这次完成，不会把它中途取消。

### A5. Manual runs and rollback / 手动运行与回滚

- **Manual run / 手动运行**: repository → *Actions* → *Deploy* → *Run workflow*, then choose a branch or tag. The
  Cloudflare version is labelled with that branch or tag name. This is also how to redeploy after changing
  `VITE_API_BASE`.

  仓库 → *Actions* → *Deploy* → *Run workflow*，选择分支或标签。Cloudflare 版本会以所选的分支名或标签名标记。
  修改 `VITE_API_BASE` 后也用这种方式重新部署。

- **Rollback / 回滚**: Worker → *Deployments*, pick an earlier version and roll back to it. This takes effect
  immediately without a rebuild. Alternatively, run the workflow manually on an older tag.

  Worker → *Deployments*，选择一个旧版本回滚，立即生效，不需要重新构建。也可以对旧标签手动运行一次 workflow。

## B. Cloudflare Workers Builds (connected repository) / Cloudflare 关联仓库构建

Cloudflare pulls the repository, then builds and deploys on every push. The only thing needed on the GitHub side is to
authorise the Cloudflare GitHub app; no secrets are involved.

Cloudflare 拉取仓库，每次推送都自动构建并部署。GitHub 这边只需要授权 Cloudflare 的 GitHub App，不用配置任何 Secrets。

### B1. Connect the repository / 关联仓库

- **New Worker / 新建 Worker**: *Workers & Pages* → *Create application* → *Import a repository* (*Continue with
  GitHub*), authorise Cloudflare and pick this repository.

  *Workers & Pages* → *Create application* → *Import a repository*（*Continue with GitHub*），授权后选择本仓库。

- **Existing Worker / 已有 Worker** (for example one created by method A / 比如用方式 A 创建的): Worker → *Settings* →
  *Build* → *Connect*.

  Worker → *Settings* → *Build* → *Connect*。

Then fill in / 然后填写：

| Setting / 设置项 | Value / 值 |
|---|---|
| Project / Worker name<br>项目名 / Worker 名 | `temp-email-web`, must equal `name` in `wrangler.jsonc`<br>必须与 `wrangler.jsonc` 里的 `name` 一致 |
| Production branch / 生产分支 | `main` |
| Build command / 构建命令 | `pnpm run build` |
| Deploy command / 部署命令 | `npx wrangler deploy` |
| Non-production branch deploy command<br>非生产分支部署命令 | `npx wrangler versions upload` (default / 默认值) |
| Root directory / 根目录 | `/` |
| Build variables / 构建变量 | `VITE_API_BASE` = backend URL / 后端地址; optional / 可选 `VITE_DEFAULT_LANG` |

`VITE_API_BASE` must be a **build** variable, i.e. *Variables and secrets* inside the *Build* settings, not the
Worker's runtime *Variables and Secrets*. The build environment installs dependencies by itself: it uses pnpm because
of `pnpm-lock.yaml` and the `packageManager` field, and picks the Node version from `.node-version`.

`VITE_API_BASE` 必须填成**构建**变量，也就是 *Build* 设置里的 *Variables and secrets*，不是 Worker 运行时的
*Variables and Secrets*。构建环境会自己安装依赖：根据 `pnpm-lock.yaml` 和 `packageManager` 字段使用 pnpm，按 `.node-version`
选择 Node 版本。

### B2. Branch control / 分支控制

Pushes to the production branch build and go live. When *Builds for non-production branches* is on, pushes to other
branches only upload a new version (`wrangler versions upload`) and do not replace the live one. Turn it off under
*Settings* → *Build* → *Branch control* if you don't need those builds.

推送到生产分支会构建并上线。开启 *Builds for non-production branches* 时，推送到其他分支只会上传一个新版本
（`wrangler versions upload`），不会替换线上版本。不需要的话在 *Settings* → *Build* → *Branch control* 里关掉。

### B3. Turn off the Actions workflow / 停用 Actions 部署

So that pushing a tag does not deploy a second time (or fail because the secrets are missing), disable the workflow:
repository → *Actions* → *Deploy* → `···` → *Disable workflow*. Enable it again when switching back to method A.

为了避免打标签时再部署一次（或因为没配 Secrets 而报错），停用 workflow：仓库 → *Actions* → *Deploy* → `···` →
*Disable workflow*。以后切回方式 A 时再启用。

### B4. Redeploy and rollback / 重新部署与回滚

- **Redeploy / 重新部署**: push a commit, or retry the latest build from the build history under Worker → *Deployments*.
  Changing a build variable only takes effect after the next build.

  推送一次提交，或在 Worker → *Deployments* 的构建记录里重新运行最近一次构建。修改构建变量后要等下一次构建才会生效。

- **Rollback / 回滚**: Worker → *Deployments*, pick an earlier version and roll back to it.

  Worker → *Deployments*，选择一个旧版本回滚。

## After the first deployment / 首次部署之后

These steps apply to both methods. / 以下步骤两种方式都适用。

1. **Custom domain / 自定义域名**: Worker → *Settings* → *Domains & Routes* → *Add* → *Custom domain*, e.g.
   `mail.example.com`.

   Worker → *Settings* → *Domains & Routes* → *Add* → *Custom domain*，例如 `mail.example.com`。

2. **Check the site / 检查站点**: open the site. The landing page should show the site title and mail domains that come
   from the backend. If the settings fail to load, `VITE_API_BASE` is wrong or missing: fix it and rebuild.

   打开站点，首页应显示来自后端的站点标题和邮箱域名。如果设置加载失败，说明 `VITE_API_BASE` 填错了或没生效，改好后重新构建。

3. **Backend `FRONTEND_URL` / 后端 `FRONTEND_URL`**: set the backend Worker variable `FRONTEND_URL` to the frontend URL,
   e.g. `https://mail.example.com`. Webhook payloads link to `FRONTEND_URL?mail_id=…`, which opens that mail here.

   把后端 Worker 的变量 `FRONTEND_URL` 设为前端地址，例如 `https://mail.example.com`。Webhook 推送里的邮件链接是
   `FRONTEND_URL?mail_id=…`，点开会在本前端打开那封邮件。

4. **Turnstile**: if the backend uses Turnstile (`CF_TURNSTILE_SITE_KEY`), add the frontend hostname to that Turnstile
   widget's hostname list; otherwise the widget fails on the new domain.

   如果后端开启了 Turnstile（`CF_TURNSTILE_SITE_KEY`），要把前端域名加到该 Turnstile 组件的域名列表里，否则新域名上人机验证会失败。

5. **OAuth2 login / OAuth2 登录**: the redirect URL is `https://<frontend>/user/oauth2/callback`. Set it for each
   provider in admin console → *OAuth2*, and register the same URL with the provider.

   回调地址是 `https://<前端域名>/user/oauth2/callback`。在管理后台 → *OAuth2* 里给每个登录方式填上，并在对应的
   OAuth2 服务商那里登记同样的地址。

6. **Telegram Mini App / Telegram 小程序**: the mini app needs its own build. Both methods above only deploy the normal
   site, so deploy the mini app to a separate Worker from your machine (after `npx wrangler login`), then enter its URL
   in admin console → *Telegram* → Mini App URL:

   小程序需要单独构建。上面两种方式都只部署普通站点，小程序要在本机（先执行 `npx wrangler login`）部署到另一个 Worker，
   再把它的地址填到管理后台 → *Telegram* → 小程序 URL：

   ```bash
   VITE_API_BASE=https://mail-api.example.com pnpm build:telegram
   npx wrangler deploy --name temp-email-web-telegram
   ```

## Migrating from the old frontend / 从旧前端迁移

- **Same domain keeps logins / 沿用域名可保留登录状态**: login state is kept in browser storage, which belongs to one
  domain. This frontend uses the same storage keys as the old one, so serving it on the old frontend's domain keeps
  everyone signed in; on a new domain, users have to log in again. To reuse the domain, remove it from the old Pages
  project first, then add it to the `temp-email-web` Worker.

  登录状态保存在浏览器存储里，而浏览器存储按域名隔离。本前端沿用旧前端的存储键名，所以部署在旧前端的域名上，用户无需重新登录；
  换成新域名的话需要重新登录。要沿用旧域名，先从旧的 Pages 项目里移除该域名，再加到 `temp-email-web` Worker 上。

- **Passkeys / 通行密钥**: passkeys are bound to the domain they were registered on. On a new domain, users have to
  register them again.

  通行密钥绑定注册时的域名，换域名后用户需要重新注册。

- **Old links / 旧链接**: `?jwt=` auto-login links, `?mail_id=` links, `/admin` (redirects to `/console`) and legacy
  `/zh/...`, `/en/...` URLs keep working.

  `?jwt=` 自动登录链接、`?mail_id=` 链接、`/admin`（会跳转到 `/console`）以及旧的 `/zh/...`、`/en/...` 地址都继续可用。

## Switching methods / 切换方式

- **A → B**: disable the *Deploy* workflow (B3), then connect the repository (B1).

  停用 *Deploy* workflow（B3），再关联仓库（B1）。

- **B → A**: disconnect the repository (A3), configure the GitHub secrets and variable (A2), then enable the workflow.

  断开关联仓库（A3），配置 GitHub 的 Secrets 和 Variable（A2），再启用 workflow。

## Troubleshooting / 常见问题

| Symptom / 现象 | Cause and fix / 原因与处理 |
|---|---|
| The site opens but settings fail to load; API requests go to the frontend's own domain<br>页面能打开但设置加载失败，接口请求发到了前端自己的域名 | `VITE_API_BASE` was not set at build time, or was set as a runtime variable. Set it as described above and rebuild.<br>构建时没有设置 `VITE_API_BASE`，或误填成了运行时变量。按上文设置后重新构建 |
| Every push to `main` still deploys<br>每次推送到 `main` 仍然会部署 | Workers Builds is still connected. Disconnect it (A3).<br>还关联着仓库构建，按 A3 断开 |
| The workflow fails at *Check configuration*<br>workflow 在 *Check configuration* 失败 | A secret or variable is missing; see A2.<br>缺少 Secret 或 Variable，见 A2 |
| The workflow fails at the deploy step with an authentication error<br>workflow 在部署步骤报认证错误 | The token lacks Workers permissions or the account ID is wrong. Recreate the token from the *Edit Cloudflare Workers* template.<br>令牌缺少 Workers 权限或账户 ID 不对，用 *Edit Cloudflare Workers* 模板重新创建令牌 |
| Workers Builds fails because of the Worker name<br>关联仓库构建因 Worker 名称失败 | The Worker name differs from `name` in `wrangler.jsonc`. Make them equal.<br>Worker 名与 `wrangler.jsonc` 的 `name` 不一致，改成一致 |
| Turnstile shows an error on the new domain<br>新域名上 Turnstile 报错 | Add the domain to the Turnstile widget's hostname list.<br>把域名加到 Turnstile 组件的域名列表 |
| Webhook mail links open the wrong site<br>Webhook 里的邮件链接打开了错误的站点 | Update the backend `FRONTEND_URL`.<br>更新后端的 `FRONTEND_URL` |

## Other hosting options / 其他托管方式

Not covered in detail here, but supported by the code:

以下方式代码同样支持，这里只简要说明：

- **Cloudflare Pages, same origin / Cloudflare Pages 同源部署**: [`pages/`](../pages) is a Pages project whose
  middleware forwards backend paths to the backend Worker through a service binding, like upstream's `pages/`. Set
  `service` in `pages/wrangler.toml` to the backend Worker name, leave `VITE_API_BASE` empty, then:

  [`pages/`](../pages) 是一个 Pages 项目，其中间件通过服务绑定把后端路径转发给后端 Worker，与上游的 `pages/` 相同。把
  `pages/wrangler.toml` 里的 `service` 改成后端 Worker 的名字，`VITE_API_BASE` 留空，然后：

  ```bash
  pnpm build
  cd pages && npx wrangler pages deploy --branch production
  ```

- **Served by the backend Worker / 由后端 Worker 托管**: in the backend's `wrangler.toml`, point `[assets]` at this
  repository's `dist/` (`binding = "ASSETS"`, `run_worker_first = true`) and leave `VITE_API_BASE` empty.

  在后端的 `wrangler.toml` 里把 `[assets]` 的 `directory` 指向本仓库的 `dist/`（`binding = "ASSETS"`，
  `run_worker_first = true`），`VITE_API_BASE` 留空。

- **Any static host / 任意静态托管**: serve `dist/` with a single-page-app fallback (unknown paths return
  `index.html`). The API URL can also be set after building, in `dist/index.html`:

  托管 `dist/` 并开启单页应用回退（未知路径返回 `index.html`）。接口地址也可以在构建后写进 `dist/index.html`：

  ```html
  <script id="app-config" type="application/json">{"API_BASE":"https://mail-api.example.com"}</script>
  ```
