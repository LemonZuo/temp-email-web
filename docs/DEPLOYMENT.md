# 部署

[English](./DEPLOYMENT.en.md)

前端构建后是纯静态站点（`dist/`），部署为 Cloudflare Pages 项目，项目名为 `temp-email-web`（见 `wrangler.jsonc`）。

接口请求与页面**同源**：`/api/`、`/open_api/`、`/user_api/`、`/admin/` 等路径由 Pages Functions（`functions/_middleware.js`）
通过服务绑定转发给后端 Worker，其余路径直接返回静态文件。因此：
- 不需要配置后端地址；
- 没有跨域请求；
- 后端也不需要改动。

`public/_routes.json` 限定只有这些接口路径才会运行 Functions，访问静态文件不占用 Functions 的请求额度。

部署有两种方式，**只能选一种**：

| | 方式一：GitHub Actions | 方式二：Cloudflare Pages 关联仓库 |
|---|---|---|
| 何时部署 | fork 同步完成后、推送 `v*` 标签、手动运行 | 每次推送到 `main` |
| 配置位置 | GitHub 仓库的 Secrets | Cloudflare 上 Pages 项目的构建设置 |
| 适合 | 从 fork 定期上线（当前使用） | 推送即上线，其他分支自动生成预览地址 |

## 准备

1. 一个已部署的 cloudflare_temp_email 后端（本前端按 v1.15.0 开发），要和 Pages 项目在**同一个 Cloudflare 账户**里。
2. 确认后端 Worker 的名称（后端 `wrangler.toml` 里的 `name`，默认 `cloudflare_temp_email`），
   和 `wrangler.jsonc` 中 `services` 的 `service` 一致。不一致就改 `wrangler.jsonc`。
3. 可选构建变量：
   - `VITE_DEFAULT_LANG`：默认语言，`zh` 或 `en`。
   - `VITE_API_BASE`：一般**不要设置**。只有想跳过服务绑定、让页面跨域直连某个后端地址时才填。

## 方式一：GitHub Actions

### 首次配置

1. 在 Cloudflare 创建 API 令牌：*My Profile* → *API Tokens* → *Create Token* → *Create Custom Token*。
   - 权限选 **Account → Cloudflare Pages → Edit**。
   - 用 *Edit Cloudflare Workers* 模板创建也可以，但要确认里面包含这一项，没有就加上。已有令牌可以直接编辑权限，令牌值不变。
   - 再记下账户 ID（*Workers & Pages* 概览页可以看到）。
2. 在 GitHub 仓库 *Settings* → *Secrets and variables* → *Actions* 中添加：

   | 类型 | 名称 | 值 |
   |---|---|---|
   | Secret | `CLOUDFLARE_API_TOKEN` | 上一步创建的令牌 |
   | Secret | `CLOUDFLARE_ACCOUNT_ID` | 账户 ID |

   如果之前按 Worker 方式部署时加过 Variable `VITE_API_BASE`，删掉它，否则页面会继续跨域请求后端。

Pages 项目不存在时，第一次运行 *Deploy* 会自动创建（生产分支为 `main`），之后每次都部署到生产环境。

### 上线

和上游一样，推送到 `main` 不会部署。*Deploy* 有三种触发方式：

