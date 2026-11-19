import { useState } from 'react'
import { ShieldQuestionIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Page, PageHeader, Section } from '@/components/common/page'
import { EmptyState } from '@/components/common/empty-state'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import type { UserRole } from '@/store/app'
import { defineMessages, useT } from '@/i18n'
import { NumberInput } from '../components/settings/number-input'
import { SaveBar, SaveButton } from '../components/settings/save-bar'
import { LoadError, SettingsSkeleton } from '../components/settings/settings-states'
import { useSettingsDraft } from '../components/settings/use-settings-draft'

const messages = defineMessages({
  zh: {
    title: '角色地址配置',
    roleConfigDesc: '为每个用户角色配置最大地址数量。角色配置优先于全局设置。设置为 0 表示不限制。',
    successTip: '成功',
    role: '角色',
    domains: '可用域名',
    prefix: '前缀',
    allDomains: '默认',
    maxAddressCount: '最大地址数量（0 为不限制）',
    notConfigured: '未配置（使用全局设置）',
    clear: '清除',
    noRolesAvailable: '系统配置中没有可用的角色',
    noRolesAvailableDesc: '请先在 Worker 环境变量 USER_ROLES 中配置角色。',
    rolesSection: '角色',
    rolesSectionDesc: '角色来自 Worker 环境变量 USER_ROLES。',
    invalidCount: '最大地址数量必须是 0 - 999 的整数',
  },
  en: {
    title: 'Role addresses',
    roleConfigDesc:
      'Configure maximum address count for each user role. Role-based limits take priority over global settings. Set 0 for unlimited.',
    successTip: 'Success',
    role: 'Role',
    domains: 'Domains',
    prefix: 'Prefix',
    allDomains: 'Default',
    maxAddressCount: 'Max Address Count (0 = Unlimited)',
    notConfigured: 'Not Configured (Use Global Settings)',
    clear: 'Clear',
    noRolesAvailable: 'No roles available in system config',
    noRolesAvailableDesc: 'Configure roles in the USER_ROLES worker variable first.',
    rolesSection: 'Roles',
    rolesSectionDesc: 'Roles come from the USER_ROLES worker variable.',
    invalidCount: 'Max address count must be an integer between 0 and 999',
  },
})

type RoleRow = {
  role: string
  domains: string[]
  prefix: string
  maxAddressCount: number | null
}

type RoleConfigs = Record<string, { maxAddressCount?: number } | undefined>

async function loadRoleRows(): Promise<RoleRow[]> {
  const [roles, config] = await Promise.all([
    api.get<UserRole[] | null>('/admin/user_roles'),
    api.get<{ configs?: RoleConfigs } | null>('/admin/role_address_config'),
  ])
  const configs = config?.configs ?? {}
  return (Array.isArray(roles) ? roles : []).map((role) => ({
    role: role.role,
    domains: Array.isArray(role.domains) ? role.domains : [],
    prefix: role.prefix ?? '',
    maxAddressCount: configs[role.role]?.maxAddressCount ?? null,
  }))
}

const isValidCount = (value: number | null) => value === null || (Number.isInteger(value) && value >= 0 && value <= 999)

export default function RoleAddressConfigPage() {
  const t = useT(messages)
  const settings = useSettingsDraft({ queryKey: ['admin', 'role-address-config'], queryFn: loadRoleRows })
  const { draft, setDraft, dirty } = settings
  const [saving, setSaving] = useState(false)

  const setCount = (role: string, maxAddressCount: number | null) =>
    setDraft((rows) => rows?.map((row) => (row.role === role ? { ...row, maxAddressCount } : row)))

  const save = async () => {
    if (!draft) return
    if (draft.some((row) => !isValidCount(row.maxAddressCount))) {
      toast.error(t('invalidCount'))
      return
    }
    const configs: Record<string, { maxAddressCount: number }> = {}
    for (const row of draft) {
      if (row.maxAddressCount !== null && row.maxAddressCount !== undefined) configs[row.role] = { maxAddressCount: row.maxAddressCount }
    }
    setSaving(true)
    try {
      await api.post('/admin/role_address_config', { configs })
      toast.success(t('successTip'))
      await settings.refetch()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('roleConfigDesc')}
        actions={draft && draft.length > 0 && <SaveButton dirty={dirty} saving={saving} onSave={save} />}
      />
      {!draft ? (
        settings.error ? (
          <LoadError error={settings.error} onRetry={() => settings.refetch()} />
        ) : (
          <SettingsSkeleton sections={1} />
        )
      ) : draft.length === 0 ? (
        <Section>
          <EmptyState
            icon={<ShieldQuestionIcon />}
            title={t('noRolesAvailable')}
            description={t('noRolesAvailableDesc')}
          />
        </Section>
      ) : (
        <>
          <Section title={t('rolesSection')} description={t('rolesSectionDesc')}>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">{t('role')}</TableHead>
                    <TableHead>{t('domains')}</TableHead>
                    <TableHead className="w-64">{t('maxAddressCount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.map((row) => {
                    const invalid = !isValidCount(row.maxAddressCount)
                    return (
                      <TableRow key={row.role}>
                        <TableCell className="align-top">
                          <Badge variant="secondary" className="font-mono">
                            {row.role}
                          </Badge>
                          {row.prefix && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {t('prefix')}: <span className="font-mono">{row.prefix}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top whitespace-normal">
                          {row.domains.length > 0 ? (
                            <div className="flex max-w-md flex-wrap gap-1">
                              {row.domains.map((domain) => (
                                <Badge key={domain} variant="outline" className="font-normal">
                                  {domain}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t('allDomains')}</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex min-w-52 items-center gap-1">
                            <NumberInput
                              aria-label={`${row.role} ${t('maxAddressCount')}`}
                              min={0}
                              max={999}
                              step={1}
                              placeholder={t('notConfigured')}
                              value={row.maxAddressCount}
                              aria-invalid={invalid || undefined}
                              onChange={(value) => setCount(row.role, value)}
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('clear')}
                              disabled={row.maxAddressCount === null}
                              onClick={() => setCount(row.role, null)}
                            >
                              <XIcon />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Section>
          <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={settings.reset} />
        </>
      )}
    </Page>
  )
}
