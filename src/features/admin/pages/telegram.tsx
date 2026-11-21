import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActivityIcon, BotIcon, RocketIcon, RotateCwIcon, SaveIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/common/empty-state'
import { Page, PageHeader, Section } from '@/components/common/page'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { defineMessages, useT } from '@/i18n'
import { TagListInput } from '../components/integrations/tag-list-input'

const messages = defineMessages({
  zh: {
    title: 'Telegram 机器人',
    description: '配置 Telegram Bot 的访问控制、全局邮件推送和电报小程序。',
    status: '查看状态',
    init: '初始化',
    statusErrorTip: '请检查 Worker 的 TELEGRAM_BOT_TOKEN 是否正确；Token 无误时可先点「初始化」。',
    initDesc: '将机器人 Webhook 指向当前 Worker 并注册命令。',
    successTip: '成功',
    enable: '启用',
    allowListTitle: '访问白名单',
    enableTelegramAllowList: '启用 Telegram 白名单',
    enableTelegramAllowListDesc: '只有白名单中的 Chat ID 可以使用机器人。',
    telegramAllowList: 'Telegram 白名单 Chat ID',
    globalPushTitle: '全局邮件推送',
    enableGlobalMailPush: '启用全局邮件推送',
    enableGlobalMailPushDesc: '所有邮箱收到的邮件都会推送给下列 Chat ID（通常是邮箱管理员）。',
    globalMailPushList: '全局邮件推送 Chat ID 列表',
    globalMailPushListTip:
      '支持对话/群组/频道的 Chat ID, 您可以发送一条消息给您的机器人，然后访问此链接来查看 chat_id, https://api.telegram.org/bot<这里替换成您的 BOT TOKEN>/getUpdates',
    manualInputPrompt: '输入后按回车键添加',
    miniAppTitle: '电报小程序',
    miniAppUrl: '电报小程序 URL',
    miniAppUrlDesc: '请输入你部署的电报小程序网页地址。',
    loadFailed: '无法加载 Telegram 设置',
    retry: '重试',
    statusTitle: '机器人状态',
    webhookUrl: 'Webhook 地址',
    notSet: '未设置',
    pendingUpdates: '待处理更新',
    maxConnections: '最大连接数',
    ipAddress: 'IP 地址',
    lastError: '最近错误',
    commands: '已注册命令',
    noCommands: '暂无命令',
    rawJson: '原始数据',
    healthy: '正常',
    hasError: '有错误',
  },
  en: {
    title: 'Telegram bot',
    description: 'Access control, global mail push and the Telegram mini app for your bot.',
    status: 'Check Status',
    init: 'Init',
    statusErrorTip: 'Check that TELEGRAM_BOT_TOKEN is set correctly on the worker; with a valid token, run Init first.',
    initDesc: 'Point the bot webhook to this worker and register the commands.',
    successTip: 'Success',
    enable: 'Enable',
    allowListTitle: 'Allow list',
    enableTelegramAllowList: 'Enable Telegram allow list',
    enableTelegramAllowListDesc: 'Only Chat IDs in the allow list can use the bot.',
    telegramAllowList: 'Telegram allow list (Chat ID)',
    globalPushTitle: 'Global mail push',
    enableGlobalMailPush: 'Enable global mail push',
    enableGlobalMailPushDesc: 'Every received email is pushed to the Chat IDs below (usually the mail admins).',
    globalMailPushList: 'Global Mail Push Chat ID List',
    globalMailPushListTip:
      'Support chat_id of private chat/group/channel. You can send a message to your bot, then visit this link to see chat_id, https://api.telegram.org/bot<Replace with your BOT TOKEN>/getUpdates',
    manualInputPrompt: 'Type and press Enter to add',
    miniAppTitle: 'Telegram mini app',
    miniAppUrl: 'Telegram Mini App URL',
    miniAppUrlDesc: 'The URL where you deployed the Telegram mini app.',
    loadFailed: 'Unable to load Telegram settings',
    retry: 'Retry',
    statusTitle: 'Bot status',
    webhookUrl: 'Webhook URL',
    notSet: 'Not set',
    pendingUpdates: 'Pending updates',
    maxConnections: 'Max connections',
    ipAddress: 'IP address',
    lastError: 'Last error',
    commands: 'Registered commands',
    noCommands: 'No commands',
    rawJson: 'Raw data',
    healthy: 'Healthy',
    hasError: 'Error',
  },
})