- **fork 同步后自动部署**（当前用法）：fork 每周一同步成功后自动部署。想马上上线，就在 fork 的 *Actions* 里手动运行
  *Upstream Sync*。详见[从 fork 部署](#从-fork-部署)。
- **手动运行**：*Actions* → *Deploy* → *Run workflow*，选择分支或标签。
- **打标签**：想标记正式版本时使用。先改版本号（`/about` 页面显示的前端版本就是它），再把标签推送到部署所在的仓库：

  ```bash
  npm version 0.2.0 --no-git-tag-version   # 只改 package.json
  git commit -am "chore: release v0.2.0"
  git push origin main
  git tag v0.2.0
  git push origin v0.2.0                    # 从 fork 部署时，推送到 fork 对应的 remote
  ```

每次部署都会在 Pages 项目的 *Deployments* 里留下一条记录。说明是触发它的标签或分支名，提交号就是部署的代码版本。

### 回滚

Pages 项目 → *Deployments* 里找到旧的生产部署，选 *Rollback to this deployment*，立即生效。也可以对旧标签手动运行一次
*Deploy*。

## 方式二：Cloudflare Pages 关联仓库

### 首次配置

1. *Workers & Pages* → *Create application*，点页面底部的「继续前往 Pages」（*Looking to deploy Pages?*）→
   *Import an existing Git repository*，授权 GitHub 后选择本仓库。
2. 按下表填写：

   | 设置项 | 值 |
   |---|---|
   | 项目名称 | `temp-email-web`（与 `wrangler.jsonc` 的 `name` 一致） |
   | 生产分支 | `main` |
   | 框架预设 | `None` |
   | 构建命令 | `pnpm run build` |
   | 构建输出目录 | `dist` |
   | 环境变量 | `PNPM_VERSION` = `11.14.0`（与 `package.json` 的 `packageManager` 一致） |

   - Node 版本取自仓库里的 `.node-version`。
   - 服务绑定从 `wrangler.jsonc` 读取，不需要在控制台另外配置。
3. 在 GitHub 仓库 *Actions* → *Deploy* → `···` → *Disable workflow* 停用方式一，避免打标签时重复部署。

### 日常使用

- 推送到 `main` 会自动构建上线。
- 推送其他分支会生成预览地址（`<分支>.temp-email-web.pages.dev`），不需要的话在 *Settings* → *Builds* → *Branch control* 关闭。
- **回滚**：Pages 项目 → *Deployments* 里选旧的生产部署回滚。

## 部署后检查

- **接口是否打通**：打开 `https://<前端域名>/open_api/settings`，应返回 JSON。返回 404、500 或页面 HTML，见[常见问题](#常见问题)。
- **打开站点**：首页应显示后端配置的站点标题和邮箱域名。
- **自定义域名**：Pages 项目 → *Custom domains* → *Set up a custom domain*。
- **后端 `FRONTEND_URL`**：改成前端地址，Webhook 推送里的邮件链接用的就是它。
- **Turnstile**：后端开启了人机验证的话，要把前端域名加到 Turnstile 的域名列表。
- **OAuth2**：回调地址是 `https://<前端域名>/user/oauth2/callback`，管理后台的 *OAuth2* 设置和服务商那边都要改。
- **Telegram 小程序**：需要单独构建，部署到另一个 Pages 项目，再把地址填到管理后台的 *Telegram* 设置：

  ```bash
  pnpm build:telegram
  npx wrangler pages project create temp-email-web-telegram --production-branch main   # 仅第一次
  npx wrangler pages deploy --project-name temp-email-web-telegram --branch main
  ```

## 从旧前端迁移

- 部署在**旧前端的域名**上，用户无需重新登录（浏览器存储沿用同样的键名）。换新域名需要重新登录，通行密钥也要重新注册。
- **旧前端是 Pages 项目**：先把域名从旧项目移除，再加到 `temp-email-web` 项目上。
- **之前按 Worker 静态资源部署过本前端**：
  1. 先确认新的 Pages 站点正常。
  2. 把自定义域名从 Worker `temp-email-web` 上解绑（*Settings* → *Domains & Routes*），再加到 Pages 项目上。
  3. 最后删除这个 Worker。

  注意 `*.workers.dev` 和 `*.pages.dev` 是不同的域名，直接用这两个地址访问的话，登录状态不互通。
- `?jwt=`、`?mail_id=` 链接，`/admin`（会跳转到 `/console`），以及 `/zh/...`、`/en/...` 旧地址都继续可用。

## 从 fork 部署

fork 里的 *Upstream Sync*（`.github/workflows/sync.yaml`）每周一北京时间 08:00 自动从 `berry-shake/temp-email-web`
同步 `main`，也可以在 *Actions* 页面手动运行。同步和同步后的自动部署都只在 fork 里运行，源仓库不受影响。

- 第一次需要在 fork 的 GitHub 页面点一次 **Sync fork**，把这个 workflow 同步过去。
- 方式一：同步成功后自动运行 *Deploy*；没有新提交时也会重新部署一次同样的代码，不影响使用。同步失败则不部署。
- 方式二：同步更新 `main` 后，Cloudflare 自动构建。
- 同步不会带上源仓库的标签。
- 源仓库改了 `.github/workflows/` 下的文件时，默认令牌没有权限同步，需要在 fork 添加 Secret `UPSTREAM_SYNC_TOKEN`
  （勾选 `repo` 和 `workflow` 权限的个人访问令牌）。
- fork 的 `main` 上有自己的提交并且和源仓库冲突时，同步会失败，需要手动处理。

## 常见问题

**页面能打开，但设置加载失败？**
打开 `https://<前端域名>/open_api/settings` 看返回：
- 返回页面 HTML：`_routes.json` 没生效，确认构建产物 `dist/` 里有 `_routes.json`。
- 返回 500 或提示找不到服务：服务绑定没连上后端，检查 `wrangler.jsonc` 里的后端 Worker 名，并确认它和 Pages 项目在同一个账户。
- 请求发到了别的域名：构建时设置了 `VITE_API_BASE`，删掉后重新部署。

**用的是方式一，但每次推送都在部署？**
这个 Pages 项目关联着 Git 仓库（方式二）。到 Pages 项目 → *Settings* → *Builds* → *Branch control* 关闭自动部署，
或者改用一个新的项目名。

**Actions 在 Check configuration 步骤失败？**
缺少 Secret，日志里会列出缺了哪个。

**Actions 在 Create Pages project 或 Deploy 步骤报认证错误？**
令牌没有 *Cloudflare Pages: Edit* 权限，或账户 ID 不对。

**部署成功了，但访问的还是旧版本？**
部署到了预览环境。方式一始终部署到 `main`；Pages 项目的生产分支也必须是 `main`（*Settings* → *Builds* → *Branch control*）。

## 其他部署方式

<details>
<summary>Worker 静态资源、由后端 Worker 托管、任意静态托管</summary>

- **Worker 静态资源**：把 `wrangler.jsonc` 换成 Worker 配置，用 `assets` 指向 `./dist`，并设
  `not_found_handling: "single-page-application"`。可参考提交 `41fcaaa` 中的版本。
  - 这种方式不走 Functions，页面要跨域请求后端，构建时必须设置 `VITE_API_BASE`。
  - 部署命令是 `npx wrangler deploy`。
- **由后端 Worker 托管**：在后端 `wrangler.toml` 的 `[assets]` 里把 `directory` 指向本仓库的 `dist/`
  （`binding = "ASSETS"`，`run_worker_first = true`），`VITE_API_BASE` 留空。
- **任意静态托管**：托管 `dist/`，并把未知路径回退到 `index.html`，接口需要跨域访问后端。后端地址可以在构建时用
  `VITE_API_BASE` 设置，也可以在构建后写进 `dist/index.html`：
  `<script id="app-config" type="application/json">{"API_BASE":"https://mail-api.example.com"}</script>`。

</details>
