import { useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ActivityIcon,
  CalendarRangeIcon,
  ChevronDownIcon,
  InboxIcon,
  MailIcon,
  RefreshCwIcon,
  SendIcon,
  UserCheckIcon,
  UsersIcon,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Page, PageHeader } from '@/components/common/page'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { defineMessages, useLocale, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '统计',
    description: '收发邮件、邮箱与用户的总量和每日趋势（按 UTC 日期统计）。',
    dateRange: '时间范围',
    days7: '近 7 天',
    days30: '近 30 天',
    today: '今天',
    rangeLimit: '单次最多查看 30 天，请缩小日期范围。',
    rangeHelp: '最多 30 天',
    applyRange: '应用',
    received: '接收邮件数',
    newAddresses: '邮箱创建数',
    sent: '发送邮件数',
    newUsers: '用户注册数',
    chartLabel: '{title}：{count}',
    loadError: '统计加载失败，请刷新重试。',
    activeAddressCount7days: '7 天活跃邮箱',
    activeAddressCount30days: '30 天活跃邮箱',
    activeUserCount7days: '7 天活跃用户',
    activeUserCount30days: '30 天活跃用户',
    addressCount: '邮箱总数',
    mailCount: '邮件总数',
    sendMailCount: '发件总数',
    userCount: '用户总数',
    totals: '总览',
    trends: '趋势',
    inRange: '所选范围合计',
    trendsUnsupported: '当前 Worker 版本不支持趋势统计，升级到 v1.14.0 及以上后可查看。',
  },
  en: {
    title: 'Statistics',
    description: 'Totals and daily trends of mail, mailboxes and users (by UTC day).',
    dateRange: 'Time range',
    days7: 'Last 7 days',
    days30: 'Last 30 days',
    today: 'Today',
    rangeLimit: 'Select a range of up to 30 days.',
    rangeHelp: 'Up to 30 days',
    applyRange: 'Apply',
    received: 'Incoming mail',
    newAddresses: 'Mailboxes created',
    sent: 'Outgoing mail',
    newUsers: 'User registrations',
    chartLabel: '{title}: {count}',
    loadError: 'Could not load statistics. Try refreshing.',
    activeAddressCount7days: 'Active mailboxes (7 days)',
    activeAddressCount30days: 'Active mailboxes (30 days)',
    activeUserCount7days: 'Active users (7 days)',
    activeUserCount30days: 'Active users (30 days)',
    addressCount: 'Total mailboxes',
    mailCount: 'Total mail',
    sendMailCount: 'Total sent',
    userCount: 'Total users',
    totals: 'Totals',
    trends: 'Trends',
    inRange: 'Total in range',
    trendsUnsupported: 'This worker version does not provide trends. Upgrade it to v1.14.0 or later to see them.',
  },
})

const DAY = 86_400_000

type TrendMetric = 'mailCount' | 'addressCount' | 'userCount' | 'sendMailCount'
type TotalMetric =
  | TrendMetric
  | 'activeAddressCount7days'
  | 'activeAddressCount30days'
  | 'activeUserCount7days'
  | 'activeUserCount30days'
type Totals = Partial<Record<TotalMetric, number>>
type Trends = Record<TrendMetric, { day: string; count: number }[]>
/** Workers before v1.14.0 ignore the query and return the totals object itself. */
type StatisticsResponse = { totals?: Totals; trends: Trends } | Totals
type DailyPoint = { day: string } & Record<TrendMetric, number>

const TOTAL_METRICS: { key: TotalMetric; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'mailCount', icon: InboxIcon },
  { key: 'addressCount', icon: MailIcon },
  { key: 'userCount', icon: UsersIcon },
  { key: 'sendMailCount', icon: SendIcon },
  { key: 'activeAddressCount7days', icon: ActivityIcon },
  { key: 'activeAddressCount30days', icon: ActivityIcon },
  { key: 'activeUserCount7days', icon: UserCheckIcon },
  { key: 'activeUserCount30days', icon: UserCheckIcon },
]

