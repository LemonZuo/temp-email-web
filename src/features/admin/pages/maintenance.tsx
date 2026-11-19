import { useId, useState } from 'react'
import { BrushCleaningIcon, DatabaseIcon, InfoIcon, PlusIcon, SquareTerminalIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupText } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Page, PageHeader, Section } from '@/components/common/page'
import { EmptyState } from '@/components/common/empty-state'
import { confirm } from '@/components/common/confirm'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { useApp } from '@/store/app'
import { defineMessages, useT, type TFunction } from '@/i18n'
import { NumberInput } from '../components/settings/number-input'
import { SaveBar, SaveButton } from '../components/settings/save-bar'
import { LoadError, SettingsSkeleton } from '../components/settings/settings-states'
import { useSettingsDraft } from '../components/settings/use-settings-draft'

const messages = defineMessages({
  zh: {
    title: '维护',
    description: '定时清理与立即清理邮件、地址数据。',
    cronTip: '启用定时清理, 需在 worker 配置 [crons] 参数, 请参考文档, 配置为 0 天表示全部清空',
    saveSuccess: '保存成功',
    basicCleanup: '基础清理',
    basicCleanupDesc: '开启“自动清理”后由定时任务按天数清理；“立即清理”使用当前填写的天数。',
    customSqlCleanup: '自定义 SQL 清理',
    customSqlTip: '添加自定义 DELETE SQL 语句进行定时清理。每条记录仅允许单条 DELETE 语句。',
    autoCleanup: '自动清理',
    cleanupNow: '立即清理',
    cleanupSuccess: '清理成功',
    cleanupConfirmTitle: '确定立即清理？',
    cleanupConfirmDays: '{label}（{days} 天）',
    days: '天',
    tip: '请输入天数',
    daysInvalid: '天数必须是 0 - 1000 的整数',
    mailBoxLabel: '清理 n 天前的收件箱',
    mailUnknowLabel: '清理 n 天前的无收件人邮件',
    sendBoxLabel: '清理 n 天前的发件箱',
    addressCreateLabel: '清理 n 天前创建的地址',
    inactiveAddressLabel: '清理 n 天前的未活跃地址',
    unboundAddressLabel: '清理 n 天前的未绑定用户地址',
    emptyAddressLabel: '清理 n 天前空邮件的邮箱地址',
    expiredAddressLabel: '清理已过期的邮箱地址',
    addCustomSql: '添加自定义 SQL',
    deleteCustomSql: '删除',
    sqlName: '名称',
    sqlNamePlaceholder: '例如: 清理旧日志',
    sqlStatement: 'SQL 语句 (仅限 DELETE)',
    sqlPlaceholder: "例如: DELETE FROM raw_mails WHERE source GLOB '*@example.com' AND created_at < datetime('now', '-3 day')",
    noCustomSql: '暂无自定义 SQL',
    unnamed: '未命名',
    SqlEmptyMsg: 'SQL 语句为空',
    SqlTooLongMsg: 'SQL 语句过长 (最大 1000 字符)',
    SqlOnlyDeleteMsg: '只允许 DELETE 语句',
    SqlSingleStatementMsg: '只允许单条 SQL 语句',
    SqlNoCommentsMsg: '不允许 SQL 注释',
  },
  en: {
    title: 'Maintenance',
    description: 'Scheduled and on-demand cleanup of mails and addresses.',
    cronTip:
      'Enable cron cleanup, need to configure [crons] in worker, please refer to the document, setting 0 days means clear all',
    saveSuccess: 'Save success',
    basicCleanup: 'Basic Cleanup',
    basicCleanupDesc: '"Auto cleanup" runs on the cron schedule; "Cleanup now" uses the days currently entered.',
    customSqlCleanup: 'Custom SQL Cleanup',
    customSqlTip: 'Add custom DELETE SQL statements for scheduled cleanup. Only single DELETE statement is allowed per entry.',
    autoCleanup: 'Auto cleanup',
    cleanupNow: 'Cleanup now',
    cleanupSuccess: 'Cleanup success',
    cleanupConfirmTitle: 'Clean up now?',
    cleanupConfirmDays: '{label} ({days} days)',
    days: 'days',
    tip: 'Please input the days',
    daysInvalid: 'Days must be an integer between 0 and 1000',
    mailBoxLabel: 'Cleanup the inbox before n days',
    mailUnknowLabel: 'Cleanup the unknow mail before n days',
    sendBoxLabel: 'Cleanup the sendbox before n days',
    addressCreateLabel: 'Cleanup the address created before n days',
    inactiveAddressLabel: 'Cleanup the inactive address before n days',
    unboundAddressLabel: 'Cleanup the unbound address before n days',
    emptyAddressLabel: 'Cleanup the empty address before n days',
    expiredAddressLabel: 'Cleanup expired addresses',
    addCustomSql: 'Add Custom SQL',
    deleteCustomSql: 'Delete',
    sqlName: 'Name',
    sqlNamePlaceholder: 'e.g. Clean old logs',
    sqlStatement: 'SQL Statement (DELETE only)',
    sqlPlaceholder: "e.g. DELETE FROM raw_mails WHERE source GLOB '*@example.com' AND created_at < datetime('now', '-3 day')",
    noCustomSql: 'No custom SQL yet',
    unnamed: 'unnamed',
    SqlEmptyMsg: 'SQL statement is empty',
    SqlTooLongMsg: 'SQL statement is too long (max 1000 characters)',
    SqlOnlyDeleteMsg: 'Only DELETE statements are allowed',
    SqlSingleStatementMsg: 'Only single SQL statement is allowed',
    SqlNoCommentsMsg: 'SQL comments are not allowed',
  },
})

