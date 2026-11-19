import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon, MinusIcon, RefreshCwIcon, SearchIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Page, PageHeader, Section } from '@/components/common/page'
import { CopyButton } from '@/components/common/copy-button'
import { EmptyState } from '@/components/common/empty-state'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { defineMessages, useT } from '@/i18n'
import { LoadError } from '../components/settings/settings-states'

const messages = defineMessages({
  zh: {
    title: 'Worker 配置',
    description: 'Worker 当前生效的环境变量（只读，敏感值仅显示是否已配置）。',
    listView: '列表',
    jsonView: 'JSON',
    filter: '筛选配置项',
    clearFilter: '清除筛选',
    noMatch: '没有匹配的配置项',
    notSet: '未设置',
    empty: '空',
    copyJson: '复制 JSON',
    general: '基础',
    address: '地址',
    domains: '域名',
    users: '用户',
    mail: '邮件',
    features: '功能',
    other: '其他',
    keys: '{n} 项',
  },
  en: {
    title: 'Worker config',
    description: 'Effective worker environment variables (read-only; secrets only show whether they are set).',
    listView: 'List',
    jsonView: 'JSON',
    filter: 'Filter keys',
    clearFilter: 'Clear filter',
    noMatch: 'No matching keys',
    notSet: 'Not set',
    empty: 'Empty',
    copyJson: 'Copy JSON',
    general: 'General',
    address: 'Address',
    domains: 'Domains',
    users: 'Users',
    mail: 'Mail',
    features: 'Features',
    other: 'Other',
    keys: '{n} keys',
  },
})

type GroupKey = 'general' | 'address' | 'domains' | 'users' | 'mail' | 'features' | 'other'

/** Display grouping for the keys returned by `/admin/worker/configs`; unknown keys go to "other". */
const GROUPS: { key: Exclude<GroupKey, 'other'>; keys: string[] }[] = [
  {
    key: 'general',
    keys: [
      'VERSION',
      'DEFAULT_LANG',
      'TITLE',
      'ANNOUNCEMENT',
      'ALWAYS_SHOW_ANNOUNCEMENT',
      'ADMIN_CONTACT',
      'COPYRIGHT',
      'HAS_PASSWORD',
      'HAS_ADMIN_PASSWORDS',
      'HAS_JWT_SECRET',
      'DISABLE_ADMIN_PASSWORD_CHECK',
      'DISABLE_SHOW_GITHUB',
      'DISABLE_SHOW_GITHUB_FOR_USER',
    ],
  },
  {
    key: 'address',
    keys: ['PREFIX', 'ADDRESS_CHECK_REGEX', 'ADDRESS_REGEX', 'MIN_ADDRESS_LEN', 'MAX_ADDRESS_LEN', 'ENABLE_ADDRESS_EXPIRY'],
  },
  {
    key: 'domains',
    keys: [
      'DEFAULT_DOMAINS',
      'DOMAINS',
      'DOMAIN_LABELS',
      'ENABLE_CREATE_ADDRESS_SUBDOMAIN_MATCH',
      'RANDOM_SUBDOMAIN_DOMAINS',
      'RANDOM_SUBDOMAIN_LENGTH',
    ],
  },
  {
    key: 'users',
    keys: [
      'DISABLE_USER_SYSTEM',
      'ENABLE_USER_CREATE_EMAIL',
      'DISABLE_ANONYMOUS_USER_CREATE_EMAIL',
      'ENABLE_USER_DELETE_EMAIL',
      'ADMIN_USER_ROLE',
      'USER_DEFAULT_ROLE',
      'USER_ROLES',
      'NO_LIMIT_SEND_ROLE',
    ],
  },
  {
    key: 'mail',
    keys: [
      'FORWARD_ADDRESS_LIST',
      'SUBDOMAIN_FORWARD_ADDRESS_LIST',
      'ENABLE_MAIL_READ_STATUS',
      'ENABLE_CHECK_JUNK_MAIL',
      'JUNK_MAIL_CHECK_LIST',
      'JUNK_MAIL_FORCE_PASS_LIST',
      'REMOVE_EXCEED_SIZE_ATTACHMENT',
      'REMOVE_ALL_ATTACHMENT',
      'S3_ENABLED',
    ],
  },
  {
    key: 'features',
    keys: [
      'ENABLE_AUTO_REPLY',
      'ENABLE_WEBHOOK',
      'ENABLE_REDEEM_CODE',
      'REDEEM_CODE_URL',
      'ENABLE_ANOTHER_WORKER',
      'ANOTHER_WORKER_LIST',
    ],
  },
]

