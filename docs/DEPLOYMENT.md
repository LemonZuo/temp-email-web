# 部署

[English](./DEPLOYMENT.en.md)

前端构建后是纯静态站点（`dist/`），以 Cloudflare Worker 静态资源的形式部署，Worker 名为 `temp-email-web`（见
`wrangler.jsonc`）。页面直接跨域请求后端 Worker，后端已开放 CORS，不需要改动。

部署有两种方式，**只能选一种**：

| | 方式一：GitHub Actions | 方式二：Cloudflare 关联仓库 |
|---|---|---|
| 何时部署 | fork 同步完成后、推送 `v*` 标签、手动运行 | 每次推送到 `main` |
| 配置位置 | GitHub 仓库的 Secrets / Variables | Cloudflare 上 Worker 的构建设置 |
| 适合 | 从 fork 定期上线（当前使用） | 推送即上线 |

## 准备

1. 一个已部署的 cloudflare_temp_email 后端（本前端按 v1.15.0 开发），记下它的地址，例如 `https://mail-api.example.com`。
   执行 `curl https://mail-api.example.com/open_api/settings` 能返回 JSON 即可。
2. 构建变量 `VITE_API_BASE` 填这个后端地址，结尾不带 `/`。可选 `VITE_DEFAULT_LANG`（`zh` 或 `en`）设置默认语言。

> 构建变量在构建时写进页面代码，不是 Worker 的运行时变量：填在 Worker 的 *Variables and Secrets* 里不会生效，修改后要重新构建。

## 方式一：GitHub Actions

### 首次配置

1. 在 Cloudflare 创建 API 令牌：*My Profile* → *API Tokens* → *Create Token*，模板选 **Edit Cloudflare Workers**。
   再记下账户 ID（*Workers & Pages* 概览页可以看到）。
2. 在 GitHub 仓库 *Settings* → *Secrets and variables* → *Actions* 中添加：

   | 类型 | 名称 | 值 |
   |---|---|---|
   | Secret | `CLOUDFLARE_API_TOKEN` | 上一步创建的令牌 |
   | Secret | `CLOUDFLARE_ACCOUNT_ID` | 账户 ID |
   | Variable | `VITE_API_BASE` | 后端地址 |

3. 如果这个 Worker 关联过仓库（方式二），到 Worker → *Settings* → *Build* 断开，否则每次推送仍会部署。

Worker 还不存在的话，第一次发布时会自动创建。

### 上线

和上游一样，推送到 `main` 不会部署。*Deploy* 有三种触发方式：

