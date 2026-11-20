# Temp Email Web — 重写计划

基于 `cloudflare_temp_email` 现有 Worker 后端接口（不改后端），用全新技术栈重写全部前端页面。

- **技术栈**：Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui（radix-nova 风格）
- **路由/状态/数据**：react-router 8 · zustand · @tanstack/react-query
- **其它**：sonner（提示）· lucide-react（图标）· postal-mime（邮件解析）· DOMPurify · Tiptap（富文本写信）· recharts（统计图）
- **上游基线**：`cloudflare_temp_email` 提交 `a40a6b0`（`refactor: extract shared mail parser (#1251)`，v1.15.0，DB schema v0.0.11），之后的上游同步记录见 [docs/UPSTREAM.md](./docs/UPSTREAM.md)
- **视觉风格**：类 Gmail / Outlook 三栏布局（侧边导航 + 邮件列表 + 阅读区），移动端自动折叠
- **范围**：邮箱主页 + 用户中心 + 管理后台 + 兑换码 + Telegram 小程序，全部覆盖
- **兼容性**：沿用旧前端的 localStorage key（`jwt` / `userJwt` / `adminAuth` / `auth` / `LocalAddressCache`），替换部署后用户无需重新登录；保留 `/user/oauth2/callback`、`?jwt=`、`?mail_id=` 等入口

状态标记：✅ 完成 · 🚧 进行中 · ⏳ 待开始

---

## 阶段 0：项目初始化

| # | 任务 | 状态 |
|---|------|------|
| 0.1 | Vite + React + TS 脚手架、git init | ✅ |
| 0.2 | Tailwind v4、`@/` 路径别名、开发代理（`DEV_PROXY_TARGET`） | ✅ |
| 0.3 | shadcn/ui 初始化 + 约 40 个基础组件（修正生成代码的 `cn` 导入问题） | ✅ |
| 0.4 | 安装依赖：router / zustand / react-query / postal-mime / tiptap / recharts 等 | ✅ |

## 阶段 1：基础层（主线程负责）

| # | 任务 | 文件 | 状态 |
|---|------|------|------|
| 1.1 | 工具库：运行时配置、安全请求头、指纹、SHA-256、日期格式化、过期时间、JWT 解码、剪贴板 | `src/lib/*` | ✅ |
| 1.2 | 邮件解析（postal-mime）、发件箱解析、远程图片拦截、回复/转发草稿 | `src/lib/mail-parser.ts` 等 | ✅ |
| 1.3 | 状态：鉴权（兼容旧 key）、偏好设置、全局设置、写信草稿 | `src/store/*` | ✅ |
| 1.4 | i18n：组件就近定义 zh/en 文案 + 公共文案兜底 | `src/i18n/*` | ✅ |
| 1.5 | API 客户端：鉴权头、401 弹窗、access token 过期自动刷新重试、JWT 续期 | `src/lib/api.ts` | ✅ |
| 1.6 | 通用组件：确认框、复制按钮、页面骨架、分页、密码框、空状态、Turnstile | `src/components/common/*` | ✅ |
| 1.7 | 通用组件：站点密码 / 管理员密码弹窗、地址凭证弹窗（含二维码、SMTP/IMAP、AI Agent）、公告 | `src/components/common/*` | ✅ |
| 1.8 | 布局：AppShell（inset 侧边栏 + 内容区）、主题切换、语言切换、模块切换 | `src/components/layout/*` | ✅ |
| 1.9 | 邮件组件：列表、阅读器（Shadow DOM 隔离）、附件、AI 提取信息、三栏工作区、发件箱工作区 | `src/components/mail/*` | ✅ |
| 1.10 | 写信组件：文本 / HTML / 富文本（Tiptap）、预览 | `src/components/compose/*` | ✅ |
| 1.11 | 路由骨架 + 各模块占位页、App 入口（Provider、启动加载设置）、分页 hook | `src/App.tsx`, `src/router.tsx`, `src/hooks/*` | ✅ |
| 1.12 | 类型检查 + 构建通过（tsc 0 错误；lint 仅警告） | — | ✅ |

## 阶段 2：邮箱主页（主线程负责）

| # | 任务 | 对应旧页面 | 状态 |
|---|------|-----------|------|
| 2.1 | 登录 / 创建地址（凭证登录、地址密码登录、域名/子域名/过期时间、随机名）+ 落地页 | `common/Login.vue` | ✅ |
| 2.2 | 地址切换器（本地缓存地址 + 用户绑定地址）、本地地址管理 | `AddressSelect.vue`, `LocalAddress.vue` | ✅ |
| 2.3 | 收件箱三栏（搜索、自动刷新、已读/未读、多选删除/下载、`?mail_id=`） | `MailBox.vue` | ✅ |
| 2.4 | 发件箱 | `SendBox.vue` | ✅ |
| 2.5 | 写信 / 回复 / 转发、申请发信权限 | `index/SendMail.vue` | ✅ |
| 2.6 | 地址设置（凭证、修改密码、清空收件箱/发件箱、删除地址） | `index/AccountSettings.vue` | ✅ |
| 2.7 | 自动回复 | `index/AutoReply.vue` | ✅ |
| 2.8 | S3 附件管理 | `index/Attachment.vue` | ✅ |
| 2.9 | 外观偏好设置、关于页 | `common/Appearance.vue`, `About.vue` | ✅ |

