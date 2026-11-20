# 优化清单

2026-11-20 对照上游前端（基线 `a40a6b0`）和读代码整理，均未实际运行验证。做完一项就把状态改成 ✅，并在 `PLAN.md` 补一条记录。

状态：✅ 完成 · 🚧 进行中 · ⏳ 待开始

## 总览

| # | 事项 | 优先级 | 状态 |
|---|------|--------|------|
| 1 | 落地页手机端顶部按钮放不下 | 高 | ⏳ |
| 2 | 管理员密码弹框没有退路 | 高 | ⏳ |
| 3 | 自动刷新打断浏览、后台标签页仍在请求 | 高 | ⏳ |
| 4 | 迁移旧前端的偏好设置 | 高 | ⏳ |
| 5 | 版本号自动化 | 中 | ⏳ |
| 6 | 新邮件提醒 | 中 | ⏳ |
| 7 | 安装为应用（PWA） | 中 | ⏳ |
| 8 | 清理 lint 警告 | 低 | ⏳ |
| 9 | 用真实后端测试两个密码弹框 | 低 | ⏳ |
| 10 | 真正的一键部署 | 低 | ⏳ |

## 高优先级

### 1. 落地页手机端顶部按钮放不下

- **现状**：管理员登录后，`/` 落地页右上角有「用户中心」「管理后台」两个带文字的按钮和语言、主题两个图标，左侧还有 Logo 和站名。
  估算 360px 宽的屏幕放不下，会挤出或换行。由 `6c63aba`（落地页加管理后台入口）引入。
- **位置**：`src/features/mailbox/landing.tsx` 的 `<header>`。
- **改法**：两个按钮的文字包一层 `<span className="hidden sm:inline">`，小屏只显示图标；按钮加 `aria-label` / tooltip。

### 2. 管理员密码弹框没有退路

- **现状**：`1b8972c` 把站点密码、管理员密码弹框都改成不可关闭。误进 `/console` 的人只能靠浏览器后退或改地址离开。
- **位置**：`src/components/common/auth-dialogs.tsx`（`AdminAuthDialog`），渲染在 `src/features/admin/layout.tsx`。
- **改法**：管理员弹框底部加一个「返回首页」按钮（`Link` 到 `/`），离开时把 `showAdminAuth` 置回 `false`。
  站点密码弹框保持现状：整站都需要它，没有可去的地方。

### 3. 自动刷新打断浏览、后台标签页仍在请求

- **现状**：自动刷新倒计时到点后，`if (page !== 1) setPage(1)` 会把正在看第 3 页的用户拉回第 1 页；
  浏览器标签页切到后台时也照常请求。
- **位置**：`src/components/mail/mail-workspace.tsx` 的 auto refresh `useEffect`。
- **改法**：只在第 1 页时自动刷新（其他页暂停倒计时，或只显示「有新邮件」提示）；`document.visibilityState === 'hidden'` 时暂停，
  回到前台时立即刷新一次。

### 4. 迁移旧前端的偏好设置

- **现状**：新前端的偏好存在 `localStorage` 的 `tm-prefs` 里，旧前端用的是各自独立的键，新前端不读。
  同域名替换后，用户选过的语言等设置会变回默认。
- **位置**：`src/store/prefs.ts`。
- **改法**：首次启动（还没有 `tm-prefs`）时读一次旧键导入：

  | 旧键（VueUse `useStorage`，值为字符串） | 新字段 |
  |---|---|
  | `preferredLocale` | `locale` |
  | `useUTCDate` | `useUTCDate` |
  | `autoRefresh` | `autoRefresh` |
  | `configAutoRefreshInterval` | `autoRefreshInterval` |
  | `preferShowTextMail` | `preferShowTextMail` |
  | `mailListPreviewLineClamp` | `previewLines` |

  `autoLoadRemoteImages` 不迁移：旧版默认开、新版默认关，而 VueUse 会把默认值也写进存储，分不清是不是用户主动开的，出于隐私保持关闭。

## 中优先级

### 5. 版本号自动化

- **现状**：`/about` 显示的前端版本来自 `package.json` 的 `version`（`vite.config.ts` 里的 `PACKAGE_VERSION`），要手动改。
  改成 fork 同步后自动部署以后，基本不会有人去改，`/about` 看不出线上是哪个版本。
- **改法**：`vite.config.ts` 优先读环境变量（如 `APP_VERSION`），`deploy.yml` 构建时传入：标签发布用标签名，其他情况用
  `package.json` 版本加短提交号（如 `0.1.0+f3a8f8f`）。部署文档里「先改版本号」那一步可以去掉。

### 6. 新邮件提醒

- **现状**：自动刷新只更新列表，没有任何提醒。上游也没有，属于增强。
- **改法**：自动刷新拿到比上次更新的邮件时，浏览器标签标题显示未读数（如 `(2) 临时邮箱`）；在偏好设置里加一个可选的浏览器通知开关。
  等验证码时很实用。

### 7. 安装为应用（PWA）

- **现状**：上游用 `vite-plugin-pwa` 提供了 manifest，可以「添加到桌面」；新前端没有。
- **改法**：在 `public/` 加 `manifest.webmanifest` 和图标，在 `index.html` 引用即可恢复安装能力，不需要做离线缓存。
- **已确认无风险**：上游的 Service Worker 配置是 `globPatterns: []`、`runtimeCaching: []`、`navigateFallback: null`，
  什么都不缓存。同域名替换后旧 Service Worker 不会让用户卡在旧页面，不需要额外部署注销用的 `sw.js`。

## 低优先级

### 8. 清理 lint 警告

`pnpm lint` 目前有 27 条警告（均为 warning，见 `PLAN.md`「下次继续」）。

### 9. 用真实后端测试两个密码弹框

用设置了 `PASSWORDS` 和 `ADMIN_PASSWORDS` 的 Worker（本地 e2e 环境默认 `DISABLE_ADMIN_PASSWORD_CHECK=true`，需要改配置）走一遍：
输错、输对、Turnstile 开启时的流程，以及弹框不可关闭（`1b8972c`）后的表现。

### 10. 真正的一键部署

- **现状**：README 的「Deploy to Cloudflare」按钮和上游一样，只是链接到部署文档。Cloudflare 真正的一键部署只支持 Worker 运行时变量，
  设不了构建变量 `VITE_API_BASE`；而且它复制出的仓库不是 fork，用不了定时同步。
- **改法**：改成运行时下发后端地址。给 `wrangler.jsonc` 加一个 Worker 脚本（`main`），返回 `index.html` 时用 `HTMLRewriter`
  把 Worker 变量 `API_BASE` 写进 `#app-config`；`vars` 里给出默认值，一键部署时会让用户填写。改动较大，有需要再做。

## 已检查、无需处理

- **功能对齐**：上游 `frontend/src/views`、`components` 的页面和组件都有对应实现，包括批量创建与导出、用户邮箱管理、统计趋势、
  Webhook、Telegram、AI 提取。上游的「极简首页」（`useSimpleIndex`）、标签页位置、侧边留白等外观选项是旧版布局专用，新布局不需要。
- **邮件搜索**：只搜当前页，和上游一致（后端 `/api/mails` 不支持关键词），输入框已提示「搜索当前页邮件」。
- **旧 Service Worker**：见第 7 项。
