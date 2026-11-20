# Development conventions

How pages in this repo are built. Read this before porting a page from the old Vue frontend
(`/opt/data/webstrom_data/cloudflare_temp_email/frontend`). The backend (Worker) is unchanged —
its source is in `/opt/data/webstrom_data/cloudflare_temp_email/worker/src` and is the source of truth for
request/response shapes.

## Stack

Vite 8 · React 19 · TypeScript (strict) · Tailwind v4 · shadcn/ui (`radix-nova` style, Radix primitives,
`asChild` supported) · react-router 8 (`react-router` package) · zustand · TanStack Query v5 · sonner · lucide-react v1
(**no brand icons** like Github — inline an SVG if needed).

## Layout

```
src/
  lib/            api client, parsing, formatting, helpers
  store/          zustand stores (app settings, auth tokens, prefs, compose draft)
  i18n/           useT / defineMessages, common strings
  hooks/          usePagedQuery, useIsMobile
  components/
    ui/           shadcn components (do not edit)
    common/       Page, Section, confirm, CopyButton, DataPagination, Turnstile ...
    layout/       AppShell, sidebar, header controls
    mail/         MailWorkspace, SendboxWorkspace, MailReader, MailHtml ...
    compose/      ComposeForm, RichEditor
  features/
    mailbox/      `/` mailbox module (layout, landing, address forms, pages)
    user/         `/user` user center
    admin/        `/admin` admin console (layout + pages/*)
    webhook/      shared webhook settings UI
    telegram/     Telegram mini app
    redeem/       `/redeem`
```

Routes are already declared in `src/router.tsx`; every page is a file with a **default export**.
Navigation lives in each module's `layout.tsx`.

**Frontend routes must never start with a backend prefix** (`/api/`, `/open_api/`, `/user_api/`, `/admin/`,
`/telegram/`, `/external/`, `/redeem_api/`): the Pages middleware and the Worker forward those to the API, so a deep
link would break on reload. The admin console therefore lives at `/console/*` (`/admin` redirects there) — build its
links with `adminPath('accounts')` from `@/features/admin/paths`, never a literal `/admin/...`.

## i18n

Translations live next to the component. Every `useT()` falls back to `src/i18n/common.ts`
(ok, cancel, save, delete, edit, create, refresh, search, copy, copied, success, actions, enabled, disabled,
noData, total, createdAt, address, password, email, name, areYouSure, irreversible, logout, login ...).

```tsx
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: { title: '地址列表', count: '共 {n} 个地址' },
  en: { title: 'Addresses', count: '{n} addresses' },
})

export default function AccountsPage() {
  const t = useT(messages)
  return <h1>{t('title')} · {t('count', { n: 3 })}</h1>
}
```

Old translations (zh + en) for every Vue component are in
`cloudflare_temp_email/frontend/src/i18n/message-registry.ts` under keys like `"views.admin.Account"`.
Reuse their wording; keep only `zh` and `en`.

## API

```ts
import { api, type ListResponse } from '@/lib/api'

await api.get<T>('/admin/address?limit=20&offset=0')
await api.post<T>('/admin/new_address', { name, domain })   // objects are JSON-encoded
await api.put / api.patch / api.delete(path, body?)
```

- Auth headers (address JWT, user token, admin password, site password, access token, lang, fingerprint) are
  attached automatically. 401 admin/site codes open the password dialogs automatically.
- Errors throw `ApiError` (`message`, `status`). Show them with `toast.error(errorMessage(error))`
  (`errorMessage` from `@/lib/format`). Success: `toast.success(t('success'))`.
- Passwords are always sent SHA-256 hashed: `hashPassword` from `@/lib/crypto`.
- Prefer TanStack Query for reads (`useQuery`), plain `async` handlers + local `loading` state for writes.
  Query keys start with the module: `['admin', 'accounts', filters]`, `['user', ...]`, `['mailbox', address, ...]`.

### Paginated lists

The worker only returns `count` when `offset == 0` (later pages return `count: 0`) and rejects `limit > 100`.
Always use the hook, which remembers the total:

```tsx
const paged = usePagedQuery<Row>({
  queryKey: ['admin', 'accounts', { query }],          // filters in the key → resets to page 1
  fetchPage: (limit, offset) =>
    api.get<ListResponse<Row>>(`/admin/address?limit=${limit}&offset=${offset}&query=${encodeURIComponent(query)}`),
  initialPageSize: 20,
})
// paged.items, paged.total, paged.page, paged.setPage, paged.pageSize, paged.setPageSize,
// paged.isLoading, paged.isFetching, paged.refetch()

<DataPagination page={paged.page} pageSize={paged.pageSize} total={paged.total}
  onPageChange={paged.setPage} onPageSizeChange={paged.setPageSize} />
```

## Global state