const PANELS: { metric: TrendMetric; title: 'received' | 'sent' | 'newUsers' | 'newAddresses'; color: string }[] = [
  { metric: 'mailCount', title: 'received', color: 'var(--chart-1)' },
  { metric: 'sendMailCount', title: 'sent', color: 'var(--chart-2)' },
  { metric: 'userCount', title: 'newUsers', color: 'var(--chart-3)' },
  { metric: 'addressCount', title: 'newAddresses', color: 'var(--chart-4)' },
]

const PRESETS = [
  { days: 1, label: 'today' },
  { days: 7, label: 'days7' },
  { days: 30, label: 'days30' },
] as const

// All dates are UTC days formatted as `YYYY-MM-DD`
const utcDay = () => new Date().toISOString().slice(0, 10)
const addDays = (day: string, days: number) => new Date(Date.parse(day) + days * DAY).toISOString().slice(0, 10)
const presetRange = (days: number, today = utcDay()): [string, string] => [addDays(today, -(days - 1)), today]
const validRange = (from: string, to: string) => Date.parse(to) - Date.parse(from) < 30 * DAY && from <= to
/** Calendar works with local dates; map UTC day strings to local midnight and back. */
const dayToLocal = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const localToDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function buildDaily(trends: Trends, from: string, endDay: string): DailyPoint[] {
  const counts = (Object.keys(trends) as TrendMetric[]).map(
    (key) => [key, new Map((trends[key] || []).map((row) => [row.day, row.count]))] as const,
  )
  const start = Date.parse(from)
  const length = Math.round((Date.parse(endDay) - start) / DAY)
  return Array.from({ length }, (_, i) => {
    const day = new Date(start + i * DAY).toISOString().slice(0, 10)
    const point = { day, mailCount: 0, addressCount: 0, userCount: 0, sendMailCount: 0 } as DailyPoint
    for (const [key, values] of counts) point[key] = values.get(day) ?? 0
    return point
  })
}