- **fork 同步后自动部署**（当前用法）：fork 每周一同步成功后自动部署。想马上上线，就在 fork 的 *Actions* 里手动运行
  *Upstream Sync*。详见[从 fork 部署](#从-fork-部署)。
- **手动运行**：*Actions* → *Deploy* → *Run workflow*，选择分支或标签。改了 `VITE_API_BASE` 后也用这个重新部署。
- **打标签**：想标记正式版本时使用。先改版本号（`/about` 页面显示的前端版本就是它），再把标签推送到部署所在的仓库：

  ```bash
  npm version 0.2.0 --no-git-tag-version   # 只改 package.json
  git commit -am "chore: release v0.2.0"
  git push origin main
  git tag v0.2.0
  git push origin v0.2.0                    # 从 fork 部署时，推送到 fork 对应的 remote
  ```

每次部署都会在 Cloudflare 的版本记录（Worker → *Deployments*）里留下一条，打标签发布的版本会带上标签名。

### 回滚

Worker → *Deployments* 里选旧版本回滚，立即生效；也可以对旧标签手动运行一次 *Deploy*。

## 方式二：Cloudflare 关联仓库

### 首次配置

1. *Workers & Pages* → *Create application* → *Import a repository*，授权 GitHub 后选择本仓库。
   已有的 Worker 在 *Settings* → *Build* → *Connect* 里关联。
2. 按下表填写：

   | 设置项 | 值 |
   |---|---|
   | Worker 名称 | `temp-email-web`（必须与 `wrangler.jsonc` 的 `name` 一致） |
   | 生产分支 | `main` |
   | 构建命令 | `pnpm run build` |
   | 部署命令 | `npx wrangler deploy` |
   | 构建变量 | `VITE_API_BASE` = 后端地址 |

   `VITE_API_BASE` 要填在构建设置的 *Variables and secrets* 里，不是 Worker 的运行时变量。
3. 在 GitHub 仓库 *Actions* → *Deploy* → `···` → *Disable workflow* 停用方式一，避免打标签时重复部署。

### 日常使用

- 推送到 `main` 会自动构建上线。推送其他分支默认只上传新版本、不上线，不需要的话在 *Settings* → *Build* → *Branch control* 关闭。
- 改了构建变量后，要再推送一次，或在构建记录里重新运行，才会生效。
- **回滚**：Worker → *Deployments* 里选旧版本回滚。

## 部署后检查

- **自定义域名**：Worker → *Settings* → *Domains & Routes* → *Add* → *Custom domain*。
- **打开站点**：首页应显示后端配置的站点标题和邮箱域名。加载失败基本都是 `VITE_API_BASE` 没配好。
- **后端 `FRONTEND_URL`**：改成前端地址，Webhook 推送里的邮件链接用的就是它。
- **Turnstile**：后端开启了人机验证的话，要把前端域名加到 Turnstile 的域名列表。
- **OAuth2**：回调地址是 `https://<前端域名>/user/oauth2/callback`，管理后台的 *OAuth2* 设置和服务商那边都要改。
- **Telegram 小程序**：需要单独构建，部署到另一个 Worker，再把地址填到管理后台的 *Telegram* 设置：

  ```bash
  VITE_API_BASE=https://mail-api.example.com pnpm build:telegram
  npx wrangler deploy --name temp-email-web-telegram
  ```

## 从旧前端迁移

- 部署在**旧前端的域名**上，用户无需重新登录（浏览器存储沿用同样的键名）。换新域名需要重新登录，通行密钥也要重新注册。
- 要沿用旧域名，先把域名从旧的 Pages 项目移除，再加到 `temp-email-web` Worker 上。
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
构建时没拿到 `VITE_API_BASE`（或填成了运行时变量），接口请求发到了前端自己的域名。按上文配置后重新构建。

**用的是方式一，但每次推送都在部署？**
Worker 还关联着仓库，到 Worker → *Settings* → *Build* 断开。

**Actions 在 Check configuration 步骤失败？**
缺少 Secret 或 Variable，日志里会列出缺了哪个。

**Actions 部署时报认证错误？**
令牌权限或账户 ID 不对，用 *Edit Cloudflare Workers* 模板重新创建令牌。

**关联仓库构建提示 Worker 名称不一致？**
Worker 名必须是 `temp-email-web`，与 `wrangler.jsonc` 的 `name` 一致。

## 其他部署方式

<details>
<summary>Cloudflare Pages 同源部署、由后端 Worker 托管、任意静态托管</summary>

- **Pages 同源部署**：`pages/` 是一个 Pages 项目，通过服务绑定把接口请求转发给后端。把 `pages/wrangler.toml` 的
  `service` 改成后端 Worker 名，`VITE_API_BASE` 留空，然后执行
  `pnpm build && cd pages && npx wrangler pages deploy --branch production`。
- **由后端 Worker 托管**：在后端 `wrangler.toml` 的 `[assets]` 里把 `directory` 指向本仓库的 `dist/`
  （`binding = "ASSETS"`，`run_worker_first = true`），`VITE_API_BASE` 留空。
- **任意静态托管**：托管 `dist/`，并把未知路径回退到 `index.html`。接口地址也可以在构建后写进 `dist/index.html`：
  `<script id="app-config" type="application/json">{"API_BASE":"https://mail-api.example.com"}</script>`。

</details>
