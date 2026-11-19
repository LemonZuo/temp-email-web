import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheckIcon, DatabaseIcon, DatabaseZapIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Page, PageHeader, Section } from '@/components/common/page'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { defineMessages, useT } from '@/i18n'
import { LoadError } from '../components/settings/settings-states'

const messages = defineMessages({
  zh: {
    title: '数据库',
    description: '数据库初始化、Schema 升级与 D1 存储容量。',
    schemaSection: '数据库版本',
    schemaSectionDesc: '当前数据库 Schema 与代码所需版本的对比。',
    current_db_version: '当前数据库版本',
    code_db_version: '需要的数据库版本',
    unknown: '未知',
    upToDate: '已是最新',
    needInit: '需要初始化',
    needMigration: '需要迁移',
    init: '初始化数据库',
    initializationSuccess: '数据库初始化成功',
    migration: '升级数据库 Schema',
    migrationSuccess: '数据库升级成功',
    need_initialization_tip: '需要初始化数据库，请初始化数据库',
    need_migration_tip: '需要迁移数据库，请迁移数据库',
    storage_title: 'D1 存储容量',
    storage_description: '将当前数据库大小与套餐容量上限进行对比',
    storage_tip: '使用率按当前数据库大小与所选套餐的数据库容量上限计算。',
    storage_usage: '容量使用率',
    current_database_size: '当前数据库大小',
    single_database_limit: '数据库容量上限',
    plan: 'Workers 套餐',
    plan_placeholder: '请选择 Cloudflare Workers 套餐',
    planSaved: 'Workers 套餐已保存',
    free_plan: 'Free',
    paid_plan: 'Workers Paid',
    unavailable: '暂不可用',
    selectPlanHint: '选择套餐后显示容量使用率。',
  },
  en: {
    title: 'Database',
    description: 'Database initialization, schema migration and D1 storage capacity.',
    schemaSection: 'Database version',
    schemaSectionDesc: 'Current database schema compared with the version required by the code.',
    current_db_version: 'Current DB Version',
    code_db_version: 'Code Needed DB Version',
    unknown: 'unknown',
    upToDate: 'Up to date',
    needInit: 'Needs initialization',
    needMigration: 'Needs migration',
    init: 'Initialize Database',
    initializationSuccess: 'Database initialized successfully',
    migration: 'Migrate Database',
    migrationSuccess: 'Database migrated successfully',
    need_initialization_tip: 'Database initialization is required. Please initialize the database.',
    need_migration_tip: 'Database migration is required. Please migrate the database.',
    storage_title: 'D1 Storage Capacity',
    storage_description: 'Compare the current database size with your plan limits.',
    storage_tip: 'Usage is calculated from the current database size and the selected plan limit.',
    storage_usage: 'Capacity Usage',
    current_database_size: 'Current Database Size',
    single_database_limit: 'Database Capacity Limit',
    plan: 'Workers Plan',
    plan_placeholder: 'Select your Cloudflare Workers plan',
    planSaved: 'Workers plan saved',
    free_plan: 'Free',
    paid_plan: 'Workers Paid',
    unavailable: 'Unavailable',
    selectPlanHint: 'Select a plan to see capacity usage.',
  },
})

const D1_STORAGE_PLAN_CONFIG_KEY = 'd1_storage_plan'

type Plan = 'free' | 'paid'

const PLAN_LIMITS: Record<Plan, number> = {
  free: 500 * 1024 ** 2,
  paid: 10 * 1024 ** 3,
}

const isPlan = (value: unknown): value is Plan => value === 'free' || value === 'paid'

type DbVersion = {
  need_initialization: boolean
  need_migration: boolean | null
  current_db_version: string | null
  code_db_version: string
  database_size: number | null
}

type DbStatus = DbVersion & { plan: Plan | null }

async function loadDbStatus(): Promise<DbStatus> {
  const [version, config] = await Promise.all([
    api.get<Partial<DbVersion> | null>('/admin/db_version'),
    api.get<{ key: string; value: string | null } | null>(`/admin/config/${D1_STORAGE_PLAN_CONFIG_KEY}`),
  ])
  return {
    need_initialization: !!version?.need_initialization,
    need_migration: !!version?.need_migration,
    current_db_version: version?.current_db_version ?? null,
    code_db_version: version?.code_db_version ?? '',
    database_size: typeof version?.database_size === 'number' ? version.database_size : null,
    plan: isPlan(config?.value) ? config.value : null,
  }
}