type T = TFunction<Extract<keyof typeof messages.zh, string>>

type CustomSqlCleanup = { id: string; name: string; sql: string; enabled: boolean }

/** Mirrors `CleanupSettings` in the worker models. */
type CleanupSettings = {
  enableMailsAutoCleanup: boolean
  cleanMailsDays: number | null
  enableUnknowMailsAutoCleanup: boolean
  cleanUnknowMailsDays: number | null
  enableSendBoxAutoCleanup: boolean
  cleanSendBoxDays: number | null
  enableAddressAutoCleanup: boolean
  cleanAddressDays: number | null
  enableInactiveAddressAutoCleanup: boolean
  cleanInactiveAddressDays: number | null
  enableUnboundAddressAutoCleanup: boolean
  cleanUnboundAddressDays: number | null
  enableEmptyAddressAutoCleanup: boolean
  cleanEmptyAddressDays: number | null
  customSqlCleanupList: CustomSqlCleanup[]
}

type BoolKey = { [K in keyof CleanupSettings]: CleanupSettings[K] extends boolean ? K : never }[keyof CleanupSettings]
type DaysKey = { [K in keyof CleanupSettings]: CleanupSettings[K] extends number | null ? K : never }[keyof CleanupSettings]

const DEFAULTS: CleanupSettings = {
  enableMailsAutoCleanup: false,
  cleanMailsDays: 30,
  enableUnknowMailsAutoCleanup: false,
  cleanUnknowMailsDays: 30,
  enableSendBoxAutoCleanup: false,
  cleanSendBoxDays: 30,
  enableAddressAutoCleanup: false,
  cleanAddressDays: 30,
  enableInactiveAddressAutoCleanup: false,
  cleanInactiveAddressDays: 30,
  enableUnboundAddressAutoCleanup: false,
  cleanUnboundAddressDays: 30,
  enableEmptyAddressAutoCleanup: false,
  cleanEmptyAddressDays: 30,
  customSqlCleanupList: [],
}

const CLEANUP_ROWS: { type: string; label: Extract<keyof typeof messages.zh, string>; enable: BoolKey; days: DaysKey }[] = [
  { type: 'mails', label: 'mailBoxLabel', enable: 'enableMailsAutoCleanup', days: 'cleanMailsDays' },
  { type: 'mails_unknow', label: 'mailUnknowLabel', enable: 'enableUnknowMailsAutoCleanup', days: 'cleanUnknowMailsDays' },
  { type: 'sendbox', label: 'sendBoxLabel', enable: 'enableSendBoxAutoCleanup', days: 'cleanSendBoxDays' },
  { type: 'addressCreated', label: 'addressCreateLabel', enable: 'enableAddressAutoCleanup', days: 'cleanAddressDays' },
  {
    type: 'inactiveAddress',
    label: 'inactiveAddressLabel',
    enable: 'enableInactiveAddressAutoCleanup',
    days: 'cleanInactiveAddressDays',
  },
  {
    type: 'unboundAddress',
    label: 'unboundAddressLabel',
    enable: 'enableUnboundAddressAutoCleanup',
    days: 'cleanUnboundAddressDays',
  },
  { type: 'emptyAddress', label: 'emptyAddressLabel', enable: 'enableEmptyAddressAutoCleanup', days: 'cleanEmptyAddressDays' },
]

async function loadCleanupSettings(): Promise<CleanupSettings> {
  const res = await api.get<Partial<CleanupSettings> | null>('/admin/auto_cleanup')
  // Same as the old page: server values override defaults, extra keys are preserved.
  const merged = { ...DEFAULTS, ...(res ?? {}) } as CleanupSettings
  if (!Array.isArray(merged.customSqlCleanupList)) merged.customSqlCleanupList = []
  return merged
}

const isValidDays = (value: number | null) => value !== null && Number.isInteger(value) && value >= 0 && value <= 1000