## 阶段 3：用户中心（子代理 A）

| # | 任务 | 对应旧页面 | 状态 |
|---|------|-----------|------|
| 3.1 | 登录 / 注册 / 邮箱验证码 / 找回密码 | `user/UserLogin.vue` | ✅ |
| 3.2 | Passkey 登录与管理、OAuth2 登录与回调 | `UserLogin.vue`, `UserOauth2Callback.vue`, `UserSettings.vue` | ✅ |
| 3.3 | 地址管理（绑定、解绑、转移、新建、切换） | `user/AddressManagement.vue`, `BindAddress.vue` | ✅ |
| 3.4 | 用户收件箱 / 发件箱 / 写信 | `UserMailBox.vue`, `UserSendBox.vue`, `user/SendMail.vue` | ✅ |
| 3.5 | 用户设置（账户信息、退出、Passkey 列表） | `user/UserSettings.vue` | ✅ |

## 阶段 4：管理后台 · 账号与邮件（子代理 B）

| # | 任务 | 对应旧页面 | 状态 |
|---|------|-----------|------|
| 4.1 | 地址账号列表（搜索、查看凭证、重置密码、清空、删除、批量操作） | `admin/Account.vue` | ✅ |
| 4.2 | 创建地址、批量创建、批量导出 | `CreateAccount.vue`, `BatchCreate.vue`, `BatchExportModal.vue` | ✅ |
| 4.3 | 全部邮件 / 未知收件人邮件 / 发件箱 | `Mails.vue`, `MailsUnknow.vue`, `admin/SendBox.vue` | ✅ |
| 4.4 | 管理员发信 | `admin/SendMail.vue` | ✅ |
| 4.5 | 发信权限管理 | `SenderAccess.vue` | ✅ |
| 4.6 | 统计概览 + 趋势图 | `Statistics.vue`, `StatisticsTrend.vue` | ✅ |
| 4.7 | 用户管理、用户地址管理 | `UserManagement.vue`, `UserAddressManagement.vue` | ✅ |

## 阶段 5：管理后台 · 设置类 + 其它（子代理 C1：5.1/5.2/5.4 中 AI 提取与 IP 黑名单/5.5；子代理 C2：5.3/5.4 中 Telegram/5.6/5.7）

| # | 任务 | 对应旧页面 | 状态 |
|---|------|-----------|------|
| 5.1 | 账号设置（黑名单、关键字等） | `admin/AccountSettings.vue` | ✅ |
| 5.2 | 用户设置、OAuth2 设置、角色地址配置 | `UserSettings.vue`, `UserOauth2Settings.vue`, `RoleAddressConfig.vue` | ✅ |
| 5.3 | Webhook 共享组件 + 地址 Webhook + 全局 Webhook + 邮件 Webhook | `WebhookComponent.vue`, `index/Webhook.vue`, `admin/Webhook.vue`, `MailWebhook.vue` | ✅ |
| 5.4 | Telegram 设置、AI 提取设置、IP 黑名单 | `Telegram.vue`, `AiExtractSettings.vue`, `IpBlacklistSettings.vue` | ✅ |
| 5.5 | Worker 配置、维护（清理）、数据库管理 | `WorkerConfig.vue`, `Maintenance.vue`, `DatabaseManager.vue` | ✅ |
| 5.6 | 兑换码管理 + 兑换页 | `RedeemCodes.vue`, `Redeem.vue` | ✅ |
| 5.7 | Telegram 小程序（地址管理、邮件查看） | `TelegramAddress.vue`, `telegram/Mail.vue` | ✅ |

## 阶段 6：集成与验收（主线程负责）

| # | 任务 | 状态 |
|---|------|------|
| 6.1 | 合并各模块、统一导航与路由、类型检查 + 构建 | ✅ |
| 6.2 | 本地起 Worker 联调，浏览器逐页冒烟测试（亮/暗色、桌面/移动端） | ✅ |
| 6.3 | 代码审查（正确性、与旧接口契约一致性） | ✅ |
| 6.4 | README：开发、构建、部署（Cloudflare Pages / 与 Worker 同域）说明 | ✅ |

---

## 进度日志

- 2026-11-19：确定技术栈与范围；完成阶段 0、阶段 1（基础层全部）、阶段 2.1–2.2。按用户要求暂停，推送到 GitHub。