function RangePicker({
  range,
  preset,
  disabled,
  onPreset,
  onApply,
}: {
  range: [string, string]
  preset: number | null
  disabled?: boolean
  onPreset: (days: number) => void
  onApply: (range: [string, string]) => void
}) {
  const t = useT(messages)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const draftFrom = draft?.from ? localToDay(draft.from) : ''
  const draftTo = draft?.to ? localToDay(draft.to) : draftFrom
  const draftError = draftFrom && draftTo && !validRange(draftFrom, draftTo) ? t('rangeLimit') : ''
  const activePreset = PRESETS.find((p) => p.days === preset)
  const label = activePreset ? t(activePreset.label) : `${range[0]} – ${range[1]}`

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft({ from: dayToLocal(range[0]), to: dayToLocal(range[1]) })
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled} aria-label={t('dateRange')} title={`${range[0]} – ${range[1]} (UTC)`}>
          <CalendarRangeIcon />
          {label}
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-24px)] p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          {PRESETS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={preset === p.days ? 'secondary' : 'ghost'}
              onClick={() => {
                onPreset(p.days)
                setOpen(false)
              }}
            >
              {t(p.label)}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={draft}
          onSelect={setDraft}
          defaultMonth={dayToLocal(range[1])}
          disabled={{ after: dayToLocal(utcDay()) }}
        />
        <div className="flex items-center justify-between gap-3 border-t p-3">
          <span className={cn('text-xs', draftError ? 'text-destructive' : 'text-muted-foreground')}>
            {draftError || t('rangeHelp')}
          </span>
          <Button
            size="sm"
            disabled={!draftFrom || !!draftError}
            onClick={() => {
              onApply([draftFrom, draftTo])
              setOpen(false)
            }}
          >
            {t('applyRange')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TrendPanel({
  metric,
  title,
  color,
  points,
  format,
}: {
  metric: TrendMetric
  title: string
  color: string
  points: DailyPoint[]
  format: (n: number) => string
}) {
  const t = useT(messages)
  const total = points.reduce((n, p) => n + p[metric], 0)
  const config = { [metric]: { label: title, color } } satisfies ChartConfig
  return (
    <Card className="min-w-0 gap-3">
      <CardHeader className="gap-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{format(total)}</span>
          <span className="text-xs text-muted-foreground">{t('inRange')}</span>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ChartContainer
          config={config}
          className="aspect-auto h-52 w-full"
          role="img"
          aria-label={t('chartLabel', { title, count: format(total) })}
        >
          <AreaChart data={points} syncId="admin-statistics" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={0.25} />
                <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(day: string) => day.slice(5).replace('-', '/')}
            />
            <YAxis
              width={40}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickCount={4}
              tickFormatter={(v: number) => format(v)}
            />
            <ChartTooltip cursor={{ strokeDasharray: '4 4' }} content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey={metric}
              type="monotone"
              stroke={`var(--color-${metric})`}
              strokeWidth={2}
              fill={`url(#fill-${metric})`}
              dot={points.length === 1 ? { r: 4 } : false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/** `/console` — totals + daily trends from `/admin/statistics`. */
export default function StatisticsPage() {
  const t = useT(messages)
  const locale = useLocale()
  const [range, setRange] = useState<[string, string]>(() => presetRange(7))
  const [preset, setPreset] = useState<number | null>(7)
  const [version, setVersion] = useState(0)
  const totalsRef = useRef<Totals | null>(null)
  const totalsVersion = useRef(-1)

  const numberFormat = useMemo(() => new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US'), [locale])
  const format = (n: number) => numberFormat.format(n)

  const [from, to] = range
  const query = useQuery({
    queryKey: ['admin', 'statistics', { from, to, version }],
    queryFn: async () => {
      // Totals are only recomputed on first load and on manual refresh
      const includeTotals = !totalsRef.current || totalsVersion.current !== version
      const endDay = addDays(to, 1)
      const params = new URLSearchParams({ from: `${from} 00:00:00`, to: `${endDay} 00:00:00`, granularity: 'day' })
      if (includeTotals) params.set('includeTotals', 'true')
      const res = await api.get<StatisticsResponse>(`/admin/statistics?${params}`)
      const data = 'trends' in res && res.trends ? res : { totals: res as Totals, trends: null }
      if (data.totals) {
        totalsRef.current = data.totals
        totalsVersion.current = version
      }
      return {
        daily: data.trends ? buildDaily(data.trends, from, endDay) : null,
        totals: data.totals ?? totalsRef.current,
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  const totals = query.data?.totals
  const daily = query.data?.daily
  const trendsUnsupported = query.data?.daily === null
  const loading = query.isFetching

  const selectPreset = (days: number) => {
    setPreset(days)
    setRange(presetRange(days))
  }

  const refresh = () => {
    // A preset keeps following "today" (UTC)
    if (preset) setRange(presetRange(preset))
    setVersion((v) => v + 1)
  }

  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <RangePicker
              range={range}
              preset={preset}
              disabled={loading || trendsUnsupported}
              onPreset={selectPreset}
              onApply={(next) => {
                if (next[0] === from && next[1] === to) return
                setPreset(null)
                setRange(next)
              }}
            />
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCwIcon className={cn(loading && 'animate-spin')} />
              {t('refresh')}
            </Button>
          </>
        }
      />

      {query.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(query.error) || t('loadError')}</AlertDescription>
        </Alert>
      )}

      <section aria-label={t('totals')} className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {TOTAL_METRICS.map(({ key, icon: Icon }) => {
          const value = totals?.[key]
          return (
            <Card key={key} className="gap-0 py-4">
              <CardContent className="grid gap-2 px-4">
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{t(key)}</span>
                  <Icon className="size-4 shrink-0" />
                </div>
                {value != null ? (
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">{format(value)}</span>
                ) : query.isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <span className="text-2xl font-semibold text-muted-foreground">—</span>
                )}
              </CardContent>
            </Card>
          )
        })}
      </section>

      <Separator />

      {trendsUnsupported && (
        <Alert>
          <AlertDescription>{t('trendsUnsupported')}</AlertDescription>
        </Alert>
      )}

      <section aria-label={t('trends')} className="grid gap-4 md:grid-cols-2">
        {query.isLoading
          ? PANELS.map((p) => <Skeleton key={p.metric} className="h-[322px] rounded-xl" />)
          : daily && daily.length > 0
            ? PANELS.map((p) => (
                <TrendPanel key={p.metric} metric={p.metric} title={t(p.title)} color={p.color} points={daily} format={format} />
              ))
            : null}
      </section>
    </Page>
  )
}