type SqlError = 'SqlEmptyMsg' | 'SqlTooLongMsg' | 'SqlOnlyDeleteMsg' | 'SqlSingleStatementMsg' | 'SqlNoCommentsMsg'

/** Client-side copy of `validateCustomSql` in the worker cleanup API. */
const validateCustomSql = (sql: string): SqlError | null => {
  if (!sql || !sql.trim()) return 'SqlEmptyMsg'
  let normalized = sql.trim()
  if (normalized.endsWith(';')) normalized = normalized.slice(0, -1).trim()
  if (normalized.length > 1000) return 'SqlTooLongMsg'
  if (!normalized.toUpperCase().startsWith('DELETE ')) return 'SqlOnlyDeleteMsg'
  if (normalized.includes(';')) return 'SqlSingleStatementMsg'
  if (/--/.test(normalized) || /\/\*/.test(normalized)) return 'SqlNoCommentsMsg'
  return null
}

export default function MaintenancePage() {
  const t = useT(messages)
  const enableAddressExpiry = useApp((s) => s.openSettings.enableAddressExpiry)
  const settings = useSettingsDraft({ queryKey: ['admin', 'auto-cleanup'], queryFn: loadCleanupSettings })
  const { draft, update, dirty } = settings
  const [saving, setSaving] = useState(false)
  const [cleaning, setCleaning] = useState<string | null>(null)

  const save = async () => {
    if (!draft) return
    const invalidRow = CLEANUP_ROWS.find((row) => !isValidDays(draft[row.days]))
    if (invalidRow) {
      toast.error(`${t(invalidRow.label)}: ${t('daysInvalid')}`)
      return
    }
    for (const item of draft.customSqlCleanupList) {
      const error = item.sql ? validateCustomSql(item.sql) : null
      if (error) {
        toast.error(`[${item.name || t('unnamed')}]: ${t(error)}`)
        return
      }
    }
    setSaving(true)
    try {
      await api.post('/admin/auto_cleanup', draft)
      toast.success(t('saveSuccess'))
      await settings.refetch()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const cleanup = async (cleanType: string, label: string, cleanDays: number | null) => {
    if (cleanType !== 'expiredAddress' && !isValidDays(cleanDays)) {
      toast.error(t('daysInvalid'))
      return
    }
    const ok = await confirm({
      title: t('cleanupConfirmTitle'),
      description: (
        <>
          {cleanType === 'expiredAddress' ? label : t('cleanupConfirmDays', { label, days: cleanDays ?? 0 })}
          <br />
          {t('irreversible')}
        </>
      ),
      confirmText: t('cleanupNow'),
      destructive: true,
    })
    if (!ok) return
    setCleaning(cleanType)
    try {
      await api.post('/admin/cleanup', { cleanType, cleanDays })
      toast.success(t('cleanupSuccess'))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setCleaning(null)
    }
  }

  const updateSql = (index: number, patch: Partial<CustomSqlCleanup>) =>
    draft && update({ customSqlCleanupList: draft.customSqlCleanupList.map((item, i) => (i === index ? { ...item, ...patch } : item)) })

  const addSql = () =>
    draft &&
    update({
      customSqlCleanupList: [...draft.customSqlCleanupList, { id: Date.now().toString(), name: '', sql: '', enabled: false }],
    })

  const removeSql = (index: number) =>
    draft && update({ customSqlCleanupList: draft.customSqlCleanupList.filter((_, i) => i !== index) })

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={draft && <SaveButton dirty={dirty} saving={saving} onSave={save} />}
      />
      {!draft ? (
        settings.error ? (
          <LoadError error={settings.error} onRetry={() => settings.refetch()} />
        ) : (
          <SettingsSkeleton sections={1} rows={5} />
        )
      ) : (
        <>
          <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
            <TriangleAlertIcon />
            <AlertDescription className="text-current">{t('cronTip')}</AlertDescription>
          </Alert>

          <Tabs defaultValue="basic" className="gap-4">
            <TabsList>
              <TabsTrigger value="basic">
                <BrushCleaningIcon />
                {t('basicCleanup')}
              </TabsTrigger>
              <TabsTrigger value="custom_sql">
                <SquareTerminalIcon />
                {t('customSqlCleanup')}
                {draft.customSqlCleanupList.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 tabular-nums">
                    {draft.customSqlCleanupList.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Section title={t('basicCleanup')} description={t('basicCleanupDesc')} contentClassName="px-0">
                <div className="divide-y">
                  {CLEANUP_ROWS.map((row) => (
                    <CleanupRow
                      key={row.type}
                      t={t}
                      label={t(row.label)}
                      enabled={draft[row.enable]}
                      days={draft[row.days]}
                      cleaning={cleaning === row.type}
                      disabled={cleaning !== null}
                      onEnabledChange={(value) => update({ [row.enable]: value })}
                      onDaysChange={(value) => update({ [row.days]: value })}
                      onCleanup={() => cleanup(row.type, t(row.label), draft[row.days])}
                    />
                  ))}
                  {enableAddressExpiry && (
                    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium">{t('expiredAddressLabel')}</span>
                      <Button
                        variant="outline"
                        className="self-start sm:self-auto"
                        onClick={() => cleanup('expiredAddress', t('expiredAddressLabel'), 0)}
                        disabled={cleaning !== null}
                      >
                        {cleaning === 'expiredAddress' ? <Spinner /> : <BrushCleaningIcon />}
                        {t('cleanupNow')}
                      </Button>
                    </div>
                  )}
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="custom_sql" className="flex flex-col gap-4">
              <Alert>
                <InfoIcon />
                <AlertDescription>{t('customSqlTip')}</AlertDescription>
              </Alert>
              {draft.customSqlCleanupList.length === 0 ? (
                <div className="rounded-xl border border-dashed">
                  <EmptyState icon={<DatabaseIcon />} title={t('noCustomSql')} description={t('customSqlTip')}>
                    <Button variant="outline" onClick={addSql}>
                      <PlusIcon />
                      {t('addCustomSql')}
                    </Button>
                  </EmptyState>
                </div>
              ) : (
                <>
                  {draft.customSqlCleanupList.map((item, index) => (
                    <CustomSqlCard
                      key={item.id || index}
                      t={t}
                      item={item}
                      onChange={(patch) => updateSql(index, patch)}
                      onRemove={() => removeSql(index)}
                    />
                  ))}
                  <Button variant="outline" className="self-start" onClick={addSql}>
                    <PlusIcon />
                    {t('addCustomSql')}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>

          <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={settings.reset} />
        </>
      )}
    </Page>
  )
}

function CleanupRow({
  t,
  label,
  enabled,
  days,
  cleaning,
  disabled,
  onEnabledChange,
  onDaysChange,
  onCleanup,
}: {
  t: T
  label: string
  enabled: boolean
  days: number | null
  cleaning: boolean
  disabled: boolean
  onEnabledChange: (value: boolean) => void
  onDaysChange: (value: number | null) => void
  onCleanup: () => void
}) {
  const id = useId()
  const invalid = !isValidDays(days)
  return (
    <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{label}</span>
        {invalid && <FieldError className="text-xs">{t('daysInvalid')}</FieldError>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id={`${id}-auto`} checked={enabled} onCheckedChange={onEnabledChange} />
          <Label htmlFor={`${id}-auto`} className="font-normal whitespace-nowrap">
            {t('autoCleanup')}
          </Label>
        </div>
        <InputGroup className="w-28">
          <NumberInput
            data-slot="input-group-control"
            className="flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent"
            aria-label={`${label} (${t('days')})`}
            placeholder={t('tip')}
            min={0}
            max={1000}
            step={1}
            value={days}
            aria-invalid={invalid || undefined}
            onChange={onDaysChange}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{t('days')}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <Button variant="outline" onClick={onCleanup} disabled={disabled}>
          {cleaning ? <Spinner /> : <BrushCleaningIcon />}
          {t('cleanupNow')}
        </Button>
      </div>
    </div>
  )
}

function CustomSqlCard({
  t,
  item,
  onChange,
  onRemove,
}: {
  t: T
  item: CustomSqlCleanup
  onChange: (patch: Partial<CustomSqlCleanup>) => void
  onRemove: () => void
}) {
  const id = useId()
  const error = item.sql ? validateCustomSql(item.sql) : null
  return (
    <Section>
      <FieldGroup className="gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor={`${id}-name`}>{t('sqlName')}</FieldLabel>
            <Input
              id={`${id}-name`}
              placeholder={t('sqlNamePlaceholder')}
              value={item.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </Field>
          <div className="flex h-8 items-center gap-2">
            <Switch id={`${id}-auto`} checked={item.enabled} onCheckedChange={(enabled) => onChange({ enabled })} />
            <Label htmlFor={`${id}-auto`} className="font-normal whitespace-nowrap">
              {t('autoCleanup')}
            </Label>
          </div>
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2Icon />
            {t('deleteCustomSql')}
          </Button>
        </div>
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor={`${id}-sql`}>{t('sqlStatement')}</FieldLabel>
          <Textarea
            id={`${id}-sql`}
            rows={3}
            className="font-mono text-xs"
            placeholder={t('sqlPlaceholder')}
            value={item.sql}
            aria-invalid={!!error || undefined}
            onChange={(e) => onChange({ sql: e.target.value })}
          />
          {error && <FieldError>{t(error)}</FieldError>}
        </Field>
      </FieldGroup>
    </Section>
  )
}