- 2026-11-20：继续开发。新增 `docs/CONVENTIONS.md`（共享开发约定）、Telegram Mini App 脚本加载；派出 4 个子代理并行开发阶段 3–5；主线程开始阶段 2.3–2.9。
- 2026-11-20：阶段 2.3–2.9 完成，并与本地 Worker（e2e Docker）联调通过：建地址、凭证弹窗、三栏收件箱、远程图片拦截、写信（纯文本/HTML/富文本）、设置、偏好、自动回复、暗色、移动端单栏。修复：富文本编辑器在 StrictMode 下崩溃（改为 `key` 重挂载）；用自写 `lib/theme.ts` 替换 next-themes（React 19 下报 script 警告，`index.html` 内联脚本防闪烁）；写信页顶栏标题缺失；顶栏分隔线未居中；新增路由级错误页 `RouteError`。主包拆分后 200KB（gzip 69KB）。

- 2026-11-20：发现路由冲突——Pages 中间件 / Worker 会把 `/admin/*` 全部转发给后端 API，后台深链刷新会打到接口。后台前端路由改为 `/console/*`（`/admin` 重定向过去，`adminPath()` 构造链接），dev 代理改为与中间件一致的带斜杠前缀正则；已通知各子代理。新增 `pages/`（Pages 项目 + API 转发中间件），README 补全构建、配置、三种部署方式与兼容说明（6.4 ✅）。

- 2026-11-20：阶段 4 完成（子代理 B，已在本地 Worker 实测）：统计概览 + 趋势图、地址列表（服务端排序、批量操作带进度）、单个/批量创建 + CSV 导出、发信权限、全部/未知收件人邮件、发件箱、管理员发信、用户管理（含新增的给用户绑定地址）。主线程跟进：管理员发信改用独立草稿 `useAdminCompose`（`ComposeForm store`），发信成功提示合并为一条（`ComposeForm sentHint`）。

- 2026-11-20：阶段 3 完成（子代理 A，已在本地 Worker 实测桌面 + 390px）：登录/注册/验证码/找回密码、Passkey、OAuth2 登录与回调（沿用旧 state 键名）、地址管理（服务端搜索、转移、解绑、新建、绑定）、用户收件箱/发件箱（新增回复/转发）、写信、用户设置（Passkey 列表）。主线程跟进共享代码：侧栏「新建邮箱」漏绑定用户的 bug（`CreateAddressForm` 新增 `afterCreated` / `showCredential`，默认流程统一为切换→绑定→凭证弹窗）；`AddressLoginForm onSuccess({ bound })`；凭证弹窗取消自动聚焦（首次 Esc 被 tooltip 吃掉）。

- 2026-11-20：阶段 5 完成。子代理 C1（设置类，9 页）：邮箱设置、用户设置、OAuth2（4 种模板）、角色地址配置、AI 提取、IP 黑名单、数据库、Worker 配置、维护；共享 `use-settings-draft`（未保存改动离开确认）、`StringListInput`、吸底保存栏。子代理 C2：Webhook 过滤规则编辑器（可视化 + JSON，旧 34 条单测通过）、地址/全局/邮件 Webhook、Telegram 设置、兑换码管理 + 兑换页、Telegram 小程序面板与邮件页。主线程跟进：`confirm({ destructive })` 按钮未变红；Telegram 内侧栏「新建或登录邮箱」改用 `TelegramAddressPanel`；后台长导航自动滚动到当前项；`vite.config` 改用 `import.meta.dirname`。
- 2026-11-20：阶段 6.1/6.2 完成：tsc 0 错误、构建无警告、lint 0 错误（24 条警告）。全量页面冒烟（后台 22 页 + 用户中心 5 页 + 兑换页，浅色桌面 / 暗色桌面 / 浅色手机）0 控制台错误、0 接口失败、0 崩溃。已知后端旧问题（未改）：`/admin/account_settings` 仅在 `fromBlockList` 非空时写 KV，清空后保存不生效。

- 2026-11-20：补回旧版隐藏入口：连点站点 logo 5 次进入管理后台（`Logo` 组件内置，提示剩余次数，3 秒未点则重新计数；侧栏里点 logo 不再展开模块菜单，折叠为图标时除外；后台内不触发），落地页与侧栏均已在浏览器实测。站点/管理员密码框的 Turnstile 改为仅在 `enableGlobalTurnstileCheck` 时显示（与旧版一致）。

