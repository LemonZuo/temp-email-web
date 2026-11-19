# Temp Email Web — 重写计划

基于 `cloudflare_temp_email` 现有 Worker 后端接口（不改后端），用全新技术栈重写全部前端页面。

- **技术栈**：Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui（radix-nova 风格）
- **路由/状态/数据**：react-router 8 · zustand · @tanstack/react-query
- **其它**：sonner（提示）· lucide-react（图标）· postal-mime（邮件解析）· DOMPurify · Tiptap（富文本写信）· recharts（统计图）
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
| 2.1 | 登录 / 创建地址（凭证登录、地址密码登录、域名/子域名/过期时间、随机名）+ 落地页 | `common/Login.vue` | ✅（待联调） |
| 2.2 | 地址切换器（本地缓存地址 + 用户绑定地址）、本地地址管理 | `AddressSelect.vue`, `LocalAddress.vue` | ✅（待联调） |
| 2.3 | 收件箱三栏（搜索、自动刷新、已读/未读、多选删除/下载、`?mail_id=`） | `MailBox.vue` | ⏳ |
| 2.4 | 发件箱 | `SendBox.vue` | ⏳ |
| 2.5 | 写信 / 回复 / 转发、申请发信权限 | `index/SendMail.vue` | ⏳ |
| 2.6 | 地址设置（凭证、修改密码、清空收件箱/发件箱、删除地址） | `index/AccountSettings.vue` | ⏳ |
| 2.7 | 自动回复 | `index/AutoReply.vue` | ⏳ |
| 2.8 | S3 附件管理 | `index/Attachment.vue` | ⏳ |
| 2.9 | 外观偏好设置、关于页 | `common/Appearance.vue`, `About.vue` | ⏳ |

## 阶段 3：用户中心（子代理 A）

| # | 任务 | 对应旧页面 | 状态 |
|---|------|-----------|------|
| 3.1 | 登录 / 注册 / 邮箱验证码 / 找回密码 | `user/UserLogin.vue` | ⏳ |
| 3.2 | Passkey 登录与管理、OAuth2 登录与回调 | `UserLogin.vue`, `UserOauth2Callback.vue`, `UserSettings.vue` | ⏳ |
| 3.3 | 地址管理（绑定、解绑、转移、新建、切换） | `user/AddressManagement.vue`, `BindAddress.vue` | ⏳ |
| 3.4 | 用户收件箱 / 发件箱 / 写信 | `UserMailBox.vue`, `UserSendBox.vue`, `user/SendMail.vue` | ⏳ |
| 3.5 | 用户设置（账户信息、退出、Passkey 列表） | `user/UserSettings.vue` | ⏳ |

## 阶段 4：管理后台 · 账号与邮件（子代理 B）

| # | 任务 | 对应旧页面 | 状态 |
|---|------|-----------|------|
| 4.1 | 地址账号列表（搜索、查看凭证、重置密码、清空、删除、批量操作） | `admin/Account.vue` | ⏳ |
| 4.2 | 创建地址、批量创建、批量导出 | `CreateAccount.vue`, `BatchCreate.vue`, `BatchExportModal.vue` | ⏳ |
| 4.3 | 全部邮件 / 未知收件人邮件 / 发件箱 | `Mails.vue`, `MailsUnknow.vue`, `admin/SendBox.vue` | ⏳ |
| 4.4 | 管理员发信 | `admin/SendMail.vue` | ⏳ |
| 4.5 | 发信权限管理 | `SenderAccess.vue` | ⏳ |
| 4.6 | 统计概览 + 趋势图 | `Statistics.vue`, `StatisticsTrend.vue` | ⏳ |
| 4.7 | 用户管理、用户地址管理 | `UserManagement.vue`, `UserAddressManagement.vue` | ⏳ |

## 阶段 5：管理后台 · 设置类 + 其它（子代理 C1：5.1/5.2/5.4 中 AI 提取与 IP 黑名单/5.5；子代理 C2：5.3/5.4 中 Telegram/5.6/5.7）

| # | 任务 | 对应旧页面 | 状态 |
|---|------|-----------|------|
| 5.1 | 账号设置（黑名单、关键字等） | `admin/AccountSettings.vue` | ⏳ |
| 5.2 | 用户设置、OAuth2 设置、角色地址配置 | `UserSettings.vue`, `UserOauth2Settings.vue`, `RoleAddressConfig.vue` | ⏳ |
| 5.3 | Webhook 共享组件 + 地址 Webhook + 全局 Webhook + 邮件 Webhook | `WebhookComponent.vue`, `index/Webhook.vue`, `admin/Webhook.vue`, `MailWebhook.vue` | ⏳ |
| 5.4 | Telegram 设置、AI 提取设置、IP 黑名单 | `Telegram.vue`, `AiExtractSettings.vue`, `IpBlacklistSettings.vue` | ⏳ |
| 5.5 | Worker 配置、维护（清理）、数据库管理 | `WorkerConfig.vue`, `Maintenance.vue`, `DatabaseManager.vue` | ⏳ |
| 5.6 | 兑换码管理 + 兑换页 | `RedeemCodes.vue`, `Redeem.vue` | ⏳ |
| 5.7 | Telegram 小程序（地址管理、邮件查看） | `TelegramAddress.vue`, `telegram/Mail.vue` | ⏳ |

## 阶段 6：集成与验收（主线程负责）

| # | 任务 | 状态 |
|---|------|------|
| 6.1 | 合并各模块、统一导航与路由、类型检查 + 构建 | ⏳ |
| 6.2 | 本地起 Worker 联调，浏览器逐页冒烟测试（亮/暗色、桌面/移动端） | ⏳ |
| 6.3 | 代码审查（正确性、与旧接口契约一致性） | ⏳ |
| 6.4 | README：开发、构建、部署（Cloudflare Pages / 与 Worker 同域）说明 | ⏳ |

---

## 进度日志

- 2026-11-19：确定技术栈与范围；完成阶段 0、阶段 1（基础层全部）、阶段 2.1–2.2。按用户要求暂停，推送到 GitHub。

## 下次继续（交接说明）

1. **阶段 2.3–2.9**（主线程）：邮箱各页面目前是占位页 `src/features/mailbox/pages/*.tsx`，用已完成的 `MailWorkspace` / `SendboxWorkspace` / `ComposeForm` 组装即可。
2. **并行派 4 个子代理**：A 用户中心（`src/features/user/**`）、B 后台账号与邮件、C1 后台设置类、C2 Webhook/Telegram/兑换码（`src/features/{webhook,telegram,redeem}/**`）。各自只改自己目录下的占位页，不改共享组件、不装新依赖、不改 PLAN.md。
3. 关键约定（写给子代理的 brief 要包含）：
   - 文案：`defineMessages({ zh, en })` + `useT(messages)`，旧文案可从 `cloudflare_temp_email/frontend/src/i18n/message-registry.ts` 取。
   - 请求：`api.get/post/put/patch/delete`（`src/lib/api.ts`），列表分页用 `usePagedQuery`（后端只在 offset=0 时返回 count，limit ≤ 100）。
   - 页面骨架：`Page` / `PageHeader` / `Section`；确认框 `confirm()`；`CopyButton`、`DataPagination`、`EmptyState`、`Turnstile`、`PasswordInput`、`AddressCredentialDialog`。
   - 邮件：`MailWorkspace`、`SendboxWorkspace`、`ComposeForm`；地址：`CreateAddressForm`、`AddressLoginForm`、`switchAddress()`。
4. 待优化：主包 710KB（邮件解析被 layout 间接引入），阶段 6 拆包；lint 有若干 `set-state-in-effect` 警告。

