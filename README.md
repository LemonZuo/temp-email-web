# Temp Email Web

[English](./README.en.md)

[cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 的全新前端，直接对接现有的后端接口，后端无需改动。

- **邮箱**：三栏收件箱、发件箱、写信（纯文本 / HTML / 富文本）、附件、自动回复、Webhook
- **用户中心**：密码 / OAuth2 / 通行密钥登录，管理绑定的邮箱
- **管理后台**（`/console`）：统计、地址、邮件、用户与角色、各项设置、数据库维护
- **其他**：兑换码、Telegram 小程序、中英文、明暗主题、移动端适配

技术栈：Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · react-router · zustand · TanStack Query

## 本地开发

需要 Node 22 和 pnpm 11（执行 `corepack enable` 即可使用）。

```bash
pnpm install
DEV_PROXY_TARGET=http://127.0.0.1:8787 pnpm dev   # 把接口请求代理到本地后端
```

没有本地后端的话，可以用上游仓库的 e2e 环境启动一个：

```bash
cd ../cloudflare_temp_email/e2e
docker compose -p tmweb up -d --build worker mailpit
curl -X POST http://localhost:8787/admin/db_initialize
curl -X POST http://localhost:8787/admin/db_migration
```

提交前检查：`npx tsc -p tsconfig.app.json --noEmit` 和 `pnpm lint`。

## 构建与配置

```bash
pnpm build            # 输出到 dist/
pnpm build:telegram   # Telegram 小程序版本
```

| 构建变量 | 说明 |
|---|---|
| `VITE_API_BASE` | 后端 Worker 地址；留空表示与前端同源 |
| `VITE_DEFAULT_LANG` | 默认语言，`zh` 或 `en` |

站点标题、邮箱域名、公告、功能开关等都由后端的 `/open_api/settings` 下发，和旧前端一致。

## 部署

部署为 Cloudflare Pages 项目。接口请求通过 Pages Functions 和服务绑定转发给后端 Worker，与页面同源，不需要配置后端地址。

有两种部署方式，步骤见[部署文档](./docs/DEPLOYMENT.md)：

- **GitHub Actions**（当前使用）：fork 每周同步后自动部署，也可以手动运行或打标签发布
- **Cloudflare Pages 关联仓库**：每次推送到 `main` 自动构建上线

## 文档

- [部署](./docs/DEPLOYMENT.md)
- [上游基线与同步记录](./docs/UPSTREAM.md)：基于上游 `a40a6b0`（后端 v1.15.0）重写
- [开发约定](./docs/CONVENTIONS.md)
- [计划与变更记录](./PLAN.md)
