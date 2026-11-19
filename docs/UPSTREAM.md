# Upstream baseline / 上游基线

This frontend is a rewrite of the `frontend/` of
[dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email). The Worker
backend is used unchanged.

本仓库是对上游 `frontend/` 的重写，后端 Worker 直接沿用上游代码，未做修改。

## Baseline / 改造起点

| 项 | 值 |
|----|----|
| Upstream commit | [`a40a6b0`](https://github.com/dreamhunter2333/cloudflare_temp_email/commit/a40a6b0dd8edaacd69c8d8ac71e0d3796650fff9) `a40a6b0dd8edaacd69c8d8ac71e0d3796650fff9` |
| Commit title | `refactor: extract shared mail parser (#1251)` (2026-11-19) |
| Worker version | `v1.15.0` (`worker/src/constants.ts`) |
| DB schema | `v0.0.11` (latest patch `db/2026-11-18-address-expires-at.sql`) |
| Rewrite started | 2026-11-19 (first commit `bd1469c`) |

The API contract, storage keys and routes were taken from upstream at this commit (`frontend/src/` for UI behavior,
`worker/src/` for request/response shapes).

接口约定、浏览器存储键、路由都以这个提交为准：界面行为参考 `frontend/src/`，请求和返回结构参考 `worker/src/`。

## Synced upstream commits / 已同步的上游提交

Upstream commits after the baseline that were reviewed. Fill in a row for every later commit that touches
`frontend/`, `worker/src/` or `db/`.

基线之后已检查过的上游提交。后续凡是改到 `frontend/`、`worker/src/` 或 `db/` 的提交，都补一行。

| Upstream commit | Title | Impact on this repo / 对本仓库的影响 |
|-----------------|-------|------------------------------------|
| `665614b` | refactor: simplify shared address expiry handling (#1253) | `new_address` only accepts `expiresAt` (no `expiresIn`). Presets are now sent as an absolute ISO time (`src/lib/expiry.ts`), which also works with the baseline worker. |
| `50619c4` | refactor: extract address creation utilities (#1254) | Internal refactor, no API change. |

**Last synced / 最近同步到:** `50619c4` (2026-11-20)

## How to sync / 同步方法

```bash
cd ../cloudflare_temp_email
git fetch origin
# Commits since the last synced one that may affect the frontend
git log --oneline 50619c4..origin/main -- frontend/ worker/src/ db/
# API-level changes (request fields, responses, routes)
git diff 50619c4 origin/main -- worker/src | grep -E "^[+-].*(c\.req\.(json|query)|c\.json\(|\.(get|post|put|delete)\(')"
```

Port relevant changes, add rows to the table above and update "Last synced".

把需要的改动移植过来，在上表补记录，并更新"最近同步到"。

## Deployed backend / 线上后端

| Date | Worker version | Upstream commit |
|------|----------------|-----------------|
| 2026-11-20 | `v1.15.0` | `a40a6b0` (upgraded from `v1.13.0`) |
