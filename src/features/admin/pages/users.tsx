import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  EllipsisIcon,
  KeyRoundIcon,
  MailIcon,
  RefreshCwIcon,
  ShieldIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { confirm } from '@/components/common/confirm'
import { DataPagination } from '@/components/common/data-pagination'
import { Page, PageHeader } from '@/components/common/page'
import { PasswordInput } from '@/components/common/password-input'
import { usePagedQuery } from '@/hooks/use-paged-query'
import { api, type ListResponse } from '@/lib/api'
import { hashPassword } from '@/lib/crypto'
import { errorMessage, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApp, type UserRole } from '@/store/app'
import { CountBadge, TableEmptyRow, TableLoadingRows } from '@/features/admin/components/core/data-table'
import { PasswordDialog } from '@/features/admin/components/core/password-dialog'
import { SearchForm } from '@/features/admin/components/core/search-form'
import { UserAddressesDialog, type AdminUserRef } from '@/features/admin/components/core/user-addresses-dialog'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '用户管理',
    description: '管理注册用户、角色与其绑定的邮箱地址。',
    queryTip: '按用户邮箱搜索',
    user_email: '用户邮箱',
    role: '角色',
    address_count: '邮箱数量',
    createUser: '创建用户',
    email: '用户邮箱',
    password: '密码',
    pleaseInput: '请输入完整信息',
    resetPassword: '重置密码',
    deleteUser: '删除用户',
    deleteUserTip: '确定要删除此用户吗？',
    deleteUserDesc: '将删除用户 {email} 及其地址绑定关系（邮箱地址本身不会被删除）。',
    changeRole: '更改角色',
    noRole: '无角色（默认）',
    roleDonotExist: '当前角色不存在',
    prefix: '前缀',
    domains: '域名',
    userAddressManagement: '邮箱管理',
    emptyTitle: '没有用户',
    emptyQuery: '没有匹配 “{query}” 的用户',
    emptyDesc: '注册或由管理员创建的用户会显示在这里',
    noRolesConfigured: '未配置 USER_ROLES，只能清除角色。',
  },
  en: {
    title: 'User management',
    description: 'Manage registered users, their roles and bound mailbox addresses.',
    queryTip: 'Search by user email',
    user_email: 'User Email',
    role: 'Role',
    address_count: 'Mailbox Count',
    createUser: 'Create User',
    email: 'Account Email',
    password: 'Password',
    pleaseInput: 'Please input complete information',
    resetPassword: 'Reset Password',
    deleteUser: 'Delete User',
    deleteUserTip: 'Are you sure you want to delete this user?',
    deleteUserDesc: 'User {email} and its address bindings will be deleted (the addresses themselves are kept).',
    changeRole: 'Change Role',
    noRole: 'No role (default)',
    roleDonotExist: 'Current Role does not exist',
    prefix: 'Prefix',
    domains: 'Domains',
    userAddressManagement: 'Mailbox Management',
    emptyTitle: 'No users',
    emptyQuery: 'No user matches “{query}”',
    emptyDesc: 'Registered users and users created by the admin show up here',
    noRolesConfigured: 'USER_ROLES is not configured; the role can only be cleared.',
  },
})

type UserRow = {
  id: number
  user_email: string
  role_text?: string | null
  address_count: number
  created_at: string
  updated_at?: string
}

const COLUMNS = 6
const NO_ROLE = '__none__'

function CreateUserDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const t = useT(messages)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error(t('pleaseInput'))
    setLoading(true)
    try {
      await api.post('/admin/users', { email, password: await hashPassword(password) })
      toast.success(t('success'))
      setEmail('')
      setPassword('')
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('createUser')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="admin-user-email">{t('email')}</FieldLabel>
              <Input
                id="admin-user-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-password">{t('password')}</FieldLabel>
              <PasswordInput
                id="admin-user-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : <UserPlusIcon />}
              {t('createUser')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChangeRoleDialog({
  user,
  roles,
  onOpenChange,
  onSaved,
}: {
  user: UserRow | null
  roles: UserRole[]
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const t = useT(messages)
  const openSettings = useApp((s) => s.openSettings)
  const [role, setRole] = useState('')
  const [lastUser, setLastUser] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset on every open; forgetting the user on close drops a cancelled role pick
  if (!user && lastUser) setLastUser(null)
  if (user && user !== lastUser) {
    setLastUser(user)
    setRole(user.role_text || '')
  }

  const roleConfig = roles.find((r) => r.role === role)
  const roleMissing = !!role && !roleConfig
  const prefix = roleConfig?.prefix ?? openSettings.prefix
  const domains = roleConfig?.domains?.length ? roleConfig.domains : openSettings.defaultDomains

  const save = async () => {
    if (!user) return
    setLoading(true)
    try {
      await api.post('/admin/user_roles', { user_id: user.id, role_text: role })
      toast.success(t('success'))
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('changeRole')}</DialogTitle>
          <DialogDescription className="break-all">{user?.user_email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {roleMissing && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{t('roleDonotExist')}</AlertDescription>
            </Alert>
          )}
          <Field>
            <FieldLabel htmlFor="admin-user-role">{t('role')}</FieldLabel>
            <Select value={role || NO_ROLE} onValueChange={(v) => setRole(v === NO_ROLE ? '' : v)}>
              <SelectTrigger id="admin-user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ROLE}>{t('noRole')}</SelectItem>
                {roleMissing && <SelectItem value={role}>{role}</SelectItem>}
                {roles.map((r) => (
                  <SelectItem key={r.role} value={r.role}>
                    {r.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {roles.length === 0 && <p className="text-sm text-muted-foreground">{t('noRolesConfigured')}</p>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <dt className="text-muted-foreground">{t('prefix')}</dt>
            <dd className="font-mono break-all">{prefix || '—'}</dd>
            <dt className="text-muted-foreground">{t('domains')}</dt>
            <dd className="flex flex-wrap gap-1">
              {domains?.length ? (
                domains.map((d) => (
                  <Badge key={d} variant="outline" className="font-mono font-normal">
                    {d}
                  </Badge>
                ))
              ) : (
                <span className="font-mono">[]</span>
              )}
            </dd>
          </dl>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={loading}>
            {loading ? <Spinner /> : <ShieldIcon />}
            {t('changeRole')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** `/console/users` — registered users, roles, password reset and bound addresses. */
export default function UsersPage() {
  const t = useT(messages)
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null)
  const [addressesTarget, setAddressesTarget] = useState<AdminUserRef | null>(null)

  const roles = useQuery({
    queryKey: ['admin', 'user_roles'],
    queryFn: () => api.get<UserRole[]>('/admin/user_roles'),
    staleTime: 5 * 60_000,
  })
  // Non-blocking: the role dialog still allows clearing the role
  useEffect(() => {
    if (roles.error) toast.error(errorMessage(roles.error))
  }, [roles.error])

  const paged = usePagedQuery<UserRow>({
    queryKey: ['admin', 'users', 'list', { query }],
    fetchPage: (limit, offset) =>
      api.get<ListResponse<UserRow>>(`/admin/users?limit=${limit}&offset=${offset}${query ? `&query=${encodeURIComponent(query)}` : ''}`),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'list'] })

  const deleteUser = async (row: UserRow) => {
    if (!(await confirm({ title: t('deleteUserTip'), description: t('deleteUserDesc', { email: row.user_email }), destructive: true })))
      return
    try {
      await api.delete(`/admin/users/${row.id}`)
      toast.success(t('success'))
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <UserPlusIcon />
            {t('createUser')}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchForm className="flex-1 sm:max-w-96" value={query} onSearch={setQuery} placeholder={t('queryTip')} />
        <Button variant="outline" size="icon" onClick={() => void paged.refetch()} aria-label={t('refresh')}>
          <RefreshCwIcon className={cn(paged.isFetching && 'animate-spin')} />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16">{t('id')}</TableHead>
              <TableHead>{t('user_email')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>{t('address_count')}</TableHead>
              <TableHead>{t('createdAt')}</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">{t('actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : paged.items.length === 0 ? (
              <TableEmptyRow
                columns={COLUMNS}
                icon={<UsersIcon />}
                title={query ? t('emptyQuery', { query }) : t('emptyTitle')}
                description={query ? undefined : t('emptyDesc')}
              />
            ) : (
              paged.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{row.id}</TableCell>
                  <TableCell className="max-w-72 truncate font-medium" title={row.user_email}>
                    {row.user_email}
                  </TableCell>
                  <TableCell>
                    {row.role_text ? (
                      <Badge className="bg-primary/10 text-primary">{row.role_text}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CountBadge
                      count={row.address_count}
                      label={t('userAddressManagement')}
                      onClick={() => setAddressesTarget(row)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={t('actions')}>
                          <EllipsisIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                          {row.user_email}
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setAddressesTarget(row)}>
                          <MailIcon />
                          {t('userAddressManagement')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoleTarget(row)}>
                          <ShieldIcon />
                          {t('changeRole')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetTarget(row)}>
                          <KeyRoundIcon />
                          {t('resetPassword')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => void deleteUser(row)}>
                          <Trash2Icon />
                          {t('deleteUser')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPageChange={paged.setPage}
        onPageSizeChange={paged.setPageSize}
        pageSizes={[20, 50, 100]}
      />

      <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => void refresh()} />
      <PasswordDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title={t('resetPassword')}
        description={resetTarget?.user_email}
        label={t('password')}
        submitText={t('resetPassword')}
        emptyText={t('pleaseInput')}
        onSubmit={async (password) => {
          if (!resetTarget) return
          await api.post(`/admin/users/${resetTarget.id}/reset_password`, { password: await hashPassword(password) })
        }}
      />
      <ChangeRoleDialog
        user={roleTarget}
        roles={roles.data || []}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        onSaved={() => void refresh()}
      />
      <UserAddressesDialog
        user={addressesTarget}
        onOpenChange={(open) => !open && setAddressesTarget(null)}
        onChanged={() => void refresh()}
      />
    </Page>
  )
}