- 2026-11-20：6.3 代码审查完成（3 个审查代理对照 Worker 源码，接口契约全部一致），修复 14 处：
  - 邮箱/共享层：分页 hook 无数据时 `items` 每次新建导致无限渲染；`hasContent` 用 `innerHTML` 解析转发正文可触发 XSS（改 `DOMParser`）；切换邮箱期间仍显示上一个邮箱的邮件（`addressSettings.jwt` 不一致时卸载页面，分页占位数据不跨列表）；`loadAddressSettings` 迟到响应覆盖当前地址；登录表单未走 `switchAddress`；access token 刷新重试前校验会话未变；附件 blob URL 复用并按 LRU 释放、.eml 按需生成。
  - 用户侧：兑换码列表加载失败无提示；兑换码导出 CSV 补 BOM；关闭发信时 `/sent`、`/compose`（邮箱与用户中心）重定向。
  - 后台：发信权限、修改角色弹窗取消后重开仍是旧草稿；有未保存改动时退出管理员不生效；邮箱设置保存后刷新期间可重复提交；接收屏蔽关键词清空无效（后端限制）加提示。
  - 定向浏览器测试：XSS 不执行、切换邮箱不再闪现旧邮件、列表接口 500 时无渲染循环。
- 2026-11-20：按用户要求：侧栏菜单分组可折叠（点分组标题，按模块记住状态，当前页所在分组自动展开，图标模式下忽略）；侧栏宽/窄模式（底部「收起菜单」按钮 + ⌘B/Ctrl+B，状态持久化；桌面端顶栏开关移除，仅手机端保留）。

- 2026-11-20：写信正文输入框（纯文本 / HTML / 富文本）去掉聚焦光圈。
- 2026-11-20：支持 Cloudflare 控制台「Continue with GitHub」部署（Workers 静态资源）：新增 `wrangler.jsonc`（`dist` + SPA 回退）、`.node-version`、`packageManager`、`deploy` 脚本；干净目录模拟 CI 安装/构建、`wrangler deploy --dry-run`、`wrangler dev` 深链刷新均通过。README 补部署方式 C。
- 2026-11-20：线上 Worker 为 v1.13.0（趋势统计接口 v1.14.0 才有），统计页兼容旧版返回（只显示总数并提示升级）；对比 v1.13.0 与 main 的路由完全一致，其余新字段在旧版缺失时均按关闭处理，仅转发规则的收件人正则 / 删除原邮件选项在旧版不生效。邮件列表栏改为像素宽度（默认 360px、最小 280px，窗口变宽只加宽阅读区，拖动宽度持久化；`tm-prefs` 升到 v1 并丢弃旧的百分比值）。
- 2026-11-20：全站输入框去掉聚焦光圈和边框变色（`Input`、`Textarea`、`InputGroup`、后台标签输入框；按钮、开关、下拉等仍保留键盘聚焦提示）；OAuth2 类型卡片的图标、名称、单选框垂直居中。
- 2026-11-20：新增 `docs/UPSTREAM.md`，记录改造基线（上游 `a40a6b0`）与同步方法；线上后端已升级到 v1.15.0。同步上游 `665614b`、`50619c4`：创建邮箱的过期预设改为提交绝对时间 `expiresAt`（新版后端不再接受 `expiresIn`，基线版本也兼容），本地 Worker 实测到期时间正确。
- 2026-11-20：邮件页（收件箱、用户中心、后台所有邮件 / 无收件人邮件）默认不再自动打开第一封，阅读区显示「选择一封邮件」；`?mail_id=` 链接仍自动打开那封邮件（手机端返回后不再重新打开）。
- 2026-11-20：统计页日期选择弹层去掉 UTC 标签（页面说明里已注明按 UTC 日期统计）。
- 2026-11-20：部署改为只在推送 `v*` tag 时触发：新增 GitHub Actions `.github/workflows/deploy.yml`（构建 + `wrangler deploy --tag`，也可在 Actions 页手动运行；缺少配置时直接报错）。需在 Cloudflare 断开 Worker 的 Git 自动构建，并在 GitHub 仓库配置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`（secrets）和 `VITE_API_BASE`（variable）。README 部署方式 C 已更新。

## 下次继续（交接说明）

1. 阶段 0–6 全部完成。可选后续：清理 lint 警告（27 条，均为 warning）；迁移旧版偏好设置键（`useUTCDate` 等，旧版 `autoLoadRemoteImages` 默认开启、新版默认关闭）；用设置了站点密码 / 管理员密码的 Worker 实测密码弹框流程。
2. 本地联调环境：`cloudflare_temp_email/e2e` 下 `docker compose -p tmweb up -d --build worker mailpit`，再 `POST /admin/db_initialize`、`/admin/db_migration`；前端 `DEV_PROXY_TARGET=http://localhost:8787 pnpm dev`。冒烟脚本在仓库外（`/tmp/tm-smoke`），后台免密（e2e 配置 `DISABLE_ADMIN_PASSWORD_CHECK=true`）。
3. 规则：前端路由不能以后端前缀开头（后台在 `/console/*`，见 `docs/CONVENTIONS.md`）。