/** Worker `TelegramSettings` (`worker/src/telegram_api/settings.ts`). */
type TelegramSettings = {
  enableAllowList: boolean
  allowList: string[]
  miniAppUrl: string
  enableGlobalMailPush: boolean
  globalMailPushList: string[]
}

/** `GET /admin/telegram/status`: Telegram `getWebhookInfo` + `getMyCommands`. */
type TelegramStatus = {
  info?: {
    url?: string
    pending_update_count?: number
    max_connections?: number
    ip_address?: string
    last_error_date?: number
    last_error_message?: string
    [key: string]: unknown
  }
  commands?: { command: string; description: string }[]
}

const QUERY_KEY = ['admin', 'telegram-settings']

const normalize = (res: Partial<TelegramSettings> | null): TelegramSettings => ({
  enableAllowList: !!res?.enableAllowList,
  allowList: Array.isArray(res?.allowList) ? res.allowList.map(String) : [],
  miniAppUrl: res?.miniAppUrl || '',
  enableGlobalMailPush: !!res?.enableGlobalMailPush,
  globalMailPushList: Array.isArray(res?.globalMailPushList) ? res.globalMailPushList.map(String) : [],
})

/** `/console/telegram` — bot init/status and `/admin/telegram/settings`. */
export default function TelegramPage() {
  const t = useT(messages)
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => normalize(await api.get<Partial<TelegramSettings>>('/admin/telegram/settings')),
  })
  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(false)

  const fetchStatus = async () => {
    setStatusLoading(true)
    try {
      setStatus(await api.get<TelegramStatus>('/admin/telegram/status'))
    } catch (error) {
      // Telegram's own error (e.g. "Error 404: Not Found" for a bad token) means little on its own
      toast.error(errorMessage(error), { description: t('statusErrorTip') })
    } finally {
      setStatusLoading(false)
    }
  }

  const init = async () => {
    setInitLoading(true)
    try {
      await api.post('/admin/telegram/init')
      toast.success(t('successTip'))
      if (status) await fetchStatus()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setInitLoading(false)
    }
  }

  const botActions = (
    <>
      <Button variant="outline" onClick={fetchStatus} disabled={statusLoading}>
        {statusLoading ? <Spinner /> : <ActivityIcon />}
        {t('status')}
      </Button>
      <Button variant="outline" onClick={init} disabled={initLoading} title={t('initDesc')}>
        {initLoading ? <Spinner /> : <RocketIcon />}
        {t('init')}
      </Button>
    </>
  )

  return (
    <Page>
      {query.isLoading ? (
        <>
          <PageHeader title={t('title')} description={t('description')} />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </>
      ) : query.isError || !query.data ? (
        <>
          <PageHeader title={t('title')} description={t('description')} actions={botActions} />
          {status && <StatusSection status={status} onRefresh={fetchStatus} refreshing={statusLoading} />}
          <EmptyState
            icon={<BotIcon />}
            title={t('loadFailed')}
            description={errorMessage(query.error)}
            className="rounded-xl border border-dashed"
          >
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Spinner /> : <RotateCwIcon />}
              {t('retry')}
            </Button>
          </EmptyState>
        </>
      ) : (
        <TelegramSettingsForm initial={query.data} botActions={botActions}>
          {status && <StatusSection status={status} onRefresh={fetchStatus} refreshing={statusLoading} />}
        </TelegramSettingsForm>
      )}
    </Page>
  )
}