const KNOWN_KEYS = new Set(GROUPS.flatMap((g) => g.keys))

export default function WorkerConfigPage() {
  const t = useT(messages)
  const query = useQuery({
    queryKey: ['admin', 'worker-config'],
    queryFn: () => api.get<Record<string, unknown> | null>('/admin/worker/configs'),
  })
  const [filter, setFilter] = useState('')

  const config = useMemo(() => query.data ?? {}, [query.data])
  const json = useMemo(() => JSON.stringify(config, null, 2), [config])

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const match = (key: string) => {
      if (!needle) return true
      if (key.toLowerCase().includes(needle)) return true
      const value = config[key]
      return typeof value === 'string' && value.toLowerCase().includes(needle)
    }
    const present = (keys: string[]) => keys.filter((key) => key in config && match(key))
    const result: { key: GroupKey; keys: string[] }[] = GROUPS.map((g) => ({ key: g.key, keys: present(g.keys) }))
    result.push({ key: 'other', keys: Object.keys(config).filter((key) => !KNOWN_KEYS.has(key) && match(key)) })
    return result.filter((g) => g.keys.length > 0)
  }, [config, filter])

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            {query.data && <CopyButton value={json} label={t('copyJson')} variant="outline" size="default" />}
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Spinner /> : <RefreshCwIcon />}
              {t('refresh')}
            </Button>
          </>
        }
      />
      {query.data === undefined ? (
        query.error ? (
          <LoadError error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        )
      ) : (
        <Tabs defaultValue="list" className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="list">{t('listView')}</TabsTrigger>
              <TabsTrigger value="json">{t('jsonView')}</TabsTrigger>
            </TabsList>
            <span className="text-xs text-muted-foreground">{t('keys', { n: Object.keys(config).length })}</span>
          </div>

          <TabsContent value="list" className="flex flex-col gap-4">
            <InputGroup className="sm:max-w-sm">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput placeholder={t('filter')} value={filter} onChange={(e) => setFilter(e.target.value)} />
              {filter && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-xs" aria-label={t('clearFilter')} onClick={() => setFilter('')}>
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            {groups.length === 0 ? (
              <EmptyState icon={<SearchIcon />} title={t('noMatch')} />
            ) : (
              groups.map((group) => (
                <Section key={group.key} title={t(group.key)} contentClassName="px-0">
                  <dl className="divide-y">
                    {group.keys.map((key) => (
                      <div
                        key={key}
                        className="grid gap-1 px-4 py-2.5 sm:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] sm:gap-4"
                      >
                        <dt className="min-w-0 font-mono text-xs leading-6 break-all text-muted-foreground">{key}</dt>
                        <dd className="min-w-0">
                          <ConfigValue value={config[key]} t={t} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              ))
            )}
          </TabsContent>

          <TabsContent value="json">
            <div className="relative rounded-xl border bg-muted/30">
              <div className="absolute top-2 right-2">
                <CopyButton value={json} />
              </div>
              <pre className="max-h-[70vh] overflow-auto p-4 pr-12 font-mono text-xs leading-relaxed">{json}</pre>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </Page>
  )
}

function ConfigValue({ value, t }: { value: unknown; t: (key: 'notSet' | 'empty') => string }) {
  if (value === undefined || value === null || value === '') {
    return (
      <span className="inline-flex items-center gap-1 text-sm leading-6 text-muted-foreground">
        <MinusIcon className="size-3.5" />
        {t('notSet')}
      </span>
    )
  }
  if (typeof value === 'boolean') {
    return (
      <Badge variant={value ? 'default' : 'outline'} className={cn('font-mono', !value && 'text-muted-foreground')}>
        {value ? <CheckIcon /> : <XIcon />}
        {String(value)}
      </Badge>
    )
  }
  if (typeof value === 'number') return <span className="font-mono text-sm leading-6 tabular-nums">{value}</span>
  if (typeof value === 'string') return <span className="text-sm leading-6 break-all whitespace-pre-wrap">{value}</span>
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-sm leading-6 text-muted-foreground">{t('empty')} []</span>
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return (
        <div className="flex flex-wrap gap-1 py-0.5">
          {value.map((v, i) => (
            <Badge key={`${v}-${i}`} variant="secondary" className="h-auto font-mono font-normal break-all whitespace-normal">
              {String(v)}
            </Badge>
          ))}
        </div>
      )
    }
  }
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