export default function DatabasePage() {
  const t = useT(messages)
  const queryClient = useQueryClient()
  const queryKey = ['admin', 'database']
  const query = useQuery({ queryKey, queryFn: loadDbStatus })
  const [action, setAction] = useState<'init' | 'migrate' | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)

  const formatBytes = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined) return t('unavailable')
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / 1024 ** unitIndex
    return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`
  }

  const run = async (kind: 'init' | 'migrate') => {
    setAction(kind)
    try {
      await api.post(kind === 'init' ? '/admin/db_initialize' : '/admin/db_migration')
      await query.refetch()
      toast.success(kind === 'init' ? t('initializationSuccess') : t('migrationSuccess'))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setAction(null)
    }
  }

  const savePlan = async (plan: Plan) => {
    const previous = query.data
    if (!previous) return
    queryClient.setQueryData<DbStatus>(queryKey, { ...previous, plan })
    setSavingPlan(true)
    try {
      await api.post('/admin/config', { key: D1_STORAGE_PLAN_CONFIG_KEY, value: plan })
      toast.success(t('planSaved'))
    } catch (error) {
      queryClient.setQueryData<DbStatus>(queryKey, (current) => (current ? { ...current, plan: previous.plan } : current))
      toast.error(errorMessage(error))
    } finally {
      setSavingPlan(false)
    }
  }

  const data = query.data
  const limit = data?.plan ? PLAN_LIMITS[data.plan] : null
  const percentage = data && limit && data.database_size !== null ? (data.database_size / limit) * 100 : 0
  const level = percentage >= 90 ? 'error' : percentage >= 75 ? 'warning' : 'success'

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? <Spinner /> : <RefreshCwIcon />}
            {t('refresh')}
          </Button>
        }
      />
      {!data ? (
        query.error ? (
          <LoadError error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <>
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </>
        )
      ) : (
        <>
          {data.need_initialization && (
            <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
              <TriangleAlertIcon />
              <AlertTitle>{t('need_initialization_tip')}</AlertTitle>
              <AlertDescription className="mt-2">
                <Button onClick={() => run('init')} disabled={action !== null}>
                  {action === 'init' ? <Spinner /> : <DatabaseIcon />}
                  {t('init')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {data.need_migration && (
            <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
              <TriangleAlertIcon />
              <AlertTitle>{t('need_migration_tip')}</AlertTitle>
              <AlertDescription className="mt-2">
                <Button onClick={() => run('migrate')} disabled={action !== null}>
                  {action === 'migrate' ? <Spinner /> : <DatabaseZapIcon />}
                  {t('migration')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Section
            title={t('schemaSection')}
            description={t('schemaSectionDesc')}
            actions={
              data.need_initialization ? (
                <Badge variant="destructive">{t('needInit')}</Badge>
              ) : data.need_migration ? (
                <Badge variant="destructive">{t('needMigration')}</Badge>
              ) : (
                <Badge variant="secondary">
                  <CircleCheckIcon className="text-emerald-600 dark:text-emerald-400" />
                  {t('upToDate')}
                </Badge>
              )
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={t('current_db_version')} value={data.current_db_version || t('unknown')} mono />
              <Stat label={t('code_db_version')} value={data.code_db_version || '—'} mono />
            </div>
          </Section>

          <Section
            title={t('storage_title')}
            description={t('storage_description')}
            footer={<p className="mr-auto text-xs text-muted-foreground">{t('storage_tip')}</p>}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium">{t('plan')}</span>
                <Select
                  value={data.plan ?? undefined}
                  onValueChange={(value) => isPlan(value) && savePlan(value)}
                  disabled={data.need_initialization || savingPlan}
                >
                  <SelectTrigger className="w-full sm:w-60" aria-label={t('plan')}>
                    {savingPlan && <Spinner />}
                    <SelectValue placeholder={t('plan_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">{t('free_plan')}</SelectItem>
                    <SelectItem value="paid">{t('paid_plan')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label={t('current_database_size')} value={formatBytes(data.database_size)} />
                <Stat label={t('single_database_limit')} value={limit ? formatBytes(limit) : '—'} />
              </div>
              {limit ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('storage_usage')}</span>
                    <span
                      className={cn(
                        'font-medium tabular-nums',
                        level === 'error' && 'text-destructive',
                        level === 'warning' && 'text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {percentage.toFixed(2)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(percentage, 100)}
                    className={cn(
                      'h-2',
                      level === 'error' && '*:data-[slot=progress-indicator]:bg-destructive',
                      level === 'warning' && '*:data-[slot=progress-indicator]:bg-amber-500',
                      level === 'success' && '*:data-[slot=progress-indicator]:bg-emerald-500',
                    )}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('selectPlanHint')}</p>
              )}
            </div>
          </Section>
        </>
      )}
    </Page>
  )
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-lg font-semibold tracking-tight', mono && 'font-mono text-base')}>{value}</span>
    </div>
  )
}