function TelegramSettingsForm({
  initial,
  botActions,
  children,
}: {
  initial: TelegramSettings
  botActions: React.ReactNode
  children?: React.ReactNode
}) {
  const t = useT(messages)
  const [settings, setSettings] = useState(initial)
  const [saving, setSaving] = useState(false)
  const update = (patch: Partial<TelegramSettings>) => setSettings((s) => ({ ...s, ...patch }))

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/admin/telegram/settings', settings)
      queryClient.setQueryData(QUERY_KEY, settings)
      toast.success(t('saved'))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            {botActions}
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner /> : <SaveIcon />}
              {t('save')}
            </Button>
          </>
        }
      />

      {children}

      <Section title={t('allowListTitle')}>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="tg-allow-enabled">{t('enableTelegramAllowList')}</FieldLabel>
              <FieldDescription>{t('enableTelegramAllowListDesc')}</FieldDescription>
            </FieldContent>
            <Switch
              id="tg-allow-enabled"
              checked={settings.enableAllowList}
              onCheckedChange={(enableAllowList) => update({ enableAllowList })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tg-allow-list">{t('telegramAllowList')}</FieldLabel>
            <TagListInput
              id="tg-allow-list"
              value={settings.allowList}
              onChange={(allowList) => update({ allowList })}
              placeholder={t('manualInputPrompt')}
            />
          </Field>
        </FieldGroup>
      </Section>

      <Section title={t('globalPushTitle')}>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="tg-push-enabled">{t('enableGlobalMailPush')}</FieldLabel>
              <FieldDescription>{t('enableGlobalMailPushDesc')}</FieldDescription>
            </FieldContent>
            <Switch
              id="tg-push-enabled"
              checked={settings.enableGlobalMailPush}
              onCheckedChange={(enableGlobalMailPush) => update({ enableGlobalMailPush })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tg-push-list">{t('globalMailPushList')}</FieldLabel>
            <TagListInput
              id="tg-push-list"
              value={settings.globalMailPushList}
              onChange={(globalMailPushList) => update({ globalMailPushList })}
              placeholder={t('manualInputPrompt')}
            />
            <FieldDescription className="break-all">{t('globalMailPushListTip')}</FieldDescription>
          </Field>
        </FieldGroup>
      </Section>

      <Section title={t('miniAppTitle')}>
        <Field>
          <FieldLabel htmlFor="tg-mini-app-url">{t('miniAppUrl')}</FieldLabel>
          <Input
            id="tg-mini-app-url"
            type="url"
            inputMode="url"
            placeholder="https://mail.example.com"
            value={settings.miniAppUrl}
            onChange={(e) => update({ miniAppUrl: e.target.value })}
          />
          <FieldDescription>{t('miniAppUrlDesc')}</FieldDescription>
        </Field>
      </Section>
    </>
  )
}

function StatusSection({ status, onRefresh, refreshing }: { status: TelegramStatus; onRefresh: () => void; refreshing: boolean }) {
  const t = useT(messages)
  const info = status.info || {}
  const commands = status.commands || []
  const lastErrorAt = typeof info.last_error_date === 'number' ? new Date(info.last_error_date * 1000).toLocaleString() : ''
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: t('webhookUrl'),
      value: info.url ? <span className="font-mono break-all">{info.url}</span> : <span className="text-muted-foreground">{t('notSet')}</span>,
    },
    { label: t('pendingUpdates'), value: <span className="tabular-nums">{info.pending_update_count ?? 0}</span> },
  ]
  if (info.max_connections !== undefined) {
    rows.push({ label: t('maxConnections'), value: <span className="tabular-nums">{info.max_connections}</span> })
  }
  if (info.ip_address) rows.push({ label: t('ipAddress'), value: <span className="font-mono">{info.ip_address}</span> })

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          {t('statusTitle')}
          {info.last_error_message ? (
            <Badge variant="destructive">{t('hasError')}</Badge>
          ) : info.url ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{t('healthy')}</Badge>
          ) : null}
        </span>
      }
      actions={
        <Button variant="ghost" size="icon-sm" onClick={onRefresh} disabled={refreshing} aria-label={t('refresh')}>
          {refreshing ? <Spinner /> : <RotateCwIcon />}
        </Button>
      }
    >
      <div className="grid gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {rows.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0">{value}</dd>
            </div>
          ))}
        </dl>
        {info.last_error_message && (
          <Alert variant="destructive">
            <AlertTitle>
              {t('lastError')}
              {lastErrorAt && <span className="ml-2 font-normal opacity-80">{lastErrorAt}</span>}
            </AlertTitle>
            <AlertDescription className="break-all">{info.last_error_message}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-2">
          <div className="text-sm font-medium">{t('commands')}</div>
          {commands.length ? (
            <div className="overflow-hidden rounded-lg border">
              {commands.map((cmd) => (
                <div key={cmd.command} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b px-3 py-2 text-sm last:border-b-0">
                  <code className="font-mono text-primary">/{cmd.command}</code>
                  <span className="text-muted-foreground">{cmd.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noCommands')}</p>
          )}
        </div>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="link" size="sm" className="h-auto px-0">
              {t('rawJson')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
              {JSON.stringify(status, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Section>
  )
}