```ts
useApp((s) => s.openSettings)     // /open_api/settings (domains, feature flags, cfTurnstileSiteKey ...)
useApp((s) => s.userSettings)     // /user_api/settings (user_email, user_id, is_admin, user_role, access_token)
useApp((s) => s.addressSettings)  // /api/settings for the current mailbox (address, send_balance)
useFlags()                        // { showUserSystem, showUserMailboxes, showAdminPage }
useAuth()                         // jwt, userJwt, adminAuth, siteAuth + setters
usePrefs()                        // user preferences (useUTCDate, autoLoadRemoteImages ...)
useTheme()                        // { theme, resolvedTheme, setTheme } from '@/lib/theme' (no next-themes)
```

Helpers: `loadAddressSettings()`, `loadUserSettings()`, `bindAddressToUser()` (`@/lib/api`),
`switchAddress(jwt)` / `leaveAddress()` (`@/lib/session`), `formatDateTime(utc)` / `formatShortDate(utc)`
(`@/lib/format`, backend timestamps are UTC without zone), `decodeAddressToken(jwt)` (`@/lib/address-token`).

## Building blocks

| Need | Use |
|------|-----|
| Page wrapper (scrolls) | `Page` (`wide` for tables), `PageHeader title description actions` from `@/components/common/page` |
| Settings card | `Section title description actions footer` (same file) |
| Form layout | `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldSet`, `FieldLegend` (`@/components/ui/field`), `Field orientation="horizontal"` for switches |
| Inputs | `Input`, `Textarea`, `Select*`, `Switch`, `Checkbox`, `RadioGroup`, `InputGroup*`, `PasswordInput` (common) |
| Tables | `Table*` (`@/components/ui/table`) inside `<div className="overflow-x-auto rounded-xl border">` |
| Confirm destructive action | `if (await confirm({ title, description, destructive: true })) ...` (`@/components/common/confirm`) |
| Copy | `<CopyButton value={text} label? />` |
| Empty list | `<EmptyState icon={<InboxIcon />} title description />` |
| Loading | `Skeleton`, `Spinner` (`@/components/ui/spinner`) |
| Status | `Badge` (`variant`: default / secondary / outline / destructive) |
| Dialogs | `Dialog*`, `Sheet*`, `AlertDialog*`, `DropdownMenu*`, `Popover*`, `Tooltip*`, `Tabs*` |
| Charts | `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` (`@/components/ui/chart`) + recharts; colors `var(--chart-1..5)` |
| Turnstile | `<Turnstile ref={ref} onToken={setCfToken} />`; `ref.current?.refresh()` after a failed request. Renders nothing without a site key |
| Address credential | `AddressCredentialDialog open onOpenChange address jwt addressPassword?` (`@/components/common/address-credential-dialog`) |
| Inbox UI | `MailWorkspace queryKey fetchMails deleteMail? markRead? onReply? onForward? saveToS3? showRecipient? listHeader?` (`@/components/mail/mail-workspace`). Fills its parent; render it directly as the page body (no `Page`) |
| Sent UI | `SendboxWorkspace queryKey fetchMails deleteMail? showSender? listHeader?` |
| Compose | `ComposeForm fromAddress? fromSlot? onSend(payload) onSent? notice?` (`@/components/compose/compose-form`). Payload: `{ from_name, to_name, to_mail, subject, is_html, content }`. Draft is shared via `useCompose` |
| Create / log in to address | `CreateAddressForm newAddress? onCreated? enableExpiry?`, `AddressLoginForm onSuccess?` (`@/features/mailbox/components/address-forms`) |

Buttons: `variant` = default / outline / secondary / ghost / destructive / link; `size` = xs / sm / default / lg /
icon / icon-xs / icon-sm / icon-lg. Icons go first inside the button: `<Button><PlusIcon />{t('add')}</Button>`.

## Design rules

- Gmail/Outlook-like, calm and dense. Use semantic tokens (`bg-muted`, `text-muted-foreground`, `border`,
  `bg-primary/10 text-primary`, `text-destructive`) — never hard-coded colors (except the few status hues).
- Page = `Page` → `PageHeader` (title, short description, primary actions on the right) → `Section` cards / table.
- Tables: toolbar row above (search input with `SearchIcon` in an `InputGroup`, filters, refresh), row actions in a
  `DropdownMenu` (`EllipsisIcon` trigger) when there are more than two, pagination below.
- Every destructive action asks `confirm(...)`. Every request shows a toast on error; writes show success toasts.
- Must work on mobile (≥ 360px): wrap toolbars (`flex-wrap`), tables scroll horizontally, dialogs `sm:max-w-*`.
  Grid layouts holding untrusted wide content (mail bodies) need `grid-cols-[minmax(0,1fr)]`, or the column grows to
  the content and clips the page. Fields are forced to 16px below `md` (`index.css`, avoids iOS zoom on focus); the
  main toolbar buttons use `max-md:size-9`.
- Long JSON / config editors: `Textarea` with `font-mono text-xs`; validate with `JSON.parse` before saving and show
  the parse error inline (this is the only place a local try/catch around parsing is wanted).
- Keep components typed; no `any` unless mirroring an untyped backend blob (then use `unknown` + narrow, or a local type).

## Checks

```bash
npx tsc -p tsconfig.app.json --noEmit   # must report no errors in your files
pnpm lint                               # oxlint; fix errors, warnings in your files where reasonable
```
